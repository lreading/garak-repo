import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const dataDir = join(process.cwd(), 'data');
    
    // Read all files in the data directory
    const files = readdirSync(dataDir);
    
    // Filter for JSONL files and get their metadata
    const reports = files
      .filter(file => file.endsWith('.report.jsonl'))
      .map(file => {
        const filePath = join(dataDir, file);
        const stats = statSync(filePath);
        
        // Extract run ID from filename (format: garak.{uuid}.report.jsonl)
        const runIdMatch = file.match(/garak\.([^.]+)\.report\.jsonl/);
        const runId = runIdMatch ? runIdMatch[1] : file;
        
        return {
          filename: file,
          runId: runId,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // Sort by most recent first
    
    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error reading reports directory:', error);
    return NextResponse.json(
      { error: 'Failed to read reports directory' },
      { status: 500 }
    );
  }
}
