#!/usr/bin/env node
/**
 * Build-time script to discover API routes and generate a routes file
 * This is needed because in production (standalone build), source files aren't available at runtime
 */

import { glob } from 'glob';
import path from 'path';
import { writeFileSync } from 'fs';

async function generateApiRoutes() {
  try {
    const apiDir = path.join(process.cwd(), 'src/app/api');
    const routeFiles = await glob('**/route.ts', { 
      cwd: apiDir,
      absolute: true,
    });
    
    // Generate relative paths from the project root
    const relativePaths = routeFiles.map(file => 
      path.relative(process.cwd(), file)
    );
    
    // Sort for consistency
    relativePaths.sort();
    
    const outputPath = path.join(process.cwd(), 'src/lib/api-routes.json');
    const output = {
      routes: relativePaths,
      generatedAt: new Date().toISOString(),
      count: relativePaths.length,
    };
    
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log(`[Build] Generated API routes file: ${outputPath}`);
    console.log(`[Build] Discovered ${relativePaths.length} API routes`);
    
    return relativePaths;
  } catch (error) {
    console.error('[Build] Failed to generate API routes:', error);
    process.exit(1);
  }
}

generateApiRoutes();


