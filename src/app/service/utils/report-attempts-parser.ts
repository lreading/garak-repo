import { GarakAttempt } from '@/lib/garak-parser';

/**
 * Shared report attempts parsing utilities
 * 
 * These functions parse report content to extract and filter attempts
 * with pagination support.
 */

/**
 * Extract category name from probe classname
 */
function getCategoryName(probeClassname: string): string {
  const parts = probeClassname.split('.');
  return parts[0] || 'unknown';
}

/**
 * Check if an attempt is vulnerable (has any detector score > 0.5)
 */
function isVulnerableAttempt(attempt: GarakAttempt): boolean {
  return Object.values(attempt.detector_results || {}).some((scores: number[]) => 
    Array.isArray(scores) && scores.some((score: number) => score > 0.5)
  );
}

export interface ParseAttemptsResult {
  attempts: GarakAttempt[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Parse attempts from JSONL content with filtering and pagination
 * 
 * This function:
 * - Filters by category (if provided)
 * - Filters by vulnerability status (all/vulnerable/safe)
 * - Deduplicates by UUID (keeping status 2 entries)
 * - Applies pagination
 */
export function parseCategoryAttempts(
  jsonlContent: string, 
  category: string | undefined, 
  page: number, 
  limit: number, 
  filter: 'all' | 'vulnerable' | 'safe'
): ParseAttemptsResult {
  const lines = jsonlContent.trim().split('\n');
  
  // First pass: collect all attempts for the category, deduplicating by UUID
  const attemptsByUuid = new Map<string, GarakAttempt>();
  
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      
      if (entry.entry_type === 'attempt' && entry.status === 2) {
        const attemptCategory = getCategoryName(entry.probe_classname);
        
        // Filter by category if provided
        if (category && attemptCategory !== category) {
          continue;
        }
        
        // Only include status 2 (evaluated) attempts
        attemptsByUuid.set(entry.uuid, entry as GarakAttempt);
      }
    } catch {
      console.warn('Failed to parse line:', line);
    }
  }
  
  // Convert map values to array
  const allAttempts = Array.from(attemptsByUuid.values());
  
  // Apply vulnerability filter
  let filteredAttempts = allAttempts;
  if (filter === 'vulnerable') {
    filteredAttempts = allAttempts.filter(attempt => isVulnerableAttempt(attempt));
  } else if (filter === 'safe') {
    filteredAttempts = allAttempts.filter(attempt => !isVulnerableAttempt(attempt));
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

