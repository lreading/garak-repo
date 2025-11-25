import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/security';
import { ServiceFactory } from '@/app/service/factory/ServiceFactory';
import { ReportServiceError } from '@/app/service/errors/report-errors';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/garak-report-metadata:
 *   get:
 *     summary: Get report metadata and statistics
 *     description: Retrieve metadata, statistics, and category breakdown for a specific Garak report
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
 *     responses:
 *       200:
 *         description: Report metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 runId:
 *                   type: string
 *                   description: Unique identifier for the test run
 *                 startTime:
 *                   type: string
 *                   description: ISO timestamp when the test run started
 *                 garakVersion:
 *                   type: string
 *                   description: Version of Garak used for this test run
 *                 totalAttempts:
 *                   type: integer
 *                   description: Total number of evaluated attempts across all categories
 *                 categories:
 *                   type: array
 *                   description: Array of test categories with statistics
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Category name (e.g., "latentinjection")
 *                       displayName:
 *                         type: string
 *                         description: Human-readable category name (e.g., "Latent Injection")
 *                       totalAttempts:
 *                         type: integer
 *                         description: Total number of attempts in this category
 *                       vulnerableAttempts:
 *                         type: integer
 *                         description: Number of attempts with at least one detector score > 0.5
 *                       safeAttempts:
 *                         type: integer
 *                         description: Number of attempts with all detector scores <= 0.5
 *                       averageScore:
 *                         type: number
 *                         format: float
 *                         description: Average detector score across all attempts in this category
 *                       maxScore:
 *                         type: number
 *                         format: float
 *                         description: Maximum detector score found in this category
 *                       minScore:
 *                         type: number
 *                         format: float
 *                         description: Minimum detector score found in this category
 *                       successRate:
 *                         type: number
 *                         format: float
 *                         description: Percentage of attempts with status 1 or 2 (successful)
 *                       defconGrade:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                         description: DEFCON grade (1=most vulnerable, 5=least vulnerable)
 *                       zScore:
 *                         type: number
 *                         format: float
 *                         description: Z-score of vulnerability rate compared to all categories
 *                       vulnerabilityRate:
 *                         type: number
 *                         format: float
 *                         description: Percentage of attempts that are vulnerable (vulnerableAttempts / totalAttempts * 100)
 *                       groupLink:
 *                         type: string
 *                         format: uri
 *                         description: Optional link to category documentation
 *                         nullable: true
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
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }
    
    // Call the service to get the report metadata (caching handled in service)
    const reportService = ServiceFactory.getReportService();
    const metadata = await reportService.getReportMetadata({ filename });
    
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error in garak-report-metadata API:', error);
    
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

