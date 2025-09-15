import { join, resolve, relative } from 'path';
import { existsSync, statSync, realpathSync } from 'fs';
import { 
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILENAME_LENGTH,
  MAX_FILE_SIZE,
  FILENAME_REGEX,
  FOLDER_PATH_REGEX,
  MAX_CATEGORY_LENGTH,
  CATEGORY_REGEX,
  MIN_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  VALID_FILTERS,
  isStrictPathValidationEnabled,
  isDetailedErrorLoggingEnabled
} from './security-config';

/**
 * Security utilities for file operations
 */

/**
 * Validates and sanitizes a filename to prevent directory traversal
 */
export function validateFilename(filename: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!filename || typeof filename !== 'string') {
    return { isValid: false, error: 'Filename is required' };
  }

  // Check length
  if (filename.length > MAX_FILENAME_LENGTH) {
    return { isValid: false, error: 'Filename too long' };
  }

  // Check for empty filename
  if (filename.trim().length === 0) {
    return { isValid: false, error: 'Filename cannot be empty' };
  }

  // Decode URL encoding
  let decodedFilename: string;
  try {
    decodedFilename = decodeURIComponent(filename);
  } catch {
    return { isValid: false, error: 'Invalid filename encoding' };
  }

  // Check for directory traversal patterns
  const dangerousPatterns = [
    '..',
    '\\',
    '\0', // null byte
    '\x00', // null byte hex
    '%2e%2e', // URL encoded ..
    '%5c', // URL encoded \
    '..%2f', // mixed encoding
    '%2e%2e%2f', // mixed encoding
  ];

  for (const pattern of dangerousPatterns) {
    if (decodedFilename.toLowerCase().includes(pattern.toLowerCase())) {
      return { isValid: false, error: 'Invalid filename: contains dangerous characters' };
    }
  }

  // Check for directory traversal with forward slashes (but allow legitimate folder separators)
  if (decodedFilename.includes('..')) {
    return { isValid: false, error: 'Invalid filename: contains directory traversal' };
  }

  // Check file extension
  const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => 
    decodedFilename.toLowerCase().endsWith(ext.toLowerCase())
  );

  if (!hasValidExtension) {
    return { isValid: false, error: 'Invalid file extension' };
  }

  // Check for dangerous characters (but allow most printable characters)
  if (!FILENAME_REGEX.test(decodedFilename)) {
    return { isValid: false, error: 'Filename contains invalid characters' };
  }

  return { isValid: true, sanitized: decodedFilename };
}

/**
 * Validates and sanitizes the report directory path
 */
export function validateReportDirectory(reportDir: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!reportDir || typeof reportDir !== 'string') {
    return { isValid: false, error: 'Report directory is required' };
  }

  // Note: Absolute paths are allowed in all environments
  // The security comes from proper path validation and boundary checking

  // Resolve the path
  let resolvedPath: string;
  try {
    if (reportDir.startsWith('/')) {
      // Absolute path
      resolvedPath = resolve(reportDir);
    } else {
      // Relative path - resolve from project root
      resolvedPath = resolve(process.cwd(), reportDir);
    }
  } catch {
    return { isValid: false, error: 'Invalid directory path' };
  }

  // Check if directory exists
  if (!existsSync(resolvedPath)) {
    return { isValid: false, error: 'Directory does not exist' };
  }

  // Check if it's actually a directory
  try {
    const stats = statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return { isValid: false, error: 'Path is not a directory' };
    }
  } catch {
    return { isValid: false, error: 'Cannot access directory' };
  }

  // Resolve symlinks to get real path
  let realPath: string;
  try {
    realPath = realpathSync(resolvedPath);
  } catch {
    return { isValid: false, error: 'Cannot resolve directory path' };
  }

  // Security check: ensure the directory is within allowed boundaries
  const projectRoot = process.cwd();
  
  // Check if the resolved path is within the project root (for relative paths)
  if (!reportDir.startsWith('/')) {
    try {
      const relativePath = relative(projectRoot, realPath);
      if (relativePath.startsWith('..')) {
        return { isValid: false, error: 'Directory is outside project boundaries' };
      }
    } catch {
      return { isValid: false, error: 'Cannot validate directory boundaries' };
    }
  }

  // Additional strict validation in production
  if (isStrictPathValidationEnabled()) {
    // In strict mode, ensure the directory is within the project root
    // However, allow absolute paths that are commonly used in containers
    const allowedAbsolutePaths = ['/data', '/app/data', '/var/log', '/tmp'];
    const isAllowedAbsolutePath = allowedAbsolutePaths.some(allowedPath => 
      realPath === allowedPath || realPath.startsWith(allowedPath + '/')
    );
    
    if (!isAllowedAbsolutePath) {
      try {
        const relativePath = relative(projectRoot, realPath);
        if (relativePath.startsWith('..') || relativePath.includes('..')) {
          return { isValid: false, error: 'Directory is outside allowed boundaries' };
        }
      } catch {
        return { isValid: false, error: 'Cannot validate directory boundaries in strict mode' };
      }
    }
  }

  return { isValid: true, sanitized: realPath };
}

