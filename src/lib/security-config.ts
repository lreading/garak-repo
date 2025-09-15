/**
 * Security configuration for the Garak Report Dashboard
 * 
 * This file contains security settings and allowed configurations
 * that can be customized for different deployment environments.
 */

// Allowed file extensions for report files
export const ALLOWED_FILE_EXTENSIONS = ['.jsonl'];

// Maximum filename length
export const MAX_FILENAME_LENGTH = 255;

// Maximum file size (500MB)
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Maximum number of files to process in a single request
export const MAX_FILES_PER_REQUEST = 1000;

// Allowed characters in filenames (more permissive - allows most printable characters except dangerous ones)
// This regex allows letters, numbers, spaces, common punctuation, and forward slashes for folder separators while blocking dangerous characters
export const FILENAME_REGEX = /^[^<>:"\\|?*\x00-\x1f]+$/;

// Allowed characters in folder paths (allows forward slashes for nested paths)
// This regex allows letters, numbers, spaces, common punctuation, and forward slashes while blocking dangerous characters
export const FOLDER_PATH_REGEX = /^[^<>:"\\|?*\x00-\x1f]+$/;

// Maximum length for category names
export const MAX_CATEGORY_LENGTH = 100;

// Allowed characters in category names
export const CATEGORY_REGEX = /^[a-zA-Z0-9._-]+$/;

// Pagination limits
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

// Valid filter values
export const VALID_FILTERS = ['all', 'vulnerable', 'safe'];

// Security headers to add to responses
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
};

// Rate limiting configuration (requests per minute)
export const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per IP
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

// Logging configuration
export const LOGGING_CONFIG = {
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  logSecurityEvents: true,
  logFileOperations: true,
  sanitizeLogs: true
};

// Environment-specific security settings
export const ENVIRONMENT_CONFIG = {
  development: {
    strictPathValidation: false,
    logDetailedErrors: true
  },
  production: {
    strictPathValidation: true,
    logDetailedErrors: false
  },
  test: {
    strictPathValidation: true,
    logDetailedErrors: true
  }
};

// Get current environment configuration
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG] || ENVIRONMENT_CONFIG.development;
}

// Absolute paths are always allowed - security comes from proper validation
export function isAbsolutePathAllowed(): boolean {
  return true;
}

// Check if strict path validation should be enforced
export function isStrictPathValidationEnabled(): boolean {
  return getEnvironmentConfig().strictPathValidation;
}

// Check if detailed error logging is enabled
export function isDetailedErrorLoggingEnabled(): boolean {
  return getEnvironmentConfig().logDetailedErrors;
}
