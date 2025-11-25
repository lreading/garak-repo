import { ReportItem, UploadReportRequest, UploadReportResponse, GetReportContentRequest, GetReportContentResponse, GetReportMetadataRequest, GetReportMetadataResponse, GetReportAttemptsRequest, GetReportAttemptsResponse, ToggleAttemptScoreRequest, ToggleAttemptScoreResponse } from '../types/report.types';

/**
 * Interface for report service operations
 * 
 * This interface defines the contract for report operations,
 * allowing multiple implementations (file-based, database, etc.)
 */
export interface IReportService {
  /**
   * Get all reports in the report directory
   * Returns a hierarchical list of all reports and folders sorted appropriately
   */
  getAllReports(): Promise<ReportItem[]>;

  /**
   * Upload a new report file
   * Validates the file content, creates necessary directories, and saves the file
   */
  uploadReport(request: UploadReportRequest): Promise<UploadReportResponse>;

  /**
   * Get the raw content of a specific report file
   * The filename can include a folder path (e.g., "folder/file.jsonl")
   */
  getReportContent(request: GetReportContentRequest): Promise<GetReportContentResponse>;

  /**
   * Get parsed metadata and statistics for a specific report file
   * The filename can include a folder path (e.g., "folder/file.jsonl")
   */
  getReportMetadata(request: GetReportMetadataRequest): Promise<GetReportMetadataResponse>;

  /**
   * Get filtered and paginated attempts from a specific report file
   * The filename can include a folder path (e.g., "folder/file.jsonl")
   */
  getReportAttempts(request: GetReportAttemptsRequest): Promise<GetReportAttemptsResponse>;

  /**
   * Toggle/update a detector score for a specific attempt in a report file
   * The filename can include a folder path (e.g., "folder/file.jsonl")
   */
  toggleAttemptScore(request: ToggleAttemptScoreRequest): Promise<ToggleAttemptScoreResponse>;
}

