import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { 
  validateFilename, 
  validateReportDirectory, 
  buildSafeFilePath, 
  validateFile, 
  validatePagination,
  validateFilter,
  validateCategory,
  sanitizeError 
} from '@/lib/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const category = searchParams.get('category');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const filter = searchParams.get('filter');
    
    // Validate filename
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }
    
    const filenameValidation = validateFilename(filename);
    if (!filenameValidation.isValid) {
      return NextResponse.json(
        { error: filenameValidation.error },
        { status: 400 }
      );
    }
    
    // Validate category
    const categoryValidation = validateCategory(category);
    if (!categoryValidation.isValid) {
      return NextResponse.json(
        { error: categoryValidation.error },
        { status: 400 }
      );
    }
    
    // Validate pagination
    const paginationValidation = validatePagination(page, limit);
    if (!paginationValidation.isValid) {
      return NextResponse.json(
        { error: paginationValidation.error },
        { status: 400 }
      );
    }
    
    // Validate filter
    const filterValidation = validateFilter(filter);
    if (!filterValidation.isValid) {
      return NextResponse.json(
        { error: filterValidation.error },
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
    
    // Build safe file path
    const pathValidation = buildSafeFilePath(reportDir, filename);
    if (!pathValidation.isValid) {
      return NextResponse.json(
        { error: pathValidation.error },
        { status: 400 }
      );
    }
    
    // Validate file before reading
    const fileValidation = validateFile(pathValidation.filePath!);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 404 }
      );
    }
    
    // Read the report file
    const reportContent = readFileSync(pathValidation.filePath!, 'utf-8');
    
    // Parse attempts for the specific category with pagination
    const result = parseCategoryAttempts(
      reportContent, 
      categoryValidation.category!, 
      paginationValidation.page!, 
      paginationValidation.limit!, 
      filterValidation.filter!
    );
    
    return NextResponse.json(result);
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}

interface AttemptResult {
  attempts: Array<{
    uuid: string;
    seq: number;
    status: number;
    probe_classname: string;
    probe_params: Record<string, unknown>;
    prompt: {
      turns: Array<{
        role: string;
        content: {
          text: string;
          lang: string;
        };
      }>;
    };
    outputs: Array<{
      text: string;
      lang: string;
    }>;
    detector_results: Record<string, number[]>;
    goal: string;
    conversations: Array<{
      turns: Array<{
        role: string;
        content: {
          text: string;
          lang: string;
        };
      }>;
    }>;
  }>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function parseCategoryAttempts(
  jsonlContent: string, 
  category: string, 
  page: number, 
  limit: number, 
  filter: string
): AttemptResult {
  const lines = jsonlContent.trim().split('\n');
  const allAttempts = [];
  
  // First pass: collect all attempts for the category
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      
      if (entry.entry_type === 'attempt') {
        const attemptCategory = getCategoryName(entry.probe_classname);
        if (attemptCategory === category) {
          allAttempts.push(entry);
        }
      }
    } catch {
      console.warn('Failed to parse line:', line);
    }
  }
  
  // Apply filter
  let filteredAttempts = allAttempts;
  if (filter === 'vulnerable') {
    filteredAttempts = allAttempts.filter(attempt => 
      Object.values(attempt.detector_results || {}).some((scores: unknown) => 
        Array.isArray(scores) && scores.some((score: number) => score > 0.5)
      )
    );
  } else if (filter === 'safe') {
    filteredAttempts = allAttempts.filter(attempt => 
      !Object.values(attempt.detector_results || {}).some((scores: unknown) => 
        Array.isArray(scores) && scores.some((score: number) => score > 0.5)
      )
    );
  }
  
  // Calculate pagination
  const totalCount = filteredAttempts.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  // Get paginated results
  const paginatedAttempts = filteredAttempts.slice(startIndex, endIndex);
  
  return {
    attempts: paginatedAttempts,
    totalCount,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

function getCategoryName(probeClassname: string): string {
  const parts = probeClassname.split('.');
  return parts[0] || 'unknown';
}
