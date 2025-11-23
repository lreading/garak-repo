import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { 
  validateFilename, 
  validateReportDirectory, 
  buildSafeFilePath, 
  validateFile, 
  sanitizeError 
} from '@/lib/security';
import { isReportReadonly } from '@/lib/config';
import { getCache, getReportMetadataCacheKey } from '@/lib/cache';

/**
 * @swagger
 * /api/garak-report-toggle:
 *   post:
 *     summary: Toggle vulnerability score for report attempt
 *     description: Update the vulnerability score for a specific detector result in a report attempt
 *     tags: [Reports]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Name of the report file
 *               attemptUuid:
 *                 type: string
 *                 description: UUID of the attempt to modify
 *               responseIndex:
 *                 type: integer
 *                 description: Index of the response within the attempt
 *               detectorName:
 *                 type: string
 *                 description: Name of the detector to modify
 *               newScore:
 *                 type: number
 *                 description: New vulnerability score (0.0 to 1.0)
 *             required:
 *               - filename
 *               - attemptUuid
 *               - responseIndex
 *               - detectorName
 *               - newScore
 *     responses:
 *       200:
 *         description: Score updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or readonly mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Report or attempt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update score
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: Request) {
  try {
    // Check if reports are in readonly mode
    if (isReportReadonly()) {
      return NextResponse.json(
        { error: 'Report editing is disabled. Reports are in readonly mode.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { filename, attemptUuid, responseIndex, detectorName, newScore } = body;
    
    // Validate required fields
    if (!filename || !attemptUuid || responseIndex === undefined || !detectorName || newScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, attemptUuid, responseIndex, detectorName, newScore' },
        { status: 400 }
      );
    }
    
    // Validate filename
    const filenameValidation = validateFilename(filename);
    if (!filenameValidation.isValid) {
      return NextResponse.json(
        { error: filenameValidation.error },
        { status: 400 }
      );
    }
    
    // Validate newScore is 0 or 1
    if (newScore !== 0 && newScore !== 1) {
      return NextResponse.json(
        { error: 'newScore must be 0 or 1' },
        { status: 400 }
      );
    }
    
    // Validate responseIndex is a non-negative integer
    if (!Number.isInteger(responseIndex) || responseIndex < 0) {
      return NextResponse.json(
        { error: 'responseIndex must be a non-negative integer' },
        { status: 400 }
      );
    }
    
    // Validate and sanitize report directory
    const reportDir = process.env.REPORT_DIR || './data';
    const dirValidation = validateReportDirectory(reportDir);
    if (!dirValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid report directory configuration' },
        { status: 500 }
      );
    }
    
    // Build safe file path
    const pathValidation = buildSafeFilePath(reportDir, filename);
    if (!pathValidation.isValid) {
      return NextResponse.json(
        { error: pathValidation.error },
        { status: 400 }
      );
    }
    
    // Validate file before reading
    const fileValidation = validateFile(pathValidation.filePath!);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 404 }
      );
    }
    
    // Read the report file
    const reportContent = readFileSync(pathValidation.filePath!, 'utf-8');
    const lines = reportContent.trim().split('\n');
    
    // Find and update the specific attempt
    let found = false;
    let targetLineIndex = -1;
    
    // First pass: find the entry with status 2 (evaluated) for this UUID
    lines.forEach((line, index) => {
      try {
        const entry = JSON.parse(line);
        if (entry.entry_type === 'attempt' && entry.uuid === attemptUuid && entry.status === 2) {
          // Only target status 2 (evaluated) entries since that's what we display
          targetLineIndex = index;
        }
      } catch {
        // Skip invalid lines
      }
    });
    
    if (targetLineIndex === -1) {
      return NextResponse.json(
        { error: `Attempt with UUID ${attemptUuid} not found` },
        { status: 404 }
      );
    }
    
    const updatedLines = lines.map((line, index) => {
      try {
        const entry = JSON.parse(line);
        
        if (entry.entry_type === 'attempt' && entry.uuid === attemptUuid && index === targetLineIndex) {
          found = true;
          
          // Update the detector result for the specific response
          if (entry.detector_results && entry.detector_results[detectorName]) {
            const scores = entry.detector_results[detectorName];
            if (Array.isArray(scores) && responseIndex < scores.length) {
              // Create a copy of the entry and update the score
              const updatedEntry = { ...entry };
              updatedEntry.detector_results = { ...entry.detector_results };
              updatedEntry.detector_results[detectorName] = [...scores];
              updatedEntry.detector_results[detectorName][responseIndex] = newScore;
              
              return JSON.stringify(updatedEntry);
            } else {
              throw new Error(`Invalid responseIndex ${responseIndex} for detector ${detectorName}`);
            }
          } else {
            // If detector doesn't exist, create a custom detector
            const updatedEntry = { ...entry };
            updatedEntry.detector_results = { ...entry.detector_results };
            
            // Create scores array with 0s for all responses, then set the target response
            const numOutputs = entry.outputs ? entry.outputs.length : 1;
            const scores = new Array(numOutputs).fill(0);
            scores[responseIndex] = newScore;
            
            updatedEntry.detector_results[detectorName] = scores;
            
            return JSON.stringify(updatedEntry);
          }
        }
        
        return line;
      } catch (error) {
        console.warn('Failed to parse line:', line, error);
        return line;
      }
    });
    
    if (!found) {
      return NextResponse.json(
        { error: `Failed to update attempt with UUID ${attemptUuid}` },
        { status: 500 }
      );
    }
    
    // Write the updated content back to the file
    const updatedContent = updatedLines.join('\n');
    writeFileSync(pathValidation.filePath!, updatedContent, 'utf-8');
    
    // Invalidate cache for this report since metadata has changed
    const cache = getCache();
    const cacheKey = getReportMetadataCacheKey(filename);
    cache.delete(cacheKey);
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated detector ${detectorName} score for response ${responseIndex} to ${newScore}` 
    });
    
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}
