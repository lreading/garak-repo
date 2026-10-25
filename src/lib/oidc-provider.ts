/** OIDC discovery, authorization, and token management. */
import * as oidc from 'openid-client';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { OIDCProviderConfig, OIDCDiscoveryDocument, OIDCUser, OIDCTokenSet } from './oidc-config';

export interface OIDCProvider {
  config: OIDCProviderConfig;
  client: oidc.Configuration;
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

export interface OIDCAuthorizationRequest {
  url: string;
  codeVerifier: string;
  state: string;
  nonce: string;
}

function tokenSet(tokens: oidc.TokenEndpointResponse): OIDCTokenSet {
  return {
    access_token: tokens.access_token,
    id_token: tokens.id_token,
    refresh_token: tokens.refresh_token,
    expires_at: typeof tokens.expires_in === 'number'
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : undefined,
    scope: tokens.scope,
    token_type: tokens.token_type,
  };
}

export class OIDCProviderManager {
  private providers = new Map<string, OIDCProvider>();
  private discoveryCache = new Map<string, OIDCDiscoveryDocument>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  async discoverProvider(issuer: string): Promise<OIDCDiscoveryDocument> {
    const cached = this.discoveryCache.get(issuer);
    if (cached && (this.cacheExpiry.get(issuer) ?? 0) > Date.now()) return cached;

    const discovered = await oidc.discovery(new URL(issuer), 'discovery');
    const metadata = discovered.serverMetadata();
    if (!metadata.authorization_endpoint || !metadata.token_endpoint || !metadata.jwks_uri) {
      throw new Error('OIDC provider is missing required endpoints');
    }
    const discovery = metadata as OIDCDiscoveryDocument;
    this.discoveryCache.set(issuer, discovery);
    this.cacheExpiry.set(issuer, Date.now() + this.CACHE_DURATION);
    return discovery;
  }

  async createProvider(config: OIDCProviderConfig): Promise<OIDCProvider> {
    const cacheKey = `${config.name}-${config.issuer}`;
    const cached = this.providers.get(cacheKey);
    if (cached && cached.config.clientId === config.clientId &&
        cached.config.clientSecret === config.clientSecret &&
        (this.cacheExpiry.get(config.issuer) ?? 0) > Date.now()) return cached;

    const discovery = await this.discoverProvider(config.issuer);
    const client = new oidc.Configuration({ ...discovery }, config.clientId, {
      client_secret: config.clientSecret,
      id_token_signed_response_alg: 'RS256',
    }, discovery.token_endpoint_auth_methods_supported?.includes('client_secret_basic')
      ? oidc.ClientSecretBasic(config.clientSecret)
      : oidc.ClientSecretPost(config.clientSecret));
    oidc.enableNonRepudiationChecks(client);
    const provider = { config, client, discovery };
    this.providers.set(cacheKey, provider);
    return provider;
  }

  getProvider(name: string, issuer: string): OIDCProvider | null {
    return this.providers.get(`${name}-${issuer}`) ?? null;
  }

  // The caller must retain these checks in the user's session until the callback.
  async generateAuthorizationUrl(
    provider: OIDCProvider, redirectUri: string, state = oidc.randomState()
  ): Promise<OIDCAuthorizationRequest> {
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const nonce = oidc.randomNonce();
    const url = oidc.buildAuthorizationUrl(provider.client, {
      response_type: 'code',
      scope: provider.config.scopes?.join(' ') || 'openid profile email',
      redirect_uri: redirectUri,
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
      code_challenge_method: 'S256',
      ...(provider.config.prompt && { prompt: provider.config.prompt }),
      ...(provider.config.maxAge !== undefined && { max_age: String(provider.config.maxAge) }),
    });
    return { url: url.href, codeVerifier, state, nonce };
  }

  async exchangeCodeForTokens(
    provider: OIDCProvider,
    callbackUrl: URL,
    checks: Pick<OIDCAuthorizationRequest, 'codeVerifier' | 'state' | 'nonce'>,
  ): Promise<OIDCTokenSet> {
    if (!checks.codeVerifier || !checks.state || !checks.nonce) {
      throw new Error('OIDC callback requires PKCE, state, and nonce checks');
    }
    const tokens = await oidc.authorizationCodeGrant(provider.client, callbackUrl, {
      pkceCodeVerifier: checks.codeVerifier,
      expectedState: checks.state,
      expectedNonce: checks.nonce,
      idTokenExpected: true,
      maxAge: provider.config.maxAge,
    });
    return tokenSet(tokens);
  }

  async getUserInfo(provider: OIDCProvider, accessToken: string, expectedSubject: string): Promise<OIDCUser> {
    return await oidc.fetchUserInfo(provider.client, accessToken, expectedSubject) as OIDCUser;
  }

  async validateIdToken(provider: OIDCProvider, idToken: string, nonce?: string): Promise<Record<string, unknown>> {
    const { payload } = await jwtVerify(idToken, createRemoteJWKSet(new URL(provider.discovery.jwks_uri)), {
      issuer: provider.discovery.issuer,
      audience: provider.config.clientId,
      algorithms: ['RS256'],
      requiredClaims: ['iss', 'sub', 'aud', 'exp', 'iat'],
    });
    if (payload.nonce !== nonce) throw new Error('ID token nonce mismatch');
    if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== provider.config.clientId) {
      throw new Error('ID token authorized party mismatch');
    }
    return payload;
  }

  async refreshToken(provider: OIDCProvider, refreshToken: string): Promise<OIDCTokenSet> {
    return tokenSet(await oidc.refreshTokenGrant(provider.client, refreshToken));
  }

  async revokeToken(provider: OIDCProvider, token: string, tokenTypeHint?: string): Promise<void> {
    await oidc.tokenRevocation(provider.client, token, tokenTypeHint ? { token_type_hint: tokenTypeHint } : undefined);
  }

  getEndSessionUrl(provider: OIDCProvider, idToken: string, postLogoutRedirectUri?: string): string | null {
    if (!provider.discovery.end_session_endpoint) return null;
    return oidc.buildEndSessionUrl(provider.client, {
      id_token_hint: idToken,
      ...(postLogoutRedirectUri && { post_logout_redirect_uri: postLogoutRedirectUri }),
    }).href;
  }

  clearCache(): void {
    this.providers.clear();
    this.discoveryCache.clear();
    this.cacheExpiry.clear();
  }

  getCachedProviders(): OIDCProvider[] {
    return Array.from(this.providers.values());
  }
}

export const oidcProviderManager = new OIDCProviderManager();
