import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/security';
import { ServiceFactory } from '@/app/service/factory/ServiceFactory';
import { ReportServiceError } from '@/app/service/errors/report-errors';

export const dynamic = 'force-dynamic';

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
    
    // Call the service to get the report content
    const reportService = ServiceFactory.getReportService();
    const result = await reportService.getReportContent({ filename });
    
    return new NextResponse(result.content, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error in garak-report API:', error);
    
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
