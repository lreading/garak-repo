import { NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/security';
import { ServiceFactory } from '@/app/service/factory/ServiceFactory';
import { ReportServiceError } from '@/app/service/errors/report-errors';

// Force dynamic rendering to ensure runtime environment variables are read
export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: List all available reports
 *     description: Get a hierarchical list of all Garak reports and folders in the report directory
 *     tags: [Reports]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports and folders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Report'
 *                       - type: object
 *                         properties:
 *                           runId:
 *                             type: string
 *                             description: Extracted run ID from filename
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             description: Report start time from metadata
 *                           modelName:
 *                             type: string
 *                             nullable: true
 *                             description: Model name from report metadata
 *                           garakVersion:
 *                             type: string
 *                             nullable: true
 *                             description: Garak version from report metadata
 *                           folderPath:
 *                             type: string
 *                             description: Relative folder path if in subdirectory
 *                           isDirectory:
 *                             type: boolean
 *                             description: Whether this item is a directory
 *                           children:
 *                             type: array
 *                             description: Child items if this is a directory
 *       500:
 *         description: Failed to list reports
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const reportService = ServiceFactory.getReportService();
    const reports = await reportService.getAllReports();
    
    return NextResponse.json({ reports });
  } catch (error) {
    // Enhanced error logging
    console.error('[GET /api/reports] Error:', error);
    if (error instanceof Error) {
      console.error('[GET /api/reports] Error message:', error.message);
      console.error('[GET /api/reports] Error stack:', error.stack);
    }
    
    // Handle typed service errors
    if (error instanceof ReportServiceError) {
      return NextResponse.json(
        { 
          error: error.message,
          details: process.env.NODE_ENV === 'development' ? error.details : undefined
        },
        { status: error.statusCode }
      );
    }
    
    // Provide more helpful error messages for common filesystem issues
    const sanitizedError = sanitizeError(error);
    let errorMessage = sanitizedError;
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        errorMessage = 'Report directory not found. Please check your volume mount configuration.';
      } else if (error.message.includes('EACCES')) {
        errorMessage = 'Permission denied accessing report directory. Please check file permissions.';
      } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
        errorMessage = 'Too many open files. Please check system limits.';
      } else if (error.message.includes('Database not configured')) {
        errorMessage = 'Database is not configured. Please set database environment variables or use file-based storage.';
      } else if (error.message.includes('Failed to initialize database')) {
        errorMessage = 'Failed to initialize database connection. Please check your database configuration and ensure the database is running.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? sanitizedError : undefined
      },
      { status: 500 }
    );
  }
}
