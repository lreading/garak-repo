/**
 * NextAuth API Route Handler
 * 
 * This route handles all NextAuth.js authentication requests including
 * OIDC provider integration with automated service discovery.
 */

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

const handler = NextAuth(await getAuthOptions());

export { handler as GET, handler as POST };
