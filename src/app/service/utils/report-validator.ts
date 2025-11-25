import { GarakReportEntry } from '@/lib/garak-parser';

/**
 * Shared report validation utilities
 * 
 * These functions are used by all service implementations (file-based, database, etc.)
 * to validate report content and structure.
 */

export interface ReportValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    runId: string;
    startTime: string;
    garakVersion: string;
  };
}

/**
 * Validate that the uploaded file is a valid JSONL Garak report
 * 
 * This validation is shared across all storage backends since it validates
 * the report content structure, not the storage mechanism.
 */
export function validateGarakReport(content: string): ReportValidationResult {
  try {
    const lines = content.trim().split('\n');
    
    if (lines.length === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    // Check first few lines to validate JSONL format and Garak structure
    let hasInitEntry = false;
    let hasAttemptEntry = false;
    let metadata: { runId: string; startTime: string; garakVersion: string } = {
      runId: '',
      startTime: '',
      garakVersion: ''
    };

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
            runId: (entry.run as string) || '',
            startTime: (entry.start_time as string) || '',
            garakVersion: (entry.garak_version as string) || ''
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

