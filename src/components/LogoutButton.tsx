/**
 * Logout Button Component
 * 
 * This component provides a logout button that terminates the OIDC session
 * and redirects to the sign-in page.
 */

'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
  redirectTo?: string;
}

export function LogoutButton({ 
  className = '', 
  children, 
  redirectTo = '/auth/signin' 
}: LogoutButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      await signOut({ 
        callbackUrl: redirectTo,
        redirect: false 
      });
      
      // Clear any local storage or session data if needed
      localStorage.removeItem('oidc-session');
      
      // Redirect to the specified URL
      router.push(redirectTo);
    } catch (error) {
      // Even if logout fails, redirect to sign-in page
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null; // Don't show logout button if not authenticated
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Signing out...' : (children || 'Sign Out')}
    </button>
  );
}
