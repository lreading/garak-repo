import 'reflect-metadata';
// Load environment variables from .env file for CLI usage
// Next.js doesn't load .env files when running CLI commands
import dotenv from 'dotenv';
dotenv.config();

import { createDataSource } from './data-source';

/**
 * DataSource for TypeORM CLI usage
 * 
 * This file is used by TypeORM CLI commands (migration:generate, migration:run, etc.)
 * It exports a DataSource instance that TypeORM CLI can load synchronously.
 * We do this because the runtime data source is lazy loaded depending on the configuration,
 * and is not exported/available for TypeORM CLI to use.
 * 
 * For runtime usage, use the functions from data-source.ts instead.
 */

// Create DataSource with defaults enabled (for CLI usage)
// This allows TypeORM CLI to load the file even if env vars aren't fully set
const AppDataSource = createDataSource(true);

export default AppDataSource;

