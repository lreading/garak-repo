import crypto from 'crypto';

// Initialize environment variable defaults before Next.js starts
// This ensures they're available to both middleware (Edge runtime) and API routes (Node runtime)
function initializeEnvironmentDefaults() {
  // Detect build phase vs runtime
  const isBuildPhase = process.argv.includes('build');
  const isStartPhase = process.argv.includes('start');
  
  const oidcEnabled = process.env.OIDC_ENABLED !== 'false';
  
  // Set default REPORT_DIR if not provided or empty
  if (!process.env.REPORT_DIR || process.env.REPORT_DIR === '') {
    process.env.REPORT_DIR = './data';
  }
  
  // If OIDC is disabled, set defaults for NextAuth
  if (!oidcEnabled) {
    // Set NEXTAUTH_URL default
    if (!process.env.NEXTAUTH_URL) {
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      if (!isBuildPhase && !isStartPhase) {
        console.log('OIDC disabled: Using default NEXTAUTH_URL: http://localhost:3000');
      }
    }
    
    // Generate and set NEXTAUTH_SECRET if not provided
    if (!process.env.NEXTAUTH_SECRET) {
      process.env.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex');
      if (!isBuildPhase && !isStartPhase) {
        console.log('OIDC disabled: Generated random NEXTAUTH_SECRET for session management');
      }
    }
  } else {
    // OIDC is enabled - validate required environment variables
    // Skip validation during build phase
    if (isBuildPhase) {
      // During build, set dummy values to allow the build to complete
      // Real values must be provided at runtime
      if (!process.env.NEXTAUTH_URL) {
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
      }
      if (!process.env.NEXTAUTH_SECRET) {
        process.env.NEXTAUTH_SECRET = 'build-time-placeholder-secret';
      }
      if (!process.env.OIDC_ISSUER) {
        process.env.OIDC_ISSUER = 'https://build-time-placeholder.com';
      }
      if (!process.env.OIDC_CLIENT_ID) {
        process.env.OIDC_CLIENT_ID = 'build-time-placeholder';
      }
      if (!process.env.OIDC_CLIENT_SECRET) {
        process.env.OIDC_CLIENT_SECRET = 'build-time-placeholder';
      }
      return;
    }
    
    // Runtime validation (skip during start phase as config isn't loaded yet)
    if (isStartPhase) {
      // During production start, we can't validate here because next.config.mjs
      // is only loaded once during the build. The start.sh script should handle
      // validation or the app will fail at first request.
      return;
    }
    
    const missingVars = [];
    
    // Check for required OIDC variables
    if (!process.env.OIDC_ISSUER) {
      missingVars.push('OIDC_ISSUER');
    }
    if (!process.env.OIDC_CLIENT_ID) {
      missingVars.push('OIDC_CLIENT_ID');
    }
    if (!process.env.OIDC_CLIENT_SECRET) {
      missingVars.push('OIDC_CLIENT_SECRET');
    }
    
    // Check for required NextAuth variables
    if (!process.env.NEXTAUTH_URL) {
      missingVars.push('NEXTAUTH_URL');
    }
    if (!process.env.NEXTAUTH_SECRET) {
      missingVars.push('NEXTAUTH_SECRET');
    }
    
    // If any required variables are missing, log error and exit
    if (missingVars.length > 0) {
      console.error('\n❌ ERROR: OIDC is enabled but required environment variables are missing:\n');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\nPlease set these environment variables in your .env file.');
      console.error('See example.env for configuration examples.\n');
      console.error('To disable OIDC authentication, set: OIDC_ENABLED=false\n');
      process.exit(1);
    }
    
    console.log('✓ OIDC enabled: All required environment variables are set');
  }
}

// Initialize defaults
initializeEnvironmentDefaults();

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        instrumentationHook: true,
    },
};

export default nextConfig;
