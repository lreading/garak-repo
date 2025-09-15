import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const filter = searchParams.get('filter') || 'all'; // 'all', 'vulnerable', 'safe'
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
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
    
    // Read the report file from the data directory
    const reportPath = join(process.cwd(), 'data', filename);
    const reportContent = readFileSync(reportPath, 'utf-8');
    
    // Parse attempts for the specific category with pagination
    const result = parseCategoryAttempts(reportContent, category, page, limit, filter);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reading report attempts:', error);
    return NextResponse.json(
      { error: 'Failed to read report attempts' },
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
    probe_params: Record<string, any>;
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
    } catch (error) {
      console.warn('Failed to parse line:', line);
    }
  }
  
  // Apply filter
  let filteredAttempts = allAttempts;
  if (filter === 'vulnerable') {
    filteredAttempts = allAttempts.filter(attempt => 
      Object.values(attempt.detector_results || {}).some((scores: any) => 
        Array.isArray(scores) && scores.some((score: number) => score > 0.5)
      )
    );
  } else if (filter === 'safe') {
    filteredAttempts = allAttempts.filter(attempt => 
      !Object.values(attempt.detector_results || {}).some((scores: any) => 
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
