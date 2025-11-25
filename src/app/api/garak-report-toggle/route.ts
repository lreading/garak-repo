import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/security';
import { isReportReadonly } from '@/lib/config';
import { ServiceFactory } from '@/app/service/factory/ServiceFactory';
import { ReportServiceError } from '@/app/service/errors/report-errors';

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
        { status: 403 }
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
    
    // Call the service to toggle the attempt score
    const reportService = ServiceFactory.getReportService();
    const result = await reportService.toggleAttemptScore({
      filename,
      attemptUuid,
      responseIndex,
      detectorName,
      newScore
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in garak-report-toggle API:', error);
    
    // Handle typed service errors
    if (error instanceof ReportServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    
    // Fallback for unexpected errors
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}
