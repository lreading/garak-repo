/**
 * Application Configuration
 * 
 * This file centralizes configuration that needs to be available
 * in both server and middleware contexts.
 */

export interface AppConfig {
  oidcEnabled: boolean;
  reportDir: string;
  nextAuthUrl: string;
  nextAuthSecret: string;
  sharedSecret: string;
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
  };
}

/**
 * Gets the OIDC enabled status
 */
export function isOIDCEnabled(): boolean {
  return process.env.OIDC_ENABLED !== 'false';
}
