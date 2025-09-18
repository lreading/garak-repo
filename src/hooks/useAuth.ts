/**
 * Custom authentication hook that handles both OIDC and no-auth modes
 */

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
// Removed unused import

export function useAuth() {
  const { data: session, status } = useSession();
  const [oidcEnabled, setOidcEnabled] = useState<boolean | null>(null);

  // Check OIDC enabled status on client side only
  useEffect(() => {
    // Only check on client side to avoid hydration mismatch
    const checkOIDCEnabled = async () => {
      try {
        // Use regular fetch instead of apiJson to avoid potential circular issues
        const response = await fetch('/api/auth/config');
        if (response.ok) {
          const config = await response.json();
          setOidcEnabled(config.oidcEnabled);
        } else {
          // If we can't get the config, default to disabled to avoid redirects
          setOidcEnabled(false);
        }
      } catch {
        // Default to disabled if we can't check to avoid redirects
        setOidcEnabled(false);
      }
    };
    
    checkOIDCEnabled();
  }, []);

  // During initial render (server-side or before client check), use normal session
  if (oidcEnabled === null) {
    return {
      data: session,
      status,
      isAuthenticated: !!session,
      isOIDCEnabled: true, // Default to true during initial render
    };
  }

  // If OIDC is disabled, we're always "authenticated" with anonymous user
  if (!oidcEnabled) {
    return {
      data: {
        user: {
          id: 'anonymous',
          name: 'Anonymous User',
          email: 'anonymous@localhost',
          image: null,
        },
      },
      status: 'authenticated' as const,
      isAuthenticated: true,
      isOIDCEnabled: false,
    };
  }

  // If OIDC is enabled, use the normal session
  return {
    data: session,
    status,
    isAuthenticated: !!session,
    isOIDCEnabled: true,
  };
}
