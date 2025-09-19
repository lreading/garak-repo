/**
 * Shared Secret Authentication for Machine-to-Machine Communication
 * 
 * This module provides authentication using a configurable shared secret
 * for API endpoints that need to support machine-to-machine communication.
 */

import { NextRequest } from 'next/server';
import { getAppConfig } from './config';

export interface SharedSecretAuthResult {
  isAuthenticated: boolean;
  error?: string;
}

/**
 * Validates a shared secret from the request
 */
export function validateSharedSecret(request: NextRequest): SharedSecretAuthResult {
  const config = getAppConfig();
  
  // If no shared secret is configured, authentication fails
  if (!config.sharedSecret || config.sharedSecret.trim() === '') {
    return {
      isAuthenticated: false,
      error: 'Shared secret authentication not configured'
    };
  }

  // Check for shared secret in X-API-Key header (case-insensitive)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey.trim() === config.sharedSecret) {
    return { isAuthenticated: true };
  }

  return {
    isAuthenticated: false,
    error: 'Invalid or missing X-API-Key header'
  };
}

/**
 * Checks if shared secret authentication is enabled
 */
export function isSharedSecretEnabled(): boolean {
  const config = getAppConfig();
  return !!(config.sharedSecret && config.sharedSecret.trim() !== '');
}

/**
 * Creates an authentication error response
 */
export function createAuthErrorResponse(message: string = 'Authentication required') {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'X-API-Key realm="API"'
      }
    }
  );
}
