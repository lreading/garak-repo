/**
 * Authentication Provider Component
 * 
 * This component provides authentication context and session management
 * for the Garak Report Dashboard with OIDC integration.
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
