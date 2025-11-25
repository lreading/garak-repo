import { readdirSync, statSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { IFolderService } from '../interfaces/IFolderService';
import { Folder, CreateFolderRequest, CreateFolderResponse } from '../types/folder.types';
import { 
  validateReportDirectory, 
  buildSafeFolderPath 
} from '@/lib/security';
import { getAppConfig } from '@/lib/config';

/**
 * File-based implementation of IFolderService
 * 
 * This implementation uses the filesystem to manage folders
 */
export class FileFolderService implements IFolderService {
  private readonly reportDir: string;

  constructor() {
    const config = getAppConfig();
    this.reportDir = config.reportDir;
  }

  /**
   * Recursively get folder structure and flatten it for dropdown
   */
  private getAllFoldersRecursive(dirPath: string, basePath: string): Folder[] {
    try {
      const items = readdirSync(dirPath);
      const result: Folder[] = [];
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = statSync(itemPath);
        
        if (stats.isDirectory()) {
          const relativePath = itemPath.replace(basePath, '').replace(/^[\/\\]/, '');
          result.push({
            name: item,
            path: relativePath,
            isDirectory: true
          });
          
          // Recursively get nested folders
          const nestedFolders = this.getAllFoldersRecursive(itemPath, basePath);
          result.push(...nestedFolders);
        }
      }
      
      return result.sort((a, b) => a.path.localeCompare(b.path));
    } catch {
      return [];
    }
  }

  async getAllFolders(): Promise<Folder[]> {
    // Validate and sanitize report directory
    const dirValidation = validateReportDirectory(this.reportDir);
    if (!dirValidation.isValid) {
      throw new Error('Invalid report directory configuration');
    }
    
    const dataDir = dirValidation.sanitized!;
    
    // Get all folders (flattened for dropdown)
    return this.getAllFoldersRecursive(dataDir, dataDir);
  }

  async createFolder(request: CreateFolderRequest): Promise<CreateFolderResponse> {
    if (!request.folderPath || typeof request.folderPath !== 'string') {
      throw new Error('Folder path is required');
    }

    // Validate and sanitize report directory
    const dirValidation = validateReportDirectory(this.reportDir);
    if (!dirValidation.isValid) {
      throw new Error('Invalid report directory configuration');
    }
    
    const dataDir = dirValidation.sanitized!;
    
    // Build safe folder path
    const folderPathValidation = buildSafeFolderPath(dataDir, request.folderPath);
    if (!folderPathValidation.isValid) {
      throw new Error(folderPathValidation.error || 'Invalid folder path');
    }
    
    // Create the folder
    try {
      await mkdir(folderPathValidation.folderPath!, { recursive: true });
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw new Error('Failed to create folder');
    }
    
    return { 
      success: true, 
      folderPath: request.folderPath 
    };
  }
}

