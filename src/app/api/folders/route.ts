import { NextRequest, NextResponse } from 'next/server';
import { sanitizeError } from '@/lib/security';
import { ServiceFactory } from '@/app/service/factory/ServiceFactory';

// GET - Retrieve folder structure
/**
 * @swagger
 * /api/folders:
 *   get:
 *     summary: List folder structure
 *     description: Get the folder structure within the report directory for organization
 *     tags: [Reports]
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Folder structure retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 folders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Folder name
 *                       path:
 *                         type: string
 *                         description: Relative path from report directory
 *                       isDirectory:
 *                         type: boolean
 *                         description: Always true for folder items
 *       500:
 *         description: Failed to list folders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create new folder
 *     description: Create a new folder in the report directory
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
 *               folderPath:
 *                 type: string
 *                 description: Path for the new folder
 *             required:
 *               - folderPath
 *     responses:
 *       200:
 *         description: Folder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 folderPath:
 *                   type: string
 *       400:
 *         description: Invalid folder path or readonly mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to create folder
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const folderService = ServiceFactory.getFolderService();
    const folders = await folderService.getAllFolders();
    
    return NextResponse.json({ folders });
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}

// POST - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const { folderPath } = await request.json();
    
    if (!folderPath || typeof folderPath !== 'string') {
      return NextResponse.json(
        { error: 'Folder path is required' },
        { status: 400 }
      );
    }
    
    const folderService = ServiceFactory.getFolderService();
    const result = await folderService.createFolder({ folderPath });
    
    return NextResponse.json(result);
  } catch (error) {
    // Handle validation errors with 400 status
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('required') || errorMessage.includes('Invalid')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}
