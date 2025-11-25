/**
 * Shared error types for report service operations
 * 
 * These error types allow service implementations to communicate
 * error conditions with appropriate HTTP status codes to the API layer,
 * without the route needing to know implementation-specific details.
 */

export enum ReportErrorCode {
  INVALID_FILENAME = 'INVALID_FILENAME',
  INVALID_FOLDER_PATH = 'INVALID_FOLDER_PATH',
  INVALID_FILE_PATH = 'INVALID_FILE_PATH',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_REPORT_DIRECTORY = 'INVALID_REPORT_DIRECTORY',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  INVALID_FILE_EXTENSION = 'INVALID_FILE_EXTENSION',
  INVALID_GARAK_REPORT = 'INVALID_GARAK_REPORT',
  FAILED_TO_SAVE_FILE = 'FAILED_TO_SAVE_FILE',
  FAILED_TO_CREATE_DIRECTORY = 'FAILED_TO_CREATE_DIRECTORY',
  FAILED_TO_READ_FILE = 'FAILED_TO_READ_FILE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ReportServiceError extends Error {
  public readonly code: ReportErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: ReportErrorCode,
    message: string,
    statusCode: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'ReportServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Helper functions to create common report service errors
 */
export const ReportErrors = {
  invalidFilename: (error?: string): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.INVALID_FILENAME,
      error || 'Invalid filename',
      400
    );
  },

  invalidFolderPath: (error?: string): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.INVALID_FOLDER_PATH,
      error || 'Invalid folder path',
      400
    );
  },

  invalidFilePath: (error?: string): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.INVALID_FILE_PATH,
      error || 'Invalid file path',
      400
    );
  },

  fileNotFound: (message: string = 'File not found'): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.FILE_NOT_FOUND,
      message,
      404
    );
  },

  invalidReportDirectory: (): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.INVALID_REPORT_DIRECTORY,
      'Invalid report directory configuration',
      500
    );
  },

  fileTooLarge: (maxSizeMB: number): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.FILE_TOO_LARGE,
      `File too large. Maximum size is ${maxSizeMB}MB`,
      400
    );
  },

  invalidFileType: (allowedExtensions: string[]): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.INVALID_FILE_TYPE,
      `Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed`,
      400
    );
  },

  invalidFileExtension: (): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.INVALID_FILE_EXTENSION,
      'Invalid file extension',
      400
    );
  },

  invalidGarakReport: (error?: string): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.INVALID_GARAK_REPORT,
      error || 'Invalid Garak report',
      400
    );
  },

  failedToSaveFile: (): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.FAILED_TO_SAVE_FILE,
      'Failed to save file',
      500
    );
  },

  failedToCreateDirectory: (): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.FAILED_TO_CREATE_DIRECTORY,
      'Failed to create report directory',
      500
    );
  },

  failedToReadFile: (): ReportServiceError => {
    return new ReportServiceError(
      ReportErrorCode.FAILED_TO_READ_FILE,
      'Failed to read file',
      500
    );
  }
};

