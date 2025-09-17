'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { GarakDashboard } from '@/components/GarakDashboard';
import { UserProfile } from '@/components/UserProfile';
import { GarakReportMetadata } from '@/lib/garak-parser';

function DashboardContent() {
  const [reportData, setReportData] = useState<GarakReportMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const reportFilename = searchParams.get('report');

  useEffect(() => {
    const abortController = new AbortController();
    
    // Reset state when report filename changes
    setLoading(true);
    setError(null);
    setReportData(null);
    
    async function loadReportData() {
      if (!reportFilename) {
        setError('No report specified');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/garak-report-metadata?filename=${encodeURIComponent(reportFilename)}`, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error('Failed to load report metadata');
        }
        
        const metadata = await response.json();
        setReportData(metadata);
      } catch (err) {
        // Don't set error if the request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadReportData();
    
    // Cleanup function to abort the request if component unmounts or dependencies change
    return () => {
      abortController.abort();
    };
  }, [reportFilename]);

  // Show loading state while loading or when reportData is null and no error
  if (loading || (!reportData && !error)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {reportFilename 
              ? `Loading report: ${reportFilename}`
              : 'Loading Garak report...'
            }
          </p>
          <p className="mt-2 text-sm text-gray-500">This may take a moment for large reports</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Back to Reports
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This should only show if we have an error but no report data (shouldn't happen with current logic)
  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
          <p className="text-gray-600 mb-4">No Garak report data found.</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Reports
          </button>
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
                Garak Report Analysis
              </h1>
              <p className="text-gray-600 mt-2">
                Analyzing report: {reportFilename}
              </p>
            </div>
            <UserProfile className="max-w-sm" />
          </div>
        </div>
        <GarakDashboard reportData={reportData} filename={reportFilename!} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
