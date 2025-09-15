import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { 
  validateReportDirectory, 
  sanitizeError 
} from '@/lib/security';

// Helper function to extract metadata from JSONL file efficiently
function getReportMetadata(filePath: string): { startTime: string | null; modelName: string | null } {
  try {
    // Read only the first 8KB of the file (should contain first few lines)
    const buffer = Buffer.alloc(8192);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);
    
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
      } catch {
        // Continue to next line if JSON parsing fails
        continue;
      }
    }
    
    return { startTime, modelName };
  } catch {
    return { startTime: null, modelName: null };
  }
}

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
    
    // Read all files in the data directory
    const files = readdirSync(dataDir);
    
    // Filter for JSONL files and get their metadata
    const reports = files
      .filter(file => {
        // Additional security: ensure filename is safe
        if (typeof file !== 'string') return false;
        if (file.length > 255) return false;
        
        // Check for directory traversal patterns
        // Block: ../, ..\, /, \, and filenames starting with ..
        if (file.includes('../') || file.includes('..\\') || file.includes('/') || file.includes('\\') || file.startsWith('..')) {
          return false;
        }
        
        return file.endsWith('.jsonl');
      })
      .map((file) => {
        const filePath = join(dataDir, file);
        
        try {
          const stats = statSync(filePath);
          
          // Additional security: ensure it's a file and not too large
          // Increased limit to 500MB to accommodate larger report files
          if (!stats.isFile() || stats.size > 500 * 1024 * 1024) {
            return null;
          }
        
          // Extract run ID from filename (format: garak.{uuid}.jsonl)
          const runIdMatch = file.match(/garak\.([^.]+)\.jsonl/);
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
        } catch {
          // Skip files that can't be processed
          return null;
        }
      })
      .filter(report => report !== null); // Remove null entries
    
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
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}
