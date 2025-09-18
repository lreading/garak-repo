/**
 * OIDC Configuration for Generic Provider Support
 * 
 * This configuration supports automated service discovery for various OIDC providers
 * including Okta, Google, Azure AD, Auth0, and others.
 */

import { isOIDCEnabled } from './config';

export interface OIDCProviderConfig {
  // Provider identification
  name: string;
  issuer: string;
  
  // Client configuration
  clientId: string;
  clientSecret: string;
  
  // Optional provider-specific overrides
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  jwksUri?: string;
  endSessionEndpoint?: string;
  
  // Scopes to request
  scopes?: string[];
  
  // Additional configuration
  responseType?: string;
  responseMode?: string;
  prompt?: string;
  maxAge?: number;
  
  // Security settings
  usePKCE?: boolean;
  nonce?: boolean;
  state?: boolean;
}

export interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  response_modes_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  claims_supported?: string[];
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
}

export interface OIDCUser {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  roles?: string[];
  [key: string]: unknown;
}

export interface OIDCTokenSet {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Default OIDC configuration
 */
export const DEFAULT_OIDC_CONFIG: Partial<OIDCProviderConfig> = {
  scopes: ['openid', 'profile', 'email'],
  responseType: 'code',
  responseMode: 'query',
  usePKCE: true,
  nonce: true,
  state: true,
  maxAge: 3600, // 1 hour
};

/**
 * Common OIDC provider configurations
 */
export const COMMON_PROVIDERS: Record<string, Partial<OIDCProviderConfig>> = {
  okta: {
    name: 'Okta',
    scopes: ['openid', 'profile', 'email', 'groups'],
  },
  google: {
    name: 'Google',
    scopes: ['openid', 'profile', 'email'],
  },
  azure: {
    name: 'Azure AD',
    scopes: ['openid', 'profile', 'email'],
  },
  auth0: {
    name: 'Auth0',
    scopes: ['openid', 'profile', 'email'],
  },
  keycloak: {
    name: 'Keycloak',
    scopes: ['openid', 'profile', 'email'],
  },
  cognito: {
    name: 'AWS Cognito',
    scopes: ['openid', 'profile', 'email'],
  },
};

/**
 * Validates OIDC configuration
 */
export function validateOIDCConfig(config: OIDCProviderConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || typeof config.name !== 'string') {
    errors.push('Provider name is required');
  }

  if (!config.issuer || typeof config.issuer !== 'string') {
    errors.push('Issuer URL is required');
  } else {
    try {
      new URL(config.issuer);
      // Remove trailing slash if present
      if (config.issuer.endsWith('/')) {
        errors.push('Issuer URL should not end with a trailing slash');
      }
    } catch {
      errors.push('Issuer must be a valid URL');
    }
  }

  if (!config.clientId || typeof config.clientId !== 'string') {
    errors.push('Client ID is required');
  }

  if (!config.clientSecret || typeof config.clientSecret !== 'string') {
    errors.push('Client secret is required');
  }

  // Validate optional endpoints if provided
  const endpoints = [
    'authorizationEndpoint',
    'tokenEndpoint',
    'userInfoEndpoint',
    'jwksUri',
    'endSessionEndpoint'
  ];

  for (const endpoint of endpoints) {
    const value = config[endpoint as keyof OIDCProviderConfig];
    if (value && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        errors.push(`${endpoint} must be a valid URL`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Merges provider-specific configuration with defaults
 */
export function mergeOIDCConfig(config: OIDCProviderConfig): OIDCProviderConfig {
  const merged = { ...DEFAULT_OIDC_CONFIG, ...config };
  
  // Apply provider-specific defaults if available, but preserve user-specified scopes
  const providerKey = Object.keys(COMMON_PROVIDERS).find(key => 
    config.issuer.toLowerCase().includes(key) || 
    config.name.toLowerCase().includes(key)
  );
  
  if (providerKey) {
    const providerDefaults = COMMON_PROVIDERS[providerKey];
    // Apply provider defaults but preserve user-specified scopes
    const userScopes = config.scopes;
    Object.assign(merged, providerDefaults);
    // Restore user-specified scopes if they were provided
    if (userScopes && userScopes.length > 0) {
      merged.scopes = userScopes;
    }
  }
  
  return merged as OIDCProviderConfig;
}

/**
 * Gets OIDC configuration from environment variables
 */
export function getOIDCConfigFromEnv(): OIDCProviderConfig | null {
  // Check if OIDC is enabled
  if (!isOIDCEnabled()) {
    return null;
  }

  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const name = process.env.OIDC_PROVIDER_NAME || 'OIDC Provider';

  if (!issuer || !clientId || !clientSecret) {
    return null;
  }

  const config: OIDCProviderConfig = {
    name,
    issuer: issuer.endsWith('/') ? issuer.slice(0, -1) : issuer, // Remove trailing slash
    clientId,
    clientSecret,
    scopes: process.env.OIDC_SCOPES?.split(',') || DEFAULT_OIDC_CONFIG.scopes,
    authorizationEndpoint: process.env.OIDC_AUTHORIZATION_ENDPOINT,
    tokenEndpoint: process.env.OIDC_TOKEN_ENDPOINT,
    userInfoEndpoint: process.env.OIDC_USERINFO_ENDPOINT,
    jwksUri: process.env.OIDC_JWKS_URI,
    endSessionEndpoint: process.env.OIDC_END_SESSION_ENDPOINT,
    usePKCE: process.env.OIDC_USE_PKCE !== 'false',
    nonce: process.env.OIDC_USE_NONCE !== 'false',
    state: process.env.OIDC_USE_STATE !== 'false',
    maxAge: process.env.OIDC_MAX_AGE ? parseInt(process.env.OIDC_MAX_AGE, 10) : DEFAULT_OIDC_CONFIG.maxAge,
  };

  return mergeOIDCConfig(config);
}
