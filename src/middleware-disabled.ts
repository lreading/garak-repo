/**
 * Disabled Middleware for Testing
 * 
 * Rename this to middleware.ts to temporarily disable authentication
 */

import { NextResponse } from 'next/server';

export function middleware() {
  // Allow all requests to pass through without authentication
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
