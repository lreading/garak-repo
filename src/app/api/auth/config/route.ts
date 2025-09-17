/**
 * OIDC Configuration Status API
 * 
 * This endpoint provides information about the current OIDC configuration
 * and whether it's properly set up.
 */

import { NextResponse } from 'next/server';
import { getOIDCConfigFromEnv, validateOIDCConfig } from '@/lib/oidc-config';
import { isOIDCConfigured } from '@/lib/auth';

export async function GET() {
  try {
    const config = getOIDCConfigFromEnv();
    const isConfigured = await isOIDCConfigured();
    
    if (!config) {
      return NextResponse.json({
        configured: false,
        error: 'OIDC configuration not found in environment variables',
        required: [
          'OIDC_ISSUER',
          'OIDC_CLIENT_ID',
          'OIDC_CLIENT_SECRET'
        ],
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const validation = validateOIDCConfig(config);
    
    if (!validation.isValid) {
      return NextResponse.json({
        configured: false,
        error: 'OIDC configuration is invalid',
        errors: validation.errors,
        config: {
          name: config.name,
          issuer: config.issuer,
          clientId: config.clientId ? '***' : undefined,
          scopes: config.scopes
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      configured: isConfigured,
      config: {
        name: config.name,
        issuer: config.issuer,
        clientId: config.clientId ? '***' : undefined,
        scopes: config.scopes,
        usePKCE: config.usePKCE,
        useNonce: config.nonce,
        useState: config.state,
        maxAge: config.maxAge
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: 'Failed to check OIDC configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
