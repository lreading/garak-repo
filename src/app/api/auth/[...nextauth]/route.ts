/**
 * NextAuth API Route Handler
 * 
 * This route handles all NextAuth.js authentication requests including
 * OIDC provider integration with automated service discovery.
 */

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/{...nextauth}:
 *   get:
 *     summary: NextAuth.js authentication endpoints
 *     description: Handles all NextAuth.js authentication requests including OIDC provider integration
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: nextauth
 *         required: true
 *         schema:
 *           type: string
 *         description: NextAuth.js dynamic route segments (signin, signout, callback, etc.)
 *     responses:
 *       200:
 *         description: Authentication response (varies by endpoint)
 *       302:
 *         description: Redirect response for authentication flow
 *   post:
 *     summary: NextAuth.js authentication endpoints (POST)
 *     description: Handles POST requests for NextAuth.js authentication
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: nextauth
 *         required: true
 *         schema:
 *           type: string
 *         description: NextAuth.js dynamic route segments
 *     responses:
 *       200:
 *         description: Authentication response
 *       302:
 *         description: Redirect response for authentication flow
 */
const handler = NextAuth(await getAuthOptions());

export { handler as GET, handler as POST };
