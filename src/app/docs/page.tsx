'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

// Force dynamic rendering - this page fetches data at runtime
export const dynamic = 'force-dynamic';

export default function DocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/docs');
        if (!response.ok) {
          throw new Error(`Failed to fetch API spec: ${response.status}`);
        }
        
        const apiSpec = await response.json();
        setSpec(apiSpec);
      } catch (err) {
        console.error('Failed to load API documentation:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/docs?refresh=true');
      if (!response.ok) {
        throw new Error(`Failed to refresh API spec: ${response.status}`);
      }
      
      const apiSpec = await response.json();
      setSpec(apiSpec);
    } catch (err) {
      console.error('Failed to refresh API documentation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Documentation Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 text-white py-4 px-6 border-b">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">Garak Repo API Documentation</h1>
            <p className="text-gray-300 text-sm mt-1">
              {/* @ts-expect-error - spec.info may not exist after optional chaining check */}
              Interactive API documentation • Generated at {spec?.info?.generatedAt ? new Date(spec.info.generatedAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* @ts-expect-error - TypeScript can't infer type of spec.info after optional chaining */}
            {spec?.info?.['x-discovered-routes'] && (
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                {/* @ts-expect-error - spec.info may not exist after optional chaining check */}
                {spec.info['x-discovered-routes']} endpoints discovered
              </span>
            )}
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Refresh Docs
            </button>
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="swagger-container">
        <SwaggerUI
          spec={spec ?? undefined}
          docExpansion="list"
          defaultModelsExpandDepth={2}
          defaultModelExpandDepth={2}
          displayRequestDuration={true}
          tryItOutEnabled={true}
          filter={true}
          showExtensions={true}
          showCommonExtensions={true}
        />
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        .swagger-container {
          max-width: none;
        }
        
        .swagger-ui .topbar {
          display: none;
        }
        
        .swagger-ui .info {
          margin: 20px 0;
        }
        
        .swagger-ui .scheme-container {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }
        
        .swagger-ui .btn.authorize {
          background-color: #28a745;
          border-color: #28a745;
        }
        
        .swagger-ui .btn.authorize:hover {
          background-color: #218838;
          border-color: #1e7e34;
        }
      `}</style>
    </div>
  );
}
