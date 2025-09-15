import { NextResponse } from 'next/server';
import { existsSync, readdirSync } from 'fs';

export async function GET() {
  try {
    const reportDir = process.env.REPORT_DIR || './data';
    
    // Check if report directory exists
    const dirExists = existsSync(reportDir);
    if (!dirExists) {
      return NextResponse.json({
        status: 'error',
        message: 'Report directory does not exist',
        reportDir,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Check if report directory is readable
    let isReadable = false;
    let fileCount = 0;
    let jsonlCount = 0;
    let error: string | null = null;
    
    try {
      const files = readdirSync(reportDir);
      fileCount = files.length;
      jsonlCount = files.filter(f => f.endsWith('.jsonl')).length;
      isReadable = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }
    
    return NextResponse.json({
      status: isReadable ? 'healthy' : 'error',
      message: isReadable ? 'Report directory is accessible' : 'Report directory is not accessible',
      reportDir,
      isReadable,
      fileCount,
      jsonlCount,
      error,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
