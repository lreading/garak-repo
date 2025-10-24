import crypto from 'crypto';

// Initialize environment variable defaults before Next.js starts
// This ensures they're available to both middleware (Edge runtime) and API routes (Node runtime)
function initializeEnvironmentDefaults() {
  const oidcEnabled = process.env.OIDC_ENABLED !== 'false';
  
  // Set default REPORT_DIR if not provided
  if (!process.env.REPORT_DIR) {
    process.env.REPORT_DIR = './data';
  }
  
  // If OIDC is disabled, set defaults for NextAuth
  if (!oidcEnabled) {
    // Set NEXTAUTH_URL default
    if (!process.env.NEXTAUTH_URL) {
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      console.log('OIDC disabled: Using default NEXTAUTH_URL: http://localhost:3000');
    }
    
    // Generate and set NEXTAUTH_SECRET if not provided
    if (!process.env.NEXTAUTH_SECRET) {
      process.env.NEXTAUTH_SECRET = crypto.randomBytes(32).toString('hex');
      console.log('OIDC disabled: Generated random NEXTAUTH_SECRET for session management');
    }
  } else {
    // OIDC is enabled - validate required environment variables
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
    output: 'standalone'
};

export default nextConfig;
