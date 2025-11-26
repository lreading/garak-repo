import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Report } from './entities/Report';
import { Attempt } from './entities/Attempt';
import { AttemptAnnotation } from './entities/AttemptAnnotation';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
// Import migrations explicitly so Next.js webpack includes them
import { InitSchema1764120944258 } from './migrations/1764120944258-InitSchema';

/**
 * Database connection configuration
 * 
 * This module provides conditional database initialization based on environment variables.
 * If no database configuration is provided, the application will use file-based storage.
 * 
 * To enable database storage, set either:
 *   - POSTGRES_CONNECTION_STRING (full connection string)
 *   - All of: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
 */

let appDataSource: DataSource | null = null;

/**
 * Create a DataSource instance from environment variables
 * This function is used by both the runtime data-source and the CLI data-source
 * 
 * @param allowDefaults - If true, provides default values when env vars are missing (for CLI usage)
 * @returns A new DataSource instance (not initialized)
 */
export function createDataSource(allowDefaults: boolean = false): DataSource {
  const {
    POSTGRES_CONNECTION_STRING,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
  } = process.env;

  // Build DataSource configuration
  const dataSourceConfig: {
    type: 'postgres';
    url?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    entities: (typeof Report | typeof Attempt | typeof AttemptAnnotation)[];
    migrations: (typeof InitSchema1764120944258)[];
    synchronize: boolean;
    logging: boolean;
  } = {
    type: 'postgres',
    entities: [Report, Attempt, AttemptAnnotation],
    migrations: [InitSchema1764120944258],
    synchronize: false, // Always use migrations, never auto-sync
    logging: false // Enable this to debug
  };

  // Use connection string if provided, otherwise use individual parameters
  if (POSTGRES_CONNECTION_STRING) {
    dataSourceConfig.url = POSTGRES_CONNECTION_STRING;
  } else if (POSTGRES_HOST && POSTGRES_PORT && POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
    dataSourceConfig.host = POSTGRES_HOST;
    dataSourceConfig.port = parseInt(POSTGRES_PORT, 10);
    dataSourceConfig.username = POSTGRES_USER;
    dataSourceConfig.password = POSTGRES_PASSWORD;
    dataSourceConfig.database = POSTGRES_DB;
  } else if (allowDefaults) {
    // Provide defaults for CLI usage (will fail at runtime if not configured)
    dataSourceConfig.host = POSTGRES_HOST || 'localhost';
    dataSourceConfig.port = POSTGRES_PORT ? parseInt(POSTGRES_PORT, 10) : 5432;
    dataSourceConfig.username = POSTGRES_USER || 'garak';
    dataSourceConfig.password = POSTGRES_PASSWORD || 'garak';
    dataSourceConfig.database = POSTGRES_DB || 'garak';
  } else {
    throw new Error('Database configuration is required. Set POSTGRES_CONNECTION_STRING or all of POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB');
  }

  return new DataSource(dataSourceConfig as PostgresConnectionOptions);
}

/**
 * Check if database configuration is available
 * @returns true if database environment variables are set, false otherwise
 */
export function isDatabaseConfigured(): boolean {
  const {
    POSTGRES_CONNECTION_STRING,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
  } = process.env;

  // Check for connection string first
  if (POSTGRES_CONNECTION_STRING) {
    return true;
  }

  // Check for all individual parameters
  if (POSTGRES_HOST && POSTGRES_PORT && POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
    return true;
  }

  return false;
}

/**
 * Get the database DataSource instance
 * @returns DataSource if configured, null otherwise
 */
export function getDataSource(): DataSource | null {
  return appDataSource;
}

/**
 * Run pending database migrations
 * This is called automatically during database initialization
 * 
 * @param dataSource - The initialized DataSource instance
 */
async function runMigrations(dataSource: DataSource): Promise<void> {
  try {
    const hasPendingMigrations = await dataSource.showMigrations();
    if (hasPendingMigrations) {
      console.log('Running pending migrations...');
      const executedMigrations = await dataSource.runMigrations();
      if (executedMigrations.length > 0) {
        console.log(`✓ Successfully ran ${executedMigrations.length} migration(s):`);
        executedMigrations.forEach(migration => {
          console.log(`  - ${migration.name}`);
        });
      }
    } else {
      console.log('✓ Database is up to date (no pending migrations)');
    }
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }
}

/**
 * Initialize the database connection
 * Only creates and initializes the DataSource if database configuration is available
 * Automatically runs pending migrations after initialization
 * 
 * @returns Promise that resolves to the DataSource if initialized, or null if not configured
 */
export async function initializeDataSource(): Promise<DataSource | null> {
  // If already initialized, return existing instance
  if (appDataSource?.isInitialized) {
    return appDataSource;
  }

  // Check if database is configured
  if (!isDatabaseConfigured()) {
    return null;
  }

  // Create and initialize DataSource
  appDataSource = createDataSource(false);

  try {
    await appDataSource.initialize();
    
    // Run pending migrations automatically
    await runMigrations(appDataSource);
    
    return appDataSource;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    appDataSource = null;
    throw error;
  }
}

/**
 * Close the database connection
 * Should be called during application shutdown
 */
export async function closeDataSource(): Promise<void> {
  if (appDataSource?.isInitialized) {
    await appDataSource.destroy();
    appDataSource = null;
  }
}

