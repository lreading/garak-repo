/**
 * Application Configuration
 * 
 * This file centralizes configuration that needs to be available
 * in both server and middleware contexts.
 * 
 * Note: Environment variable defaults are initialized in next.config.mjs
 * to ensure they're available before any code runs.
 */

export interface AppConfig {
  oidcEnabled: boolean;
  reportDir: string;
  nextAuthUrl: string;
  nextAuthSecret: string;
  sharedSecret: string;
  reportReadonly: boolean;
}

/**
 * Gets the application configuration from environment variables
 */
export function getAppConfig(): AppConfig {
  return {
    oidcEnabled: process.env.OIDC_ENABLED !== 'false',
    reportDir: process.env.REPORT_DIR || './data',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    nextAuthSecret: process.env.NEXTAUTH_SECRET || '',
    sharedSecret: process.env.SHARED_SECRET || '',
    reportReadonly: process.env.REPORT_READONLY === 'true',
  };
}

/**
 * Gets the OIDC enabled status
 * Note: The server-wrapper.js ensures process.env is set correctly at startup
 * We access it dynamically to prevent webpack from inlining the value
 */
export function isOIDCEnabled(): boolean {
  // Access dynamically to prevent build-time inlining
  const envVar = 'OIDC_ENABLED';
  return process.env[envVar] !== 'false';
}

/**
 * Gets the report readonly status
 */
export function isReportReadonly(): boolean {
  return process.env.REPORT_READONLY === 'true';
}
