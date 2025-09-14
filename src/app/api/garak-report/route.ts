import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Read the report file from the data directory
    const reportPath = join(process.cwd(), '..', 'data', 'garak.eb4baeec-454d-4c7f-b9de-7382955f0d44.report.jsonl');
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
