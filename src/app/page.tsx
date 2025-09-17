'use client';

import { ReportSelector } from '@/components/ReportSelector';
import { LoginButton } from '@/components/LoginButton';
import { UserProfile } from '@/components/UserProfile';
import { useSession } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Garak Report Dashboard
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              A comprehensive repository and analysis tool for storing, organizing, and analyzing Garak security testing reports
            </p>
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Sign In Required
              </h2>
              <p className="text-gray-600 mb-6">
                Please sign in with your OIDC provider to access the dashboard and view security testing reports.
              </p>
              <LoginButton className="w-full">
                Sign In to Continue
              </LoginButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Garak Report Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome back!
              </p>
            </div>
            <UserProfile className="max-w-sm" />
          </div>
        </div>
        <ReportSelector />
      </div>
    </div>
  );
}
