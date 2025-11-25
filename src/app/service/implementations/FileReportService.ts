import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { IReportService } from '../interfaces/IReportService';
import { 
  ReportItem, 
  UploadReportRequest, 
  UploadReportResponse, 
  GetReportContentRequest, 
  GetReportContentResponse, 
  GetReportMetadataRequest, 
  GetReportMetadataResponse, 
  GetReportAttemptsRequest, 
  GetReportAttemptsResponse, 
  ToggleAttemptScoreRequest, 
  ToggleAttemptScoreResponse 
} from '../types/report.types';
import { 
  validateReportDirectory,
  validateFilename,
  buildSafeFilePath,
  buildSafeFolderPath,
  validateFile,
  validateCategory,
  validatePagination,
  validateFilter
} from '@/lib/security';
import { getAppConfig } from '@/lib/config';
import { MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS } from '@/lib/security-config';
import { validateGarakReport } from '../utils/report-validator';
import { ReportErrors } from '../errors/report-errors';
import { parseReportMetadata } from '../utils/report-metadata-parser';
import { parseCategoryAttempts } from '../utils/report-attempts-parser';
import { updateDetectorScore } from '../utils/report-score-updater';
import { getCache, getReportMetadataCacheKey } from '@/lib/cache';

/**
 * File-based implementation of IReportService
 * 
 * This implementation uses the filesystem to manage reports
 */
export class FileReportService implements IReportService {
  private readonly reportDir: string;

  constructor() {
    const config = getAppConfig();
    this.reportDir = config.reportDir;
  }

