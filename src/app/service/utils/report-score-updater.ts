/**
 * Shared utilities for updating detector scores in report files
 * 
 * These functions handle updating detector scores in JSONL report content.
 * This logic is shared across all service implementations.
 */

export interface UpdateScoreResult {
  updatedContent: string;
  found: boolean;
}

/**
 * Update a detector score for a specific attempt in JSONL content
 * 
 * @param jsonlContent - The JSONL content of the report
 * @param attemptUuid - UUID of the attempt to update
 * @param responseIndex - Index of the response within the attempt
 * @param detectorName - Name of the detector to update
 * @param newScore - New score value (0 or 1)
 * @returns Updated JSONL content and whether the attempt was found
 */
export function updateDetectorScore(
  jsonlContent: string,
  attemptUuid: string,
  responseIndex: number,
  detectorName: string,
  newScore: number
): UpdateScoreResult {
  // Preserve trailing newlines from the original content
  const trailingMatch = jsonlContent.match(/(\r?\n)*$/);
  const trailingNewlines = trailingMatch ? trailingMatch[0] : '';
  
  // Split by newlines, preserving empty lines
  const lines = jsonlContent.split(/\r?\n/);
  let found = false;
  let targetLineIndex = -1;
  
  // First pass: find the entry with status 2 (evaluated) for this UUID
  lines.forEach((line, index) => {
    // Skip empty lines
    if (!line.trim()) return;
    
    try {
      const entry = JSON.parse(line);
      if (entry.entry_type === 'attempt' && entry.uuid === attemptUuid && entry.status === 2) {
        // Only target status 2 (evaluated) entries since that's what we display
        targetLineIndex = index;
      }
    } catch {
      // Skip invalid lines
    }
  });
  
  if (targetLineIndex === -1) {
    return { updatedContent: jsonlContent, found: false };
  }
  
  const updatedLines = lines.map((line, index) => {
    // Preserve empty lines as-is
    if (!line.trim()) {
      return line;
    }
    
    try {
      const entry = JSON.parse(line);
      
      if (entry.entry_type === 'attempt' && entry.uuid === attemptUuid && index === targetLineIndex) {
        found = true;
        
        // Update the detector result for the specific response
        if (entry.detector_results && entry.detector_results[detectorName]) {
          const scores = entry.detector_results[detectorName];
          if (Array.isArray(scores) && responseIndex < scores.length) {
            // Create a copy of the entry and update the score
            const updatedEntry = { ...entry };
            updatedEntry.detector_results = { ...entry.detector_results };
            updatedEntry.detector_results[detectorName] = [...scores];
            updatedEntry.detector_results[detectorName][responseIndex] = newScore;
            
            return JSON.stringify(updatedEntry);
          } else {
            throw new Error(`Invalid responseIndex ${responseIndex} for detector ${detectorName}`);
          }
        } else {
          // If detector doesn't exist, create a custom detector
          const updatedEntry = { ...entry };
          updatedEntry.detector_results = entry.detector_results ? { ...entry.detector_results } : {};
          
          // Create scores array with 0s for all responses, then set the target response
          const numOutputs = entry.outputs ? entry.outputs.length : 1;
          const scores = new Array(numOutputs).fill(0);
          scores[responseIndex] = newScore;
          
          updatedEntry.detector_results[detectorName] = scores;
          
          return JSON.stringify(updatedEntry);
        }
      }
      
      return line;
    } catch (error) {
      console.warn('Failed to parse line:', line, error);
      return line;
    }
  });
  
  // Join lines and restore trailing newlines
  return {
    updatedContent: updatedLines.join('\n') + trailingNewlines,
    found
  };
}

