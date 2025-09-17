/**
 * User Profile Component
 * 
 * This component displays user information from the OIDC session
 * including name, email, groups, and roles.
 */

'use client';

import { useSession } from 'next-auth/react';
import { LogoutButton } from './LogoutButton';

interface UserProfileProps {
  className?: string;
  showLogout?: boolean;
}

export function UserProfile({ className = '', showLogout = true }: UserProfileProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const oidcSession = session as any; // Cast to access OIDC-specific properties

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center space-x-4">
        {user.image && (
          <img
            src={user.image}
            alt="User"
            className="w-12 h-12 rounded-full"
          />
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {user.email || 'User'}
          </h3>
          <p className="text-sm text-gray-600">Authenticated User</p>
          {oidcSession.provider && (
            <p className="text-xs text-gray-500">
              Provider: {oidcSession.provider}
            </p>
          )}
        </div>
        {showLogout && (
          <LogoutButton className="ml-auto" />
        )}
      </div>
      
      {/* Groups and Roles */}
      {(user.groups?.length || user.roles?.length) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {user.groups?.length && (
            <div className="mb-2">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Groups</h4>
              <div className="flex flex-wrap gap-1">
                {user.groups.map((group, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {user.roles?.length && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Roles</h4>
              <div className="flex flex-wrap gap-1">
                {user.roles.map((role, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
