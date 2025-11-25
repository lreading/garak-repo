import { IFolderService } from '../interfaces/IFolderService';
import { FileFolderService } from '../implementations/FileFolderService';
import { IReportService } from '../interfaces/IReportService';
import { FileReportService } from '../implementations/FileReportService';

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
    // TODO: Read POSTGRES specific env variables to determine if we should use the database backend
    const backend = process.env.STORAGE_BACKEND || 'file';
    return backend === 'database' ? 'database' : 'file';
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
        // TODO: Implement DatabaseFolderService when database layer is added
        throw new Error('Database backend not yet implemented');
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
        // TODO: Implement DatabaseReportService when database layer is added
        throw new Error('Database backend not yet implemented');
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

