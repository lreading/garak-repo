import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access } from 'fs/promises';
import { validateFilename, buildSafeFilePath, sanitizeError } from '@/lib/security';
import { GarakReportEntry } from '@/lib/garak-parser';
import { MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS } from '@/lib/security-config';

// Get the report directory from environment variable
function getReportDir(): string {
  const reportDir = process.env.REPORT_DIR || './data';
  return reportDir;
}

// Validate that the uploaded file is a valid JSONL Garak report
function validateGarakReport(content: string): { isValid: boolean; error?: string; metadata?: Record<string, unknown> } {
  try {
    const lines = content.trim().split('\n');
    
    if (lines.length === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    // Check first few lines to validate JSONL format and Garak structure
    let hasInitEntry = false;
    let hasAttemptEntry = false;
    let metadata: Record<string, unknown> = {};

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const entry: GarakReportEntry = JSON.parse(line);
        
        // Check for required entry_type field
        if (!entry.entry_type || typeof entry.entry_type !== 'string') {
          return { isValid: false, error: 'Invalid JSONL format: missing or invalid entry_type field' };
        }

        // Check for init entry (contains run metadata)
        if (entry.entry_type === 'init') {
          hasInitEntry = true;
          metadata = {
            runId: entry.run || '',
            startTime: entry.start_time || '',
            garakVersion: entry.garak_version || ''
          };
        }

        // Check for attempt entry (contains test data)
        if (entry.entry_type === 'attempt') {
          hasAttemptEntry = true;
          
          // Validate required fields for attempt entries
          if (!entry.uuid || !entry.probe_classname || !entry.detector_results) {
            return { isValid: false, error: 'Invalid attempt entry: missing required fields (uuid, probe_classname, detector_results)' };
          }
        }

        // Check for digest entry (contains summary data)
        if (entry.entry_type === 'digest') {
          // Digest entries are optional but valid
        }

      } catch (parseError) {
        return { isValid: false, error: `Invalid JSON on line ${i + 1}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` };
      }
    }

    // A valid Garak report should have at least init and attempt entries
    if (!hasInitEntry) {
      return { isValid: false, error: 'Invalid Garak report: missing init entry' };
    }

    if (!hasAttemptEntry) {
      return { isValid: false, error: 'Invalid Garak report: no attempt entries found' };
    }

    return { isValid: true, metadata };
  } catch (error) {
    return { isValid: false, error: `Failed to validate report: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Use the original filename as-is (it's already validated for security)
// If file exists, append a number to make it unique
async function getUniqueFilename(reportDir: string, originalFilename: string): Promise<string> {
  // The filename has already been validated for security in validateFilename
  // Just ensure it has the correct extension
  if (!originalFilename.toLowerCase().endsWith('.jsonl')) {
    throw new Error('Invalid file extension');
  }
  
  let filename = originalFilename;
  let counter = 1;
  
  // Check if file exists and create unique name if needed
  while (true) {
    const filePathValidation = buildSafeFilePath(reportDir, filename);
    if (!filePathValidation.isValid) {
      throw new Error(filePathValidation.error);
    }
    
    try {
      await access(filePathValidation.filePath!);
      // File exists, try with a number suffix
      const nameWithoutExt = originalFilename.replace(/\.jsonl$/i, '');
      filename = `${nameWithoutExt}-${counter}.jsonl`;
      counter++;
    } catch {
      // File doesn't exist, we can use this filename
      break;
    }
  }
  
  return filename;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (500MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file extension
    const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => 
      file.name.toLowerCase().endsWith(ext.toLowerCase())
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: `Invalid file type. Only ${ALLOWED_FILE_EXTENSIONS.join(', ')} files are allowed` },
        { status: 400 }
      );
    }

    // Validate filename
    const filenameValidation = validateFilename(file.name);
    if (!filenameValidation.isValid) {
      return NextResponse.json(
        { error: filenameValidation.error },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Validate that it's a valid Garak report
    const reportValidation = validateGarakReport(content);
    if (!reportValidation.isValid) {
      return NextResponse.json(
        { error: reportValidation.error },
        { status: 400 }
      );
    }

    // Get report directory and ensure it exists
    const reportDir = getReportDir();
    try {
      await mkdir(reportDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create report directory:', error);
      return NextResponse.json(
        { error: 'Failed to create report directory' },
        { status: 500 }
      );
    }

    // Get unique filename (handles conflicts by appending numbers)
    const filename = await getUniqueFilename(reportDir, file.name);

    // Build safe file path
    const filePathValidation = buildSafeFilePath(reportDir, filename);
    if (!filePathValidation.isValid) {
      return NextResponse.json(
        { error: filePathValidation.error },
        { status: 400 }
      );
    }

    // Write file to disk
    try {
      await writeFile(filePathValidation.filePath!, content, 'utf8');
    } catch (error) {
      console.error('Failed to write file:', error);
      return NextResponse.json(
        { error: 'Failed to save file' },
        { status: 500 }
      );
    }

    // Return success response with file info
    return NextResponse.json({
      success: true,
      filename: filename,
      size: file.size,
      metadata: reportValidation.metadata
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: sanitizeError(error) },
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
