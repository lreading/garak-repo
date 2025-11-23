/**
 * OIDC Configuration Status API
 * 
 * This endpoint provides information about the current OIDC configuration
 * and whether it's properly set up.
 */

import { NextResponse } from 'next/server';
import { getOIDCConfigFromEnv, validateOIDCConfig } from '@/lib/oidc-config';
import { isOIDCConfigured } from '@/lib/auth';
import { isOIDCEnabled } from '@/lib/config';

// Force dynamic rendering to ensure runtime environment variables are read
export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/auth/config:
 *   get:
 *     summary: Get OIDC authentication configuration status
 *     description: Check the current OIDC configuration and whether authentication is properly set up
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OIDC configuration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 oidcEnabled:
 *                   type: boolean
 *                   description: Whether OIDC authentication is enabled
 *                 configured:
 *                   type: boolean
 *                   description: Whether OIDC is properly configured
 *                 message:
 *                   type: string
 *                   description: Status message
 *                 config:
 *                   type: object
 *                   description: OIDC configuration details (when enabled)
 *                   properties:
 *                     name:
 *                       type: string
 *                     issuer:
 *                       type: string
 *                     clientId:
 *                       type: string
 *                       description: Masked client ID
 *                     scopes:
 *                       type: string
 *                     usePKCE:
 *                       type: boolean
 *                     useNonce:
 *                       type: boolean
 *                     useState:
 *                       type: boolean
 *                     maxAge:
 *                       type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: OIDC configuration error
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     required:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of required environment variables
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    const oidcEnabled = isOIDCEnabled();
    const config = getOIDCConfigFromEnv();
    const isConfigured = await isOIDCConfigured();
    
    // If OIDC is disabled, return that information
    if (!oidcEnabled) {
      return NextResponse.json({
        oidcEnabled: false,
        configured: false,
        message: 'OIDC authentication is disabled',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!config) {
      return NextResponse.json({
        oidcEnabled: true,
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
        oidcEnabled: true,
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
      oidcEnabled: true,
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
      oidcEnabled: true, // Default to enabled on error
      configured: false,
      error: 'Failed to check OIDC configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
