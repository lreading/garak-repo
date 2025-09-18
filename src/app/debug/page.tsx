/**
 * Debug Page
 * 
 * This page helps debug OIDC configuration issues without requiring authentication.
 */

'use client';

import { useState, useEffect } from 'react';

interface ConfigStatus {
  configured: boolean;
  error?: string;
  config?: {
    name: string;
    issuer: string;
    clientId: string;
    scopes?: string[];
    usePKCE: boolean;
    maxAge: number;
  };
  errors?: string[];
}

export default function DebugPage() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkConfig() {
      try {
        const response = await fetch('/api/auth/config');
        const data = await response.json();
        setConfigStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    checkConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">OIDC Configuration Debug</h1>
          
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          {configStatus ? (
            <div className="space-y-6">
              <div className={`p-4 rounded-md ${configStatus.configured ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`text-sm font-medium ${configStatus.configured ? 'text-green-800' : 'text-red-800'}`}>
                  Configuration Status: {configStatus.configured ? 'Configured' : 'Not Configured'}
                </h3>
                {configStatus.error ? (
                  <p className="mt-1 text-sm text-red-700">{configStatus.error}</p>
                ) : null}
              </div>

              {configStatus.config ? (
                <div className="bg-gray-50 rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">Configuration Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Provider Name:</span>
                      <span className="ml-2 text-gray-900">{configStatus.config.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Issuer:</span>
                      <span className="ml-2 text-gray-900">{configStatus.config.issuer}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Client ID:</span>
                      <span className="ml-2 text-gray-900">{configStatus.config.clientId}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Scopes:</span>
                      <span className="ml-2 text-gray-900">{configStatus.config.scopes?.join(', ')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">PKCE:</span>
                      <span className="ml-2 text-gray-900">{configStatus.config.usePKCE ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Max Age:</span>
                      <span className="ml-2 text-gray-900">{configStatus.config.maxAge} seconds</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {configStatus.errors && Array.isArray(configStatus.errors) && configStatus.errors.length > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Configuration Errors</h3>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {configStatus.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Environment Variables</h3>
                <div className="text-sm text-blue-700">
                  <p>Make sure these environment variables are set in your .env file:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>OIDC_ISSUER</li>
                    <li>OIDC_CLIENT_ID</li>
                    <li>OIDC_CLIENT_SECRET</li>
                    <li>NEXTAUTH_URL</li>
                    <li>NEXTAUTH_SECRET</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex space-x-4">
            <a
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Home
            </a>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
