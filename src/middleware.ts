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

// Helper function to check if a path matches exactly or is a subpath of a public route
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/error',
    '/debug',
    '/api/health',
    '/api/auth/config',
    '/api/auth/redirect-uri',
  ];

  // Exact matches
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // Check for NextAuth API routes (these start with /api/auth/ but not /api/auth/config or /api/auth/redirect-uri)
  if (pathname.startsWith('/api/auth/') && 
      !pathname.startsWith('/api/auth/config') && 
      !pathname.startsWith('/api/auth/redirect-uri')) {
    return true;
  }

  return false;
}

// Helper function to check if a path is an API route
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Check if OIDC is disabled - if so, allow all access
    const oidcEnabled = isOIDCEnabled();
    
    if (!oidcEnabled) {
      return NextResponse.next();
    }

    // Allow access to public routes
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // Check if user is authenticated - this is the critical check
    if (!token) {
      // For API routes, return 401 instead of redirecting
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // For page routes, redirect to signin
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check if token has expired
    if (token.expiresAt && typeof token.expiresAt === 'number' && Date.now() > token.expiresAt) {
      
      // For API routes, return 401 instead of redirecting
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: 'Authentication token expired' },
          { status: 401 }
        );
      }
      
      // For page routes, redirect to signin
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req }) => {
        const { pathname } = req.nextUrl;
        
        // Check if OIDC is disabled - if so, allow all access
        const oidcEnabled = isOIDCEnabled();
        
        if (!oidcEnabled) {
          return true;
        }
        
        // Allow access to public routes
        if (isPublicRoute(pathname)) {
          return true;
        }

        // For protected routes, always return true and let the main middleware function handle the auth check
        // This ensures the main middleware function is always called
        return true;
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
