import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { 
  validateReportDirectory, 
  sanitizeError,
  buildSafeFolderPath 
} from '@/lib/security';


// Recursively get folder structure and flatten it for dropdown
function getAllFolders(dirPath: string, basePath: string): Array<{ name: string; path: string; isDirectory: boolean }> {
  try {
    const items = readdirSync(dirPath);
    const result: Array<{ name: string; path: string; isDirectory: boolean }> = [];
    
    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stats = statSync(itemPath);
      
      if (stats.isDirectory()) {
        const relativePath = itemPath.replace(basePath, '').replace(/^[\/\\]/, '');
        result.push({
          name: item,
          path: relativePath,
          isDirectory: true
        });
        
        // Recursively get nested folders
        const nestedFolders = getAllFolders(itemPath, basePath);
        result.push(...nestedFolders);
      }
    }
    
    return result.sort((a, b) => a.path.localeCompare(b.path));
  } catch {
    return [];
  }
}

// GET - Retrieve folder structure
export async function GET() {
  try {
    // Validate and sanitize report directory
    const reportDir = process.env.REPORT_DIR || './data';
    const dirValidation = validateReportDirectory(reportDir);
    if (!dirValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid report directory configuration' },
        { status: 500 }
      );
    }
    
    const dataDir = dirValidation.sanitized!;
    
    // Get all folders (flattened for dropdown)
    const folders = getAllFolders(dataDir, dataDir);
    
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
    
    // Validate and sanitize report directory
    const reportDir = process.env.REPORT_DIR || './data';
    const dirValidation = validateReportDirectory(reportDir);
    if (!dirValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid report directory configuration' },
        { status: 500 }
      );
    }
    
    const dataDir = dirValidation.sanitized!;
    
    // Build safe folder path
    const folderPathValidation = buildSafeFolderPath(dataDir, folderPath);
    if (!folderPathValidation.isValid) {
      return NextResponse.json(
        { error: folderPathValidation.error },
        { status: 400 }
      );
    }
    
    // Create the folder
    try {
      await mkdir(folderPathValidation.folderPath!, { recursive: true });
    } catch (error) {
      console.error('Failed to create folder:', error);
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      folderPath: folderPath 
    });
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}
