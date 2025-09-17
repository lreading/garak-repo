/**
 * Login Button Component
 * 
 * This component provides a login button that initiates OIDC authentication
 * with the configured provider.
 */

'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LoginButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LoginButton({ className = '', children }: LoginButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signIn('oidc', { 
        callbackUrl: '/',
        redirect: false 
      });
      
      if (result?.url) {
        router.push(result.url);
      } else if (result?.error) {
        router.push('/auth/error?error=LoginFailed');
      }
    } catch (error) {
      router.push('/auth/error?error=LoginError');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <button
        disabled
        className={`px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed ${className}`}
      >
        Loading...
      </button>
    );
  }

  if (session) {
    return null; // Don't show login button if already authenticated
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Signing in...' : (children || 'Sign In')}
    </button>
  );
}
