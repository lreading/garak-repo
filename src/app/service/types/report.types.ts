/**
 * Report-related types
 */

// Import GarakAttempt from garak-parser
import type { GarakAttempt } from '@/lib/garak-parser';

export interface ReportItem {
  filename: string;
  runId: string;
  size: number;
  startTime: string | null;
  modelName: string | null;
  garakVersion: string | null;
  folderPath?: string;
  isDirectory?: boolean;
  children?: ReportItem[];
}

export interface ListReportsResponse {
  reports: ReportItem[];
}

export interface UploadReportRequest {
  fileContent: string;
  filename: string;
  fileSize: number;
  folderPath?: string;
}

export interface UploadReportMetadata {
  runId: string;
  startTime: string;
  garakVersion: string;
}

export interface UploadReportResponse {
  success: boolean;
  filename: string;
  size: number;
  metadata: UploadReportMetadata;
}

export interface GetReportContentRequest {
  filename: string;
}

export interface GetReportContentResponse {
  content: string;
  filename: string;
  size: number;
}

export interface GetReportMetadataRequest {
  filename: string;
}

export interface CategoryMetadata {
  name: string;
  displayName: string;
  totalAttempts: number;
  vulnerableAttempts: number;
  safeAttempts: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  successRate: number;
  defconGrade: number;
  zScore: number;
  vulnerabilityRate: number;
  groupLink?: string;
}

export interface GetReportMetadataResponse {
  runId: string;
  startTime: string;
  garakVersion: string;
  totalAttempts: number;
  categories: CategoryMetadata[];
}

export interface GetReportAttemptsRequest {
  filename: string;
  category?: string;
  page?: number;
  limit?: number;
  filter?: 'all' | 'vulnerable' | 'safe';
}

export interface GetReportAttemptsResponse {
  attempts: GarakAttempt[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ToggleAttemptScoreRequest {
  filename: string;
  attemptUuid: string;
  responseIndex: number;
  detectorName: string;
  newScore: number;
}

export interface ToggleAttemptScoreResponse {
  success: boolean;
  message: string;
}

// Re-export for convenience
export type { GarakAttempt };

