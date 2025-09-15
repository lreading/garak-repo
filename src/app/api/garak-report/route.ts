import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

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
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }
    
    // Read the report file from the configured reports directory
    const reportDir = process.env.REPORT_DIR || './data';
    const reportPath = reportDir.startsWith('/') 
      ? join(reportDir, filename)
      : join(process.cwd(), reportDir, filename);
    const reportContent = readFileSync(reportPath, 'utf-8');
    
    return new NextResponse(reportContent, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error reading report file:', error);
    return NextResponse.json(
      { error: 'Failed to read report file' },
      { status: 500 }
    );
  }
}
