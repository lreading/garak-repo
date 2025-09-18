'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadModal } from './UploadModal';
import { LogoutButton } from './LogoutButton';
import { useAuth } from '@/hooks/useAuth';

interface Report {
  filename: string;
  runId: string;
  size: number;
  startTime: string | null;
  modelName: string | null;
  folderPath?: string;
  isDirectory?: boolean;
  children?: Report[];
}

interface ReportSelectorProps {
  onReportSelect?: (filename: string) => void;
}

type SortField = 'filename' | 'runId' | 'size' | 'startTime';
type SortDirection = 'asc' | 'desc';

export function ReportSelector({ onReportSelect }: ReportSelectorProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { isAuthenticated, isOIDCEnabled } = useAuth();

  const updateReportsState = useCallback((reports: Report[], error: string | null = null) => {
    setReports(reports);
    setError(error);
    setLoading(false);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    // Reload reports to include the newly uploaded file
    setLoading(true);
    
    // Refresh the reports list
    fetch('/api/reports')
      .then(response => response.json())
      .then(data => {
        updateReportsState(data.reports);
      })
      .catch(err => {
        updateReportsState([], err instanceof Error ? err.message : 'Failed to load reports');
      });
  }, [updateReportsState]);

  const handleUploadError = useCallback((error: string) => {
    console.error('Upload error:', error);
    // Error is already displayed in the FileUpload component
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    
    async function loadReports() {
      try {
        const response = await fetch('/api/reports', {
          signal: abortController.signal
        });
        if (!response.ok) {
          throw new Error('Failed to load reports');
        }
        const data = await response.json();
        // Update all state at once to prevent flashing
        updateReportsState(data.reports);
        // Clear expanded folders to start fresh
        setExpandedFolders(new Set());
      } catch (err) {
        // Don't set error if the request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        updateReportsState([], err instanceof Error ? err.message : 'Failed to load reports');
      }
    }

    loadReports();
    
    // Cleanup function to abort the request if component unmounts
    return () => {
      abortController.abort();
    };
  }, [updateReportsState]);

  // Flatten hierarchical structure for display
  const flattenReports = useCallback((items: Report[], level: number = 0, parentExpanded: boolean = true): Array<Report & { level: number; isVisible: boolean }> => {
    const result: Array<Report & { level: number; isVisible: boolean }> = [];
    
    for (const item of items) {
      const isVisible = level === 0 || parentExpanded;
      
      if (item.isDirectory) {
        result.push({ ...item, level, isVisible });
        if (item.children && item.children.length > 0) {
          // Create the same folder ID as used in toggleFolder
          const folderId = item.folderPath ? `${item.folderPath}/${item.filename}` : item.filename;
          const isExpanded = expandedFolders.has(folderId);
          if (isExpanded && isVisible) {
            const children = flattenReports(item.children, level + 1, true);
            result.push(...children);
          }
        }
      } else {
        result.push({ ...item, level, isVisible });
      }
    }
    
    return result;
  }, [expandedFolders]);

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    // First flatten the hierarchical structure
    const flattened = flattenReports(reports);
    
    // Filter visible items
    const visible = flattened.filter(item => item.isVisible);
    
    // Filter by search term
    const filtered = visible.filter(report =>
      report.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.runId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.modelName && report.modelName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // DON'T sort - preserve the order from flattening to maintain hierarchy
    return filtered;
  }, [reports, searchTerm, flattenReports]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredAndSortedReports.slice(startIndex, endIndex);

  const handleReportSelect = (filename: string) => {
    if (onReportSelect) {
      onReportSelect(filename);
    } else {
      // Navigate to dashboard with the selected report
      router.push(`/dashboard?report=${encodeURIComponent(filename)}`);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  };

  const toggleFolder = (folderPath: string, folderName: string) => {
    // Create a unique identifier for the folder
    const folderId = folderPath ? `${folderPath}/${folderName}` : folderName;
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Reports</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
          <p className="text-gray-600">No Garak report files found in the data directory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Garak Repository</h1>
              <p className="mt-2 text-gray-600">
                Select a report to view detailed analysis
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{filteredAndSortedReports.length}</div>
                <div className="text-sm text-gray-600">
                  {searchTerm ? 'Filtered Reports' : 'Available Reports'}
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Upload Report
              </button>
              {isAuthenticated && isOIDCEnabled && (
                <LogoutButton />
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Search and Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search reports by filename or run ID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('filename')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Filename</span>
                      {sortField === 'filename' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('runId')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Run ID</span>
                      {sortField === 'runId' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('size')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Size</span>
                      {sortField === 'size' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('startTime')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Run Started</span>
                      {sortField === 'startTime' && (
                        <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReports.map((report) => (
                  <tr
                    key={`${report.folderPath || ''}-${report.filename}`}
                    className={`hover:bg-gray-50 ${report.isDirectory ? 'cursor-pointer' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (report.isDirectory) {
                        toggleFolder(report.folderPath || '', report.filename);
                      } else {
                        const fullPath = report.folderPath ? `${report.folderPath}/${report.filename}` : report.filename;
                        handleReportSelect(fullPath);
                      }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center" style={{ paddingLeft: `${report.level * 20}px` }}>
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            report.isDirectory 
                              ? 'bg-yellow-100' 
                              : 'bg-blue-100'
                          }`}>
                            {report.isDirectory ? (
                              <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {report.isDirectory ? (
                              <div className="flex items-center">
                                <span>{report.filename}</span>
                                {report.children && report.children.length > 0 && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({report.children.length} items)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <>
                                {report.modelName || report.filename}
                                {report.folderPath && (
                                  <div className="text-xs text-gray-500">
                                    in {report.folderPath}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {report.modelName && !report.isDirectory && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {report.filename}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {report.isDirectory ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          `${report.runId.substring(0, 8)}...`
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.isDirectory ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          formatFileSize(report.size)
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.isDirectory ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          report.startTime ? formatDate(report.startTime) : 'Unknown'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {report.isDirectory ? (
                        <div className="flex items-center text-yellow-600 hover:text-yellow-900">
                          <span>{expandedFolders.has(report.folderPath ? `${report.folderPath}/${report.filename}` : report.filename) ? 'Collapse' : 'Expand'}</span>
                          <svg className={`ml-1 w-4 h-4 transition-transform ${expandedFolders.has(report.folderPath ? `${report.folderPath}/${report.filename}` : report.filename) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="flex items-center text-blue-600 hover:text-blue-900">
                          <span>View</span>
                          <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-md shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredAndSortedReports.length)}</span> of{' '}
                  <span className="font-medium">{filteredAndSortedReports.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {!loading && filteredAndSortedReports.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'No reports found' : 'No reports available'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'No Garak report files found in the data directory.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
    </div>
  );
}
