import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/security';
import { isReportReadonly } from '@/lib/config';
import { ServiceFactory } from '@/app/service/factory/ServiceFactory';
import { ReportServiceError } from '@/app/service/errors/report-errors';

/**
 * @swagger
 * /api/upload-report:
 *   post:
 *     summary: Upload a new Garak report
 *     description: Upload a .jsonl Garak report file to the report directory
 *     tags: [Reports]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Garak report file (.jsonl format)
 *               folderPath:
 *                 type: string
 *                 description: Optional folder path to upload the file to
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 filename:
 *                   type: string
 *                   description: Final filename (may include folder path)
 *                 size:
 *                   type: number
 *                   description: File size in bytes
 *                 metadata:
 *                   type: object
 *                   description: Extracted report metadata
 *                   properties:
 *                     runId:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                     garakVersion:
 *                       type: string
 *       400:
 *         description: Invalid request or file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Upload disabled (readonly mode)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    // Check if reports are in readonly mode
    if (isReportReadonly()) {
      return NextResponse.json(
        { error: 'Report uploads are disabled. Reports are in readonly mode.' },
        { status: 403 }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('folderPath') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Call the service to handle the upload
    const reportService = ServiceFactory.getReportService();
    const result = await reportService.uploadReport({
      fileContent: content,
      filename: file.name,
      fileSize: file.size,
      folderPath: folderPath || undefined
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Upload error:', error);
    
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

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
