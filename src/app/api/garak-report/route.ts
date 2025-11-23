import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { 
  validateFilename, 
  validateReportDirectory, 
  buildSafeFilePath, 
  validateFile, 
  sanitizeError 
} from '@/lib/security';

/**
 * @swagger
 * /api/garak-report:
 *   get:
 *     summary: Get specific report content
 *     description: Retrieve the full content of a specific Garak report file
 *     tags: [Reports]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the report file to retrieve
 *         example: garak.abc123.jsonl
 *     responses:
 *       200:
 *         description: Report content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                   description: Raw JSONL content of the report
 *                 filename:
 *                   type: string
 *                   description: Filename of the report
 *                 size:
 *                   type: number
 *                   description: File size in bytes
 *       400:
 *         description: Invalid filename or request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Report file not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to read report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }
    
    // Validate filename with comprehensive security checks
    const filenameValidation = validateFilename(filename);
    if (!filenameValidation.isValid) {
      return NextResponse.json(
        { error: filenameValidation.error },
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
    
    return new NextResponse(reportContent, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}
