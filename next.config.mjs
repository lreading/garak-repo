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
    // Even if OIDC is enabled, provide defaults if not set
    if (!process.env.NEXTAUTH_URL) {
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
    }
  }
}

// Initialize defaults
initializeEnvironmentDefaults();

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone'
};

export default nextConfig;
