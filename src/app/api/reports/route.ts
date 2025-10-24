import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { 
  validateReportDirectory, 
  sanitizeError 
} from '@/lib/security';

// Force dynamic rendering to ensure runtime environment variables are read
export const dynamic = 'force-dynamic';

interface ReportItem {
  filename: string;
  runId: string;
  size: number;
  startTime: string | null;
  modelName: string | null;
  folderPath?: string;
  isDirectory?: boolean;
  children?: ReportItem[];
}

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

// Recursively scan directory for reports and folders
function scanDirectory(dirPath: string, basePath: string, relativePath: string = ''): ReportItem[] {
  try {
    const items = readdirSync(dirPath);
    const result: ReportItem[] = [];
    
    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stats = statSync(itemPath);
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
      
      if (stats.isDirectory()) {
        // It's a directory, scan it recursively
        const children = scanDirectory(itemPath, basePath, itemRelativePath);
        result.push({
          filename: item,
          runId: '',
          size: 0,
          startTime: null,
          modelName: null,
          folderPath: relativePath || undefined,
          isDirectory: true,
          children: children
        });
      } else if (item.endsWith('.jsonl')) {
        // It's a report file
        try {
          // Additional security: ensure filename is safe
          if (typeof item !== 'string') continue;
          if (item.length > 255) continue;
          
          // Check for directory traversal patterns (but allow forward slashes for subdirectories)
          if (item.includes('../') || item.includes('..\\') || item.includes('\\') || item.startsWith('..')) {
            continue;
          }
          
          // Additional security: ensure it's a file and not too large
          if (!stats.isFile() || stats.size > 500 * 1024 * 1024) {
            continue;
          }
        
          // Extract run ID from filename (format: garak.{uuid}.jsonl)
          const runIdMatch = item.match(/garak\.([^.]+)\.jsonl/);
          const runId = runIdMatch ? runIdMatch[1] : item;
          
          // Get metadata from the report file
          const { startTime, modelName } = getReportMetadata(itemPath);
          
          result.push({
            filename: item,
            runId: runId,
            size: stats.size,
            startTime: startTime,
            modelName: modelName,
            folderPath: relativePath || undefined
          });
        } catch {
          // Skip files that can't be processed
          continue;
        }
      }
    }
    
    return result;
  } catch {
    return [];
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
    
    // Scan directory recursively for reports and folders
    const reports = scanDirectory(dataDir, dataDir);
    
    // Sort items: folders first, then reports by start time
    const sortItems = (items: ReportItem[]): ReportItem[] => {
      return items.sort((a, b) => {
        // Directories come first
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        
        // If both are directories, sort by name
        if (a.isDirectory && b.isDirectory) {
          return a.filename.localeCompare(b.filename);
        }
        
        // If both are reports, sort by start time (most recent first)
        if (a.startTime && b.startTime) {
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        }
        if (a.startTime) return -1;
        if (b.startTime) return 1;
        return b.filename.localeCompare(a.filename);
      }).map(item => ({
        ...item,
        children: item.children ? sortItems(item.children) : undefined
      }));
    };
    
    const sortedReports = sortItems(reports);
    
    return NextResponse.json({ reports: sortedReports });
  } catch (error) {
    console.error('Error in reports API:', error);
    const sanitizedError = sanitizeError(error);
    
    // Provide more helpful error messages for common issues
    let errorMessage = sanitizedError;
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        errorMessage = 'Report directory not found. Please check your volume mount configuration.';
      } else if (error.message.includes('EACCES')) {
        errorMessage = 'Permission denied accessing report directory. Please check file permissions.';
      } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
        errorMessage = 'Too many open files. Please check system limits.';
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