  /**
   * Helper function to extract basic metadata from JSONL file efficiently
   * Used for listing reports without parsing the entire file
   */
  private getBasicReportMetadata(filePath: string): { startTime: string | null; modelName: string | null; garakVersion: string | null } {
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
      let garakVersion: string | null = null;
      
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
          
          // Check for garak version in init entry or config version
          if (!garakVersion) {
            if (data.garak_version) {
              garakVersion = data.garak_version;
            } else if (data['_config.version']) {
              garakVersion = data['_config.version'];
            }
          }
          
          // If we have all three, we can return early
          if (startTime && modelName && garakVersion) {
            break;
          }
        } catch {
          // Continue to next line if JSON parsing fails
          continue;
        }
      }
      
      return { startTime, modelName, garakVersion };
    } catch {
      return { startTime: null, modelName: null, garakVersion: null };
    }
  }

  /**
   * Recursively scan directory for reports and folders
   */
  private scanDirectory(dirPath: string, basePath: string, relativePath: string = ''): ReportItem[] {
    try {
      const items = readdirSync(dirPath);
      const result: ReportItem[] = [];
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = statSync(itemPath);
        const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
        
        if (stats.isDirectory()) {
          // It's a directory, scan it recursively
          const children = this.scanDirectory(itemPath, basePath, itemRelativePath);
          result.push({
            filename: item,
            runId: '',
            size: 0,
            startTime: null,
            modelName: null,
            garakVersion: null,
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
            const { startTime, modelName, garakVersion } = this.getBasicReportMetadata(itemPath);
            
            result.push({
              filename: item,
              runId: runId,
              size: stats.size,
              startTime: startTime,
              modelName: modelName,
              garakVersion: garakVersion,
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

  /**
   * Sort items: folders first, then reports by start time
   */
  private sortItems(items: ReportItem[]): ReportItem[] {
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
      children: item.children ? this.sortItems(item.children) : undefined
    }));
  }

  async getAllReports(): Promise<ReportItem[]> {
    // Validate and sanitize report directory
    const dirValidation = validateReportDirectory(this.reportDir);
    if (!dirValidation.isValid) {
      throw ReportErrors.invalidReportDirectory();
    }
    
    const dataDir = dirValidation.sanitized!;
    
    // Scan directory recursively for reports and folders
    const reports = this.scanDirectory(dataDir, dataDir);
    
    // Sort items: folders first, then reports by start time
    return this.sortItems(reports);
  }


  /**
   * Use the original filename as-is (it's already validated for security)
   * If file exists, append a number to make it unique
   */
  private async getUniqueFilename(reportDir: string, originalFilename: string): Promise<string> {
    // The filename has already been validated for security in validateFilename
    // Just ensure it has the correct extension
    if (!originalFilename.toLowerCase().endsWith('.jsonl')) {
      throw ReportErrors.invalidFileExtension();
    }
    
    let filename = originalFilename;
    let counter = 1;
    
    // Check if file exists and create unique name if needed
    while (true) {
      const filePathValidation = buildSafeFilePath(reportDir, filename);
      if (!filePathValidation.isValid) {
        throw ReportErrors.invalidFilePath(filePathValidation.error);
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

  async uploadReport(request: UploadReportRequest): Promise<UploadReportResponse> {
    // Validate file size
    if (request.fileSize > MAX_FILE_SIZE) {
      throw ReportErrors.fileTooLarge(MAX_FILE_SIZE / (1024 * 1024));
    }

    // Validate file extension
    const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => 
      request.filename.toLowerCase().endsWith(ext.toLowerCase())
    );

    if (!hasValidExtension) {
      throw ReportErrors.invalidFileType(ALLOWED_FILE_EXTENSIONS);
    }

    // Validate filename
    const filenameValidation = validateFilename(request.filename);
    if (!filenameValidation.isValid) {
      throw ReportErrors.invalidFilename(filenameValidation.error);
    }

    // Validate that it's a valid Garak report
    const reportValidation = validateGarakReport(request.fileContent);
    if (!reportValidation.isValid) {
      throw ReportErrors.invalidGarakReport(reportValidation.error);
    }

    if (!reportValidation.metadata) {
      throw ReportErrors.invalidGarakReport('Failed to extract report metadata');
    }

    // Get report directory and ensure it exists
    const dirValidation = validateReportDirectory(this.reportDir);
    if (!dirValidation.isValid) {
      throw ReportErrors.invalidReportDirectory();
    }

    const reportDir = dirValidation.sanitized!;
    const targetDir = request.folderPath ? `${reportDir}/${request.folderPath}` : reportDir;
    
    try {
      await mkdir(targetDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create report directory:', error);
      throw ReportErrors.failedToCreateDirectory();
    }

    // Get unique filename (handles conflicts by appending numbers)
    const filename = await this.getUniqueFilename(targetDir, request.filename);

    // Build safe file path - handle folder path and filename separately
    let filePathValidation;
    if (request.folderPath) {
      // Validate folder path separately
      const folderPathValidation = buildSafeFolderPath(reportDir, request.folderPath);
      if (!folderPathValidation.isValid) {
        throw ReportErrors.invalidFolderPath(folderPathValidation.error);
      }
      
      // Validate filename separately
      const filenameValidation = validateFilename(filename);
      if (!filenameValidation.isValid) {
        throw ReportErrors.invalidFilename(filenameValidation.error);
      }
      
      // Build the full path safely
      const fullFilePath = join(folderPathValidation.folderPath!, filenameValidation.sanitized!);
      filePathValidation = { isValid: true, filePath: fullFilePath };
    } else {
      // No folder path, use the original validation
      filePathValidation = buildSafeFilePath(reportDir, filename);
    }
    
    if (!filePathValidation.isValid || !filePathValidation.filePath) {
      throw ReportErrors.invalidFilePath(filePathValidation.error);
    }

    // Write file to disk
    try {
      await writeFile(filePathValidation.filePath, request.fileContent, 'utf8');
    } catch (error) {
      console.error('Failed to write file:', error);
      throw ReportErrors.failedToSaveFile();
    }

    // Return success response with file info
    const responsePath = request.folderPath ? `${request.folderPath}/${filename}` : filename;
    return {
      success: true,
      filename: responsePath,
      size: request.fileSize,
      metadata: reportValidation.metadata
    };
  }

  async getReportContent(request: GetReportContentRequest): Promise<GetReportContentResponse> {
    // Validate filename
    const initialFilenameValidation = validateFilename(request.filename);
    if (!initialFilenameValidation.isValid) {
      throw ReportErrors.invalidFilename(initialFilenameValidation.error);
    }

    // Validate and sanitize report directory
    const dirValidation = validateReportDirectory(this.reportDir);
    if (!dirValidation.isValid) {
      throw ReportErrors.invalidReportDirectory();
    }

    const reportDir = dirValidation.sanitized!;

    // Handle file paths with folders - validate folder path and filename separately
    let filePath: string;
    if (request.filename.includes('/')) {
      // File is in a subfolder
      const pathParts = request.filename.split('/');
      const folderPath = pathParts.slice(0, -1).join('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Validate folder path
      const folderPathValidation = buildSafeFolderPath(reportDir, folderPath);
      if (!folderPathValidation.isValid) {
        throw ReportErrors.invalidFolderPath(folderPathValidation.error);
      }
      
      // Validate filename
      const fileNameValidation = validateFilename(fileName);
      if (!fileNameValidation.isValid) {
        throw ReportErrors.invalidFilename(fileNameValidation.error);
      }
      
      // Build the full path safely
      filePath = join(folderPathValidation.folderPath!, fileNameValidation.sanitized!);
    } else {
      // File is in root directory
      const pathValidation = buildSafeFilePath(reportDir, request.filename);
      if (!pathValidation.isValid || !pathValidation.filePath) {
        throw ReportErrors.invalidFilePath(pathValidation.error);
      }
      filePath = pathValidation.filePath;
    }

    // Validate file before reading
    const fileValidation = validateFile(filePath);
    if (!fileValidation.isValid) {
      throw ReportErrors.fileNotFound(fileValidation.error);
    }

    // Read the report file
    try {
      const content = readFileSync(filePath, 'utf-8');
      const stats = statSync(filePath);

      return {
        content,
        filename: request.filename,
        size: stats.size
      };
    } catch (error) {
      console.error('Failed to read file:', error);
      throw ReportErrors.failedToReadFile();
    }
  }

  async getReportMetadata(request: GetReportMetadataRequest): Promise<GetReportMetadataResponse> {
    // Check cache first
    const cache = getCache();
    const cacheKey = getReportMetadataCacheKey(request.filename);
    const cachedMetadata = cache.get<GetReportMetadataResponse>(cacheKey);
    
    if (cachedMetadata) {
      return cachedMetadata;
    }
    
    // Reuse getReportContent to get the file content
    const contentResult = await this.getReportContent({ filename: request.filename });
    
    // Parse metadata from the content
    const metadata = parseReportMetadata(contentResult.content);
    
    // Store in cache (no TTL - cache until invalidated)
    cache.set(cacheKey, metadata);
    
    return metadata;
  }

  async getReportAttempts(request: GetReportAttemptsRequest): Promise<GetReportAttemptsResponse> {
    // Validate filename
    const filenameValidation = validateFilename(request.filename);
    if (!filenameValidation.isValid) {
      throw ReportErrors.invalidFilename(filenameValidation.error);
    }

    // Validate category (optional - if provided, must be valid)
    let category: string | undefined = undefined;
    if (request.category) {
      const categoryValidation = validateCategory(request.category);
      if (!categoryValidation.isValid) {
        throw ReportErrors.invalidFilePath(categoryValidation.error);
      }
      category = categoryValidation.category;
    }

    // Validate pagination (with defaults)
    const paginationValidation = validatePagination(
      request.page?.toString() || null,
      request.limit?.toString() || null
    );
    if (!paginationValidation.isValid) {
      throw ReportErrors.invalidFilePath(paginationValidation.error);
    }

    // Validate filter (with default)
    const filterValidation = validateFilter(request.filter || null);
    if (!filterValidation.isValid) {
      throw ReportErrors.invalidFilePath(filterValidation.error);
    }

    // Reuse getReportContent to get the file content
    const contentResult = await this.getReportContent({ filename: request.filename });
    
    // Parse attempts with filtering and pagination
    const result = parseCategoryAttempts(
      contentResult.content,
      category,
      paginationValidation.page!,
      paginationValidation.limit!,
      filterValidation.filter as 'all' | 'vulnerable' | 'safe'
    );
    
    return {
      attempts: result.attempts,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    };
  }

  async toggleAttemptScore(request: ToggleAttemptScoreRequest): Promise<ToggleAttemptScoreResponse> {
    // Validate filename
    const filenameValidation = validateFilename(request.filename);
    if (!filenameValidation.isValid) {
      throw ReportErrors.invalidFilename(filenameValidation.error);
    }

    // Validate newScore is 0 or 1
    if (request.newScore !== 0 && request.newScore !== 1) {
      throw ReportErrors.invalidFilePath('newScore must be 0 or 1');
    }

    // Validate responseIndex is a non-negative integer
    if (!Number.isInteger(request.responseIndex) || request.responseIndex < 0) {
      throw ReportErrors.invalidFilePath('responseIndex must be a non-negative integer');
    }

    // Validate attemptUuid
    if (!request.attemptUuid || typeof request.attemptUuid !== 'string') {
      throw ReportErrors.invalidFilePath('attemptUuid is required');
    }

    // Validate detectorName
    if (!request.detectorName || typeof request.detectorName !== 'string') {
      throw ReportErrors.invalidFilePath('detectorName is required');
    }

    // Reuse getReportContent to get the file content
    const contentResult = await this.getReportContent({ filename: request.filename });
    
    // Update the detector score
    const updateResult = updateDetectorScore(
      contentResult.content,
      request.attemptUuid,
      request.responseIndex,
      request.detectorName,
      request.newScore
    );

    if (!updateResult.found) {
      throw ReportErrors.fileNotFound(`Attempt with UUID ${request.attemptUuid} not found`);
    }

    // Validate and sanitize report directory to get the file path
    const dirValidation = validateReportDirectory(this.reportDir);
    if (!dirValidation.isValid) {
      throw ReportErrors.invalidReportDirectory();
    }

    const reportDir = dirValidation.sanitized!;

    // Handle file paths with folders - validate folder path and filename separately
    let filePath: string;
    if (request.filename.includes('/')) {
      // File is in a subfolder
      const pathParts = request.filename.split('/');
      const folderPath = pathParts.slice(0, -1).join('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Validate folder path
      const folderPathValidation = buildSafeFolderPath(reportDir, folderPath);
      if (!folderPathValidation.isValid) {
        throw ReportErrors.invalidFolderPath(folderPathValidation.error);
      }
      
      // Validate filename
      const fileNameValidation = validateFilename(fileName);
      if (!fileNameValidation.isValid) {
        throw ReportErrors.invalidFilename(fileNameValidation.error);
      }
      
      // Build the full path safely
      filePath = join(folderPathValidation.folderPath!, fileNameValidation.sanitized!);
    } else {
      // File is in root directory
      const pathValidation = buildSafeFilePath(reportDir, request.filename);
      if (!pathValidation.isValid || !pathValidation.filePath) {
        throw ReportErrors.invalidFilePath(pathValidation.error);
      }
      filePath = pathValidation.filePath;
    }

    // Write the updated content back to the file
    try {
      writeFileSync(filePath, updateResult.updatedContent, 'utf-8');
    } catch (error) {
      console.error('Failed to write file:', error);
      throw ReportErrors.failedToSaveFile();
    }

    // Invalidate cache for this report since metadata has changed
    const cache = getCache();
    const cacheKey = getReportMetadataCacheKey(request.filename);
    cache.delete(cacheKey);

    return {
      success: true,
      message: `Updated detector ${request.detectorName} score for response ${request.responseIndex} to ${request.newScore}`
    };
  }
}

