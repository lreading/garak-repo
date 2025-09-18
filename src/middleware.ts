/**
 * Authentication Middleware
 * 
 * This middleware protects routes and handles OIDC authentication
 * for the Garak Report Dashboard.
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';
import { isOIDCEnabled } from './lib/config';

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Check if OIDC is disabled - if so, allow all access
    const oidcEnabled = isOIDCEnabled();
    if (!oidcEnabled) {
      // Add default user information to headers for API routes when auth is disabled
      if (pathname.startsWith('/api/')) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', 'anonymous');
        requestHeaders.set('x-user-email', 'anonymous@localhost');
        requestHeaders.set('x-user-groups', JSON.stringify([]));
        requestHeaders.set('x-user-roles', JSON.stringify([]));

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
      return NextResponse.next();
    }

    // Allow access to public routes
    const publicRoutes = [
      '/',
      '/auth/signin',
      '/auth/error',
      '/debug',
      '/api/auth',
      '/api/health',
      '/api/auth/config',
      '/api/auth/redirect-uri',
    ];

    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Check if user is authenticated
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check if token has expired
    if (token.expiresAt && Date.now() > token.expiresAt) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Add user information to headers for API routes
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', token.sub || '');
      requestHeaders.set('x-user-email', token.email || '');
      requestHeaders.set('x-user-groups', JSON.stringify(token.groups || []));
      requestHeaders.set('x-user-roles', JSON.stringify(token.roles || []));

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Check if OIDC is disabled - if so, allow all access
        const oidcEnabled = isOIDCEnabled();
        if (!oidcEnabled) {
          return true;
        }
        
        // Allow access to public routes
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/error',
          '/api/auth',
          '/api/health',
        ];

        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
