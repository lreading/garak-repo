import { Folder, CreateFolderRequest, CreateFolderResponse } from '../types/folder.types';

/**
 * Interface for folder service operations
 * 
 * This interface defines the contract for folder operations,
 * allowing multiple implementations (file-based, database, etc.)
 */
export interface IFolderService {
  /**
   * Get all folders in the report directory
   * Returns a flattened list of all folders sorted by path
   */
  getAllFolders(): Promise<Folder[]>;

  /**
   * Create a new folder at the specified path
   */
  createFolder(request: CreateFolderRequest): Promise<CreateFolderResponse>;
}

