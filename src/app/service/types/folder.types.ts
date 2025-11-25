/**
 * Folder-related types
 */

export interface Folder {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface CreateFolderRequest {
  folderPath: string;
}

export interface CreateFolderResponse {
  success: boolean;
  folderPath: string;
}

