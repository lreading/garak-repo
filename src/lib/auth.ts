/**
 * NextAuth Configuration with OIDC Integration
 * 
 * This module configures NextAuth.js with OIDC provider support using our
 * generic OIDC provider manager for automated service discovery.
 */

import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { getOIDCConfigFromEnv, OIDCProviderConfig } from './oidc-config';
import { oidcProviderManager } from './oidc-provider';
import { isOIDCEnabled } from './config';

export interface OIDCSession {
  user: {
    id: string;
    email?: string;
    image?: string;
    sub: string;
    groups?: string[];
    roles?: string[];
  };
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
  provider: string;
}

export interface OIDCJWT extends JWT {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
  provider: string;
  sub: string;
  email?: string;
  image?: string;
  groups?: string[];
  roles?: string[];
}

/**
 * Gets OIDC configuration and creates provider
 */
async function getOIDCProvider(): Promise<{ config: OIDCProviderConfig; provider: Record<string, unknown> } | null> {
  const config = getOIDCConfigFromEnv();
  if (!config) {
    return null;
  }

  try {
    const nextAuthProvider = {
      id: 'oidc',
      name: config.name,
      type: 'oauth' as const,
      issuer: config.issuer,
      wellKnown: `${config.issuer}/.well-known/openid-configuration`,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      profile(profile: Record<string, unknown>) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username || profile.email,
          email: profile.email,
          image: profile.picture,
          sub: profile.sub,
          groups: profile.groups ?? [],
          roles: profile.roles ?? [],
        };
      },
    };
    

    return { config, provider: nextAuthProvider };
  } catch {
    return null;
  }
}

/**
 * Creates a minimal NextAuth configuration when OIDC is not available
 */
function getMinimalAuthOptions(): NextAuthOptions {
  return {
    providers: [],
    session: {
      strategy: 'jwt',
      maxAge: 3600,
    },
    jwt: {
      maxAge: 3600,
    },
    callbacks: {
      async session({ session }) {
        return session;
      },
      async jwt({ token }) {
        return token;
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    debug: process.env.OIDC_DEBUG === 'true'
  };
}

/**
 * Creates a no-auth configuration when OIDC is explicitly disabled
 */
function getNoAuthOptions(): NextAuthOptions {
  return {
    providers: [],
    session: {
      strategy: 'jwt',
      maxAge: 3600,
    },
    jwt: {
      maxAge: 3600,
    },
    callbacks: {
      async session({ session }) {
        // Create a default user session when no auth is required
        return {
          ...session,
          user: {
            id: 'anonymous',
            name: 'Anonymous User',
            email: 'anonymous@localhost',
            image: null,
          },
        };
      },
      async jwt({ token }) {
        // Create a default token when no auth is required
        return {
          ...token,
          sub: 'anonymous',
          email: 'anonymous@localhost',
          name: 'Anonymous User',
          groups: [],
          roles: [],
        };
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    debug: process.env.OIDC_DEBUG === 'true'
  };
}

/**
 * NextAuth configuration
 */
export async function getAuthOptions(): Promise<NextAuthOptions> {
  try {
    // Check if OIDC is explicitly disabled
    if (!isOIDCEnabled()) {
      return getNoAuthOptions();
    }

    const oidcSetup = await getOIDCProvider();
    
    if (!oidcSetup) {
      return getMinimalAuthOptions();
    }

  const { config, provider } = oidcSetup;

  return {
    providers: [provider],
    session: {
      strategy: 'jwt',
      maxAge: config.maxAge || 3600, // 1 hour
    },
    jwt: {
      maxAge: config.maxAge || 3600,
    },
    callbacks: {
      async jwt({ token, account, profile }): Promise<OIDCJWT> {
        // Initial sign in
        if (account && profile) {
          return {
            ...token,
            accessToken: account.access_token!,
            idToken: account.id_token!,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at! * 1000,
            provider: account.provider,
            sub: profile.sub as string,
            email: profile.email,
            image: (profile as Record<string, unknown>).picture as string,
            groups: (profile as Record<string, unknown>).groups as string[] || [],
            roles: (profile as Record<string, unknown>).roles as string[] || [],
          };
        }

        // Return previous token if the access token has not expired yet
        if (Date.now() < (token as OIDCJWT).expiresAt) {
          return token as OIDCJWT;
        }

        // Access token has expired, try to update it
        return await refreshAccessToken(token as OIDCJWT);
      },
      async session({ session, token }) {
        const oidcToken = token as OIDCJWT;
        
        return {
          ...session,
          user: {
            ...session.user,
            id: oidcToken.sub || (session.user as Record<string, unknown>)?.id as string,
            sub: oidcToken.sub,
            email: oidcToken.email || session.user?.email,
            image: oidcToken.image || session.user?.image,
            groups: oidcToken.groups,
            roles: oidcToken.roles,
          },
          accessToken: oidcToken.accessToken,
          idToken: oidcToken.idToken,
          refreshToken: oidcToken.refreshToken,
          expiresAt: oidcToken.expiresAt,
          provider: oidcToken.provider,
        } as OIDCSession;
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    debug: process.env.OIDC_DEBUG === 'true',
    events: {
      async signIn() {
        // User signed in
      },
      async signOut() {
        // User signed out
      },
    },
  };
  } catch (error) {
    throw new Error(`Authentication configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Refreshes access token using refresh token
 */
async function refreshAccessToken(token: OIDCJWT): Promise<OIDCJWT> {
  try {
    const oidcSetup = await getOIDCProvider();
    if (!oidcSetup || !token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const oidcProvider = await oidcProviderManager.createProvider(oidcSetup.config);
    const refreshedTokens = await oidcProviderManager.refreshToken(oidcProvider, token.refreshToken);

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      idToken: refreshedTokens.id_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      expiresAt: refreshedTokens.expires_at ? refreshedTokens.expires_at * 1000 : Date.now() + 3600000,
    };
  } catch {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * Gets the current OIDC configuration
 */
export async function getCurrentOIDCConfig(): Promise<OIDCProviderConfig | null> {
  const oidcSetup = await getOIDCProvider();
  return oidcSetup?.config || null;
}

/**
 * Validates if OIDC is properly configured
 */
export async function isOIDCConfigured(): Promise<boolean> {
  try {
    const config = getOIDCConfigFromEnv();
    if (!config) return false;
    
    const oidcProvider = await oidcProviderManager.createProvider(config);
    return !!oidcProvider;
  } catch {
    return false;
  }
}
