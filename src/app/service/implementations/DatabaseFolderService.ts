import { IFolderService } from '../interfaces/IFolderService';
import { Folder, CreateFolderRequest, CreateFolderResponse } from '../types/folder.types';

/**
 * Database-based implementation of IFolderService
 * 
 * Note: Folders are a filesystem concept. In database mode, folders are not applicable
 * as reports are stored in a normalized database structure. This implementation
 * returns empty results to maintain interface compliance.
 */
export class DatabaseFolderService implements IFolderService {
  async getAllFolders(): Promise<Folder[]> {
    // Folders are not applicable in database mode
    // Reports are stored in a normalized structure without folder hierarchy
    return [];
  }

  async createFolder(request: CreateFolderRequest): Promise<CreateFolderResponse> {
    // Folders are not applicable in database mode
    // This operation is a no-op but returns success for interface compliance
    return {
      success: true,
      folderPath: request.folderPath,
    };
  }
}

