/**
 * Redirect URI Information API
 * 
 * This endpoint shows what redirect URI should be configured in your OIDC provider.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/callback/oidc`;
  
  return NextResponse.json({
    redirectUri,
    baseUrl,
    instructions: {
      okta: [
        '1. Log into your Okta Admin Console',
        '2. Go to Applications > Applications',
        '3. Find your application and click on it',
        '4. Go to the "General" tab',
        '5. In the "Login" section, add the following redirect URI:',
        `   ${redirectUri}`,
        '6. Save the changes'
      ],
      google: [
        '1. Go to Google Cloud Console',
        '2. Navigate to APIs & Services > Credentials',
        '3. Click on your OAuth 2.0 Client ID',
        '4. Add the following to "Authorized redirect URIs":',
        `   ${redirectUri}`,
        '5. Save the changes'
      ],
      azure: [
        '1. Go to Azure Portal',
        '2. Navigate to Azure Active Directory > App registrations',
        '3. Click on your application',
        '4. Go to Authentication',
        '5. Add the following redirect URI:',
        `   ${redirectUri}`,
        '6. Save the changes'
      ]
    },
    timestamp: new Date().toISOString()
  });
}