/**
 * Validates a folder path to prevent directory traversal
 */
export function validateFolderPath(folderPath: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!folderPath || typeof folderPath !== 'string') {
    return { isValid: false, error: 'Folder path is required' };
  }

  // Check length
  if (folderPath.length > MAX_FILENAME_LENGTH) {
    return { isValid: false, error: 'Folder path too long' };
  }

  // Check for empty path
  if (folderPath.trim().length === 0) {
    return { isValid: false, error: 'Folder path cannot be empty' };
  }

  // Decode URL encoding
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(folderPath);
  } catch {
    return { isValid: false, error: 'Invalid folder path encoding' };
  }

  // Check for directory traversal patterns
  const dangerousPatterns = [
    '..',
    '\0', // null byte
    '\x00', // null byte hex
    '%2e%2e', // URL encoded ..
    '%5c', // URL encoded \
    '..%2f', // mixed encoding
    '%2e%2e%2f', // mixed encoding
  ];

  for (const pattern of dangerousPatterns) {
    if (decodedPath.toLowerCase().includes(pattern.toLowerCase())) {
      return { isValid: false, error: 'Invalid folder path: contains dangerous characters' };
    }
  }

  // Check for dangerous characters (but allow most printable characters and forward slashes)
  if (!FOLDER_PATH_REGEX.test(decodedPath)) {
    return { isValid: false, error: 'Folder path contains invalid characters' };
  }

  return { isValid: true, sanitized: decodedPath };
}

/**
 * Safely constructs a file path and validates it's within the allowed directory
 */
export function buildSafeFilePath(reportDir: string, filename: string): { isValid: boolean; filePath?: string; error?: string } {
  // Validate directory
  const dirValidation = validateReportDirectory(reportDir);
  if (!dirValidation.isValid) {
    return { isValid: false, error: dirValidation.error };
  }

  // Validate filename
  const filenameValidation = validateFilename(filename);
  if (!filenameValidation.isValid) {
    return { isValid: false, error: filenameValidation.error };
  }

  // Build the file path
  const filePath = join(dirValidation.sanitized!, filenameValidation.sanitized!);

  // Final security check: ensure the resolved file path is within the report directory
  try {
    const resolvedFilePath = resolve(filePath);
    const resolvedDir = resolve(dirValidation.sanitized!);
    
    // Check if the file path is within the directory
    const relativePath = relative(resolvedDir, resolvedFilePath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      return { isValid: false, error: 'File path is outside allowed directory' };
    }
    } catch {
      return { isValid: false, error: 'Cannot validate file path' };
    }

  return { isValid: true, filePath };
}

