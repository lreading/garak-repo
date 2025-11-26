import { IFolderService } from '../interfaces/IFolderService';
import { FileFolderService } from '../implementations/FileFolderService';
import { DatabaseFolderService } from '../implementations/DatabaseFolderService';
import { IReportService } from '../interfaces/IReportService';
import { FileReportService } from '../implementations/FileReportService';
import { DatabaseReportService } from '../implementations/DatabaseReportService';
import { isDatabaseConfigured } from '@/app/data-source';

/**
 * Storage backend type
 */
export type StorageBackend = 'file' | 'database';

/**
 * Service factory for creating service implementations
 * 
 * This factory dynamically selects the appropriate implementation
 * based on configuration/environment variables
 */
export class ServiceFactory {
  private static folderServiceInstance: IFolderService | null = null;
  private static reportServiceInstance: IReportService | null = null;

  /**
   * Get the configured storage backend from environment
   */
  private static getStorageBackend(): StorageBackend {
    // Check if database is configured via environment variables
    if (isDatabaseConfigured()) {
      return 'database';
    }
    // Default to file storage
    return 'file';
  }

  /**
   * Get the folder service implementation
   */
  static getFolderService(): IFolderService {
    if (this.folderServiceInstance) {
      return this.folderServiceInstance;
    }

    const backend = this.getStorageBackend();

    switch (backend) {
      case 'file':
        this.folderServiceInstance = new FileFolderService();
        break;
      case 'database':
        this.folderServiceInstance = new DatabaseFolderService();
        break;
      default:
        throw new Error(`Unknown storage backend: ${backend}`);
    }

    return this.folderServiceInstance;
  }

  /**
   * Get the report service implementation
   */
  static getReportService(): IReportService {
    if (this.reportServiceInstance) {
      return this.reportServiceInstance;
    }

    const backend = this.getStorageBackend();

    switch (backend) {
      case 'file':
        this.reportServiceInstance = new FileReportService();
        break;
      case 'database':
        this.reportServiceInstance = new DatabaseReportService();
        break;
      default:
        throw new Error(`Unknown storage backend: ${backend}`);
    }

    return this.reportServiceInstance;
  }

  /**
   * Reset service instances (useful for testing)
   */
  static reset(): void {
    this.folderServiceInstance = null;
    this.reportServiceInstance = null;
  }
}

