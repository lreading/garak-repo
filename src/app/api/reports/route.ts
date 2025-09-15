import { NextResponse } from 'next/server';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

// Helper function to extract metadata from JSONL file efficiently
function getReportMetadata(filePath: string): { startTime: string | null; modelName: string | null } {
  try {
    // Read only the first 8KB of the file (should contain first few lines)
    const buffer = Buffer.alloc(8192);
    const fd = require('fs').openSync(filePath, 'r');
    const bytesRead = require('fs').readSync(fd, buffer, 0, 8192, 0);
    require('fs').closeSync(fd);
    
    const content = buffer.toString('utf8', 0, bytesRead);
    const lines = content.split('\n').slice(0, 3); // Only check first 3 lines
    
    let startTime: string | null = null;
    let modelName: string | null = null;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const data = JSON.parse(line);
        
        // Check for start_time in init entry or transient.starttime_iso
        if (!startTime) {
          if (data.start_time) {
            startTime = data.start_time;
          } else if (data['transient.starttime_iso']) {
            startTime = data['transient.starttime_iso'];
          }
        }
        
        // Check for model name
        if (!modelName && data['plugins.model_name']) {
          modelName = data['plugins.model_name'];
        }
        
        // If we have both, we can return early
        if (startTime && modelName) {
          break;
        }
      } catch (error) {
        // Continue to next line if JSON parsing fails
        continue;
      }
    }
    
    return { startTime, modelName };
  } catch (error) {
    return { startTime: null, modelName: null };
  }
}

export async function GET() {
  try {
    const reportDir = process.env.REPORT_DIR || './data';
    const dataDir = reportDir.startsWith('/') 
      ? reportDir
      : join(process.cwd(), reportDir);
    
    // Read all files in the data directory
    const files = readdirSync(dataDir);
    
    // Filter for JSONL files and get their metadata
    const reports = files
      .filter(file => file.endsWith('.report.jsonl'))
      .map((file) => {
        const filePath = join(dataDir, file);
        const stats = statSync(filePath);
        
        // Extract run ID from filename (format: garak.{uuid}.report.jsonl)
        const runIdMatch = file.match(/garak\.([^.]+)\.report\.jsonl/);
        const runId = runIdMatch ? runIdMatch[1] : file;
        
        // Get metadata from the report file
        const { startTime, modelName } = getReportMetadata(filePath);
        
        return {
          filename: file,
          runId: runId,
          size: stats.size,
          startTime: startTime,
          modelName: modelName
        };
      });
    
    // Sort by start time (most recent first), fallback to filename if no start time
    reports.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return b.filename.localeCompare(a.filename);
    });
    
    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error reading reports directory:', error);
    return NextResponse.json(
      { error: 'Failed to read reports directory' },
      { status: 500 }
    );
  }
}