/**
 * Safely constructs a folder path and validates it's within the allowed directory
 */
export function buildSafeFolderPath(reportDir: string, folderPath: string): { isValid: boolean; folderPath?: string; error?: string } {
  // Validate directory
  const dirValidation = validateReportDirectory(reportDir);
  if (!dirValidation.isValid) {
    return { isValid: false, error: dirValidation.error };
  }

  // Validate folder path
  const folderPathValidation = validateFolderPath(folderPath);
  if (!folderPathValidation.isValid) {
    return { isValid: false, error: folderPathValidation.error };
  }

  // Build the folder path
  const fullFolderPath = join(dirValidation.sanitized!, folderPathValidation.sanitized!);

  // Final security check: ensure the resolved folder path is within the report directory
  try {
    const resolvedFolderPath = resolve(fullFolderPath);
    const resolvedDir = resolve(dirValidation.sanitized!);
    
    // Check if the folder path is within the directory
    const relativePath = relative(resolvedDir, resolvedFolderPath);
    if (relativePath.startsWith('..') || relativePath.includes('..')) {
      return { isValid: false, error: 'Folder path is outside allowed directory' };
    }
    } catch {
      return { isValid: false, error: 'Cannot validate folder path' };
    }

  return { isValid: true, folderPath: fullFolderPath };
}

/**
 * Validates file size and existence
 */
export function validateFile(filePath: string): { isValid: boolean; error?: string } {
  try {
    if (!existsSync(filePath)) {
      return { isValid: false, error: 'File does not exist' };
    }

    const stats = statSync(filePath);
    
    if (!stats.isFile()) {
      return { isValid: false, error: 'Path is not a file' };
    }

    if (stats.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File too large' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Cannot access file' };
  }
}

/**
 * Sanitizes error messages to prevent information disclosure
 */
export function sanitizeError(error: unknown): string {
  // Log the full error for debugging (in production, use proper logging)
  if (isDetailedErrorLoggingEnabled()) {
    console.error('File operation error:', error);
  } else {
    console.warn('File operation failed');
  }
  
  // Return generic error message to client
  return 'File operation failed';
}

/**
 * Validates pagination parameters
 */
export function validatePagination(page: string | null, limit: string | null): { isValid: boolean; page?: number; limit?: number; error?: string } {
  const pageNum = page ? parseInt(page, 10) : 1;
  const limitNum = limit ? parseInt(limit, 10) : DEFAULT_PAGE_SIZE;

  if (isNaN(pageNum) || pageNum < 1) {
    return { isValid: false, error: 'Invalid page number' };
  }

  if (isNaN(limitNum) || limitNum < MIN_PAGE_SIZE || limitNum > MAX_PAGE_SIZE) {
    return { isValid: false, error: `Invalid limit (must be ${MIN_PAGE_SIZE}-${MAX_PAGE_SIZE})` };
  }

  return { isValid: true, page: pageNum, limit: limitNum };
}

/**
 * Validates filter parameter
 */
export function validateFilter(filter: string | null): { isValid: boolean; filter?: string; error?: string } {
  const sanitizedFilter = filter || 'all';

  if (!VALID_FILTERS.includes(sanitizedFilter)) {
    return { isValid: false, error: 'Invalid filter value' };
  }

  return { isValid: true, filter: sanitizedFilter };
}

/**
 * Validates category parameter
 */
export function validateCategory(category: string | null): { isValid: boolean; category?: string; error?: string } {
  if (!category || typeof category !== 'string') {
    return { isValid: false, error: 'Category is required' };
  }

  // Allow only alphanumeric characters, dots, hyphens, underscores
  if (!CATEGORY_REGEX.test(category)) {
    return { isValid: false, error: 'Invalid category name' };
  }

  if (category.length > MAX_CATEGORY_LENGTH) {
    return { isValid: false, error: 'Category name too long' };
  }

  return { isValid: true, category };
}
