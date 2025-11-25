import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/security';
import { ServiceFactory } from '@/app/service/factory/ServiceFactory';
import { ReportServiceError } from '@/app/service/errors/report-errors';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/garak-report-attempts:
 *   get:
 *     summary: Get report attempts with filtering and pagination
 *     description: Retrieve filtered and paginated attempt entries from a specific Garak report
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
 *         description: Name of the report file
 *         example: garak.abc123.jsonl
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by probe category
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Number of attempts per page
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, passed, failed]
 *           default: all
 *         description: Filter by attempt result
 *     responses:
 *       200:
 *         description: Report attempts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempts:
 *                   type: array
 *                   description: Array of attempt entries
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
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
 *         description: Failed to process report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const category = searchParams.get('category');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const filter = searchParams.get('filter');
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }
    
    // Call the service to get the report attempts
    const reportService = ServiceFactory.getReportService();
    const result = await reportService.getReportAttempts({
      filename,
      category: category || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      filter: (filter as 'all' | 'vulnerable' | 'safe') || undefined
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in garak-report-attempts API:', error);
    
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

