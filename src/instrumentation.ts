/**
 * Next.js Instrumentation Hook
 * 
 * This file runs on server startup and is used to initialize services
 * that need to run before the application starts handling requests.
 */

export async function register() {
  // Only run in Node.js runtime (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeDataSource, isDatabaseConfigured } = await import('./app/data-source');
    
    // Only initialize database if it's configured
    if (isDatabaseConfigured()) {
      try {
        console.log('Initializing database connection and running migrations...');
        await initializeDataSource();
        console.log('✓ Database initialization complete');
      } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        // Don't exit - allow app to start even if database fails
        // Services will handle the error when they try to use the database
      }
    } else {
      console.log('Database not configured, skipping database initialization');
    }
  }
}

