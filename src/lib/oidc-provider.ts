/**
 * OIDC Provider with Automated Service Discovery
 * 
 * This module handles OIDC provider discovery, token management, and user authentication
 * with support for various OIDC providers through automated service discovery.
 */

import { Issuer, Client, generators, Strategy } from 'openid-client';
import { OIDCProviderConfig, OIDCDiscoveryDocument, OIDCUser, OIDCTokenSet } from './oidc-config';

export interface OIDCProvider {
  config: OIDCProviderConfig;
  client: Client;
  discovery: OIDCDiscoveryDocument;
}

export interface OIDCAuthResult {
  user: OIDCUser;
  tokens: OIDCTokenSet;
  isNewUser?: boolean;
}

export interface OIDCError extends Error {
  code?: string;
  statusCode?: number;
  provider?: string;
}

/**
 * OIDC Provider Manager
 */
export class OIDCProviderManager {
  private providers: Map<string, OIDCProvider> = new Map();
  private discoveryCache: Map<string, OIDCDiscoveryDocument> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Discovers OIDC provider configuration
   */
  async discoverProvider(issuer: string): Promise<OIDCDiscoveryDocument> {
    const cacheKey = issuer;
    const now = Date.now();
    
    // Check cache first
    if (this.discoveryCache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.discoveryCache.get(cacheKey)!;
    }

    try {
      // Use openid-client for discovery
      const oidcIssuer = await Issuer.discover(issuer);
      
      const discovery: OIDCDiscoveryDocument = {
        issuer: oidcIssuer.metadata.issuer,
        authorization_endpoint: oidcIssuer.metadata.authorization_endpoint!,
        token_endpoint: oidcIssuer.metadata.token_endpoint!,
        userinfo_endpoint: oidcIssuer.metadata.userinfo_endpoint!,
        jwks_uri: oidcIssuer.metadata.jwks_uri!,
        end_session_endpoint: oidcIssuer.metadata.end_session_endpoint,
        revocation_endpoint: oidcIssuer.metadata.revocation_endpoint,
        introspection_endpoint: oidcIssuer.metadata.introspection_endpoint,
        scopes_supported: oidcIssuer.metadata.scopes_supported,
        response_types_supported: oidcIssuer.metadata.response_types_supported,
        response_modes_supported: oidcIssuer.metadata.response_modes_supported,
        subject_types_supported: oidcIssuer.metadata.subject_types_supported,
        id_token_signing_alg_values_supported: oidcIssuer.metadata.id_token_signing_alg_values_supported,
        token_endpoint_auth_methods_supported: oidcIssuer.metadata.token_endpoint_auth_methods_supported,
        claims_supported: oidcIssuer.metadata.claims_supported,
        code_challenge_methods_supported: oidcIssuer.metadata.code_challenge_methods_supported,
        grant_types_supported: oidcIssuer.metadata.grant_types_supported,
      };

      // Cache the discovery document
      this.discoveryCache.set(cacheKey, discovery);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

      return discovery;
    } catch (error) {
      throw new Error(`Failed to discover OIDC provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates an OIDC provider with client
   */
  async createProvider(config: OIDCProviderConfig): Promise<OIDCProvider> {
    const cacheKey = `${config.name}-${config.issuer}`;
    
    // Check if provider already exists
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    try {
      // Discover provider configuration
      const discovery = await this.discoverProvider(config.issuer);
      
      // Create OIDC issuer
      const issuer = new Issuer({
        issuer: discovery.issuer,
        authorization_endpoint: discovery.authorization_endpoint,
        token_endpoint: discovery.token_endpoint,
        userinfo_endpoint: discovery.userinfo_endpoint,
        jwks_uri: discovery.jwks_uri,
        end_session_endpoint: discovery.end_session_endpoint,
        revocation_endpoint: discovery.revocation_endpoint,
        introspection_endpoint: discovery.introspection_endpoint,
        scopes_supported: discovery.scopes_supported,
        response_types_supported: discovery.response_types_supported,
        response_modes_supported: discovery.response_modes_supported,
        subject_types_supported: discovery.subject_types_supported,
        id_token_signing_alg_values_supported: discovery.id_token_signing_alg_values_supported,
        token_endpoint_auth_methods_supported: discovery.token_endpoint_auth_methods_supported,
        claims_supported: discovery.claims_supported,
        code_challenge_methods_supported: discovery.code_challenge_methods_supported,
        grant_types_supported: discovery.grant_types_supported,
      });

      // Create OIDC client
      const client = new issuer.Client({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        response_types: [config.responseType || 'code'],
        id_token_signed_response_alg: 'RS256',
      });

      const provider: OIDCProvider = {
        config,
        client,
        discovery,
      };

      // Cache the provider
      this.providers.set(cacheKey, provider);

      return provider;
    } catch (error) {
      throw new Error(`Failed to create OIDC provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets an existing provider
   */
  getProvider(name: string, issuer: string): OIDCProvider | null {
    const cacheKey = `${name}-${issuer}`;
    return this.providers.get(cacheKey) || null;
  }

  /**
   * Generates authorization URL
   */
  generateAuthorizationUrl(provider: OIDCProvider, redirectUri: string, state?: string): string {
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const nonce = generators.nonce();
    
    const params = {
      client_id: provider.config.clientId,
      response_type: provider.config.responseType || 'code',
      scope: provider.config.scopes?.join(' ') || 'openid profile email',
      redirect_uri: redirectUri,
      state: state || generators.state(),
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      ...(provider.config.prompt && { prompt: provider.config.prompt }),
      ...(provider.config.maxAge && { max_age: provider.config.maxAge.toString() }),
    };

    return provider.client.authorizationUrl(params);
  }

  /**
   * Exchanges authorization code for tokens
   */
  async exchangeCodeForTokens(
    provider: OIDCProvider,
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<OIDCTokenSet> {
    try {
      const params: any = {
        code,
        redirect_uri: redirectUri,
      };

      if (codeVerifier) {
        params.code_verifier = codeVerifier;
      }

      const tokenSet = await provider.client.callback(redirectUri, params);
      
      return {
        access_token: tokenSet.access_token!,
        id_token: tokenSet.id_token!,
        refresh_token: tokenSet.refresh_token,
        expires_at: tokenSet.expires_at,
        scope: tokenSet.scope,
        token_type: tokenSet.token_type,
      };
    } catch (error) {
      throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets user information from token
   */
  async getUserInfo(provider: OIDCProvider, accessToken: string): Promise<OIDCUser> {
    try {
      const userInfo = await provider.client.userinfo(accessToken);
      return userInfo as OIDCUser;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates ID token
   */
  async validateIdToken(provider: OIDCProvider, idToken: string, nonce?: string): Promise<any> {
    try {
      const claims = await provider.client.validateIdToken(idToken, nonce);
      return claims;
    } catch (error) {
      throw new Error(`ID token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refreshes access token
   */
  async refreshToken(provider: OIDCProvider, refreshToken: string): Promise<OIDCTokenSet> {
    try {
      const tokenSet = await provider.client.refresh(refreshToken);
      
      return {
        access_token: tokenSet.access_token!,
        id_token: tokenSet.id_token!,
        refresh_token: tokenSet.refresh_token,
        expires_at: tokenSet.expires_at,
        scope: tokenSet.scope,
        token_type: tokenSet.token_type,
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revokes token
   */
  async revokeToken(provider: OIDCProvider, token: string, tokenTypeHint?: string): Promise<void> {
    try {
      await provider.client.revoke(token, tokenTypeHint);
    } catch (error) {
      throw new Error(`Token revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets end session URL
   */
  getEndSessionUrl(provider: OIDCProvider, idToken: string, postLogoutRedirectUri?: string): string | null {
    if (!provider.discovery.end_session_endpoint) {
      return null;
    }

    const params = new URLSearchParams({
      id_token_hint: idToken,
    });

    if (postLogoutRedirectUri) {
      params.set('post_logout_redirect_uri', postLogoutRedirectUri);
    }

    return `${provider.discovery.end_session_endpoint}?${params.toString()}`;
  }

  /**
   * Clears provider cache
   */
  clearCache(): void {
    this.providers.clear();
    this.discoveryCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Gets all cached providers
   */
  getCachedProviders(): OIDCProvider[] {
    return Array.from(this.providers.values());
  }
}

// Global instance
export const oidcProviderManager = new OIDCProviderManager();
