'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GarakReportData, GarakReportMetadata, TestCategory, CategoryMetadata, getScoreColor, getDefconColor, getDefconLabel, analyzeResponses, GarakAttempt } from '@/lib/garak-parser';
import { CategoryCard } from '@/components/CategoryCard';

interface GarakDashboardProps {
  reportData: GarakReportData | GarakReportMetadata;
  filename: string;
}

export function GarakDashboard({ reportData, filename }: GarakDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | CategoryMetadata | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState<'all' | 'vulnerable' | 'safe'>('all');
  const [categoryAttempts, setCategoryAttempts] = useState<GarakAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const router = useRouter();

  // Function to load attempts for a category
  const loadCategoryAttempts = async (category: TestCategory | CategoryMetadata, page: number = 1, filter: string = 'all') => {
    setAttemptsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('filename', filename);
      searchParams.set('category', category.name);
      searchParams.set('page', page.toString());
      searchParams.set('limit', '20');
      searchParams.set('filter', filter);
      
      const response = await fetch(`/api/garak-report-attempts?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load attempts');
      }
      
      const result = await response.json();
      setCategoryAttempts(result.attempts);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      setHasNextPage(result.hasNextPage);
      setHasPrevPage(result.hasPrevPage);
    } catch (error) {
      console.error('Error loading attempts:', error);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const filteredCategories = reportData.categories.filter(category =>
    category.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVulnerabilities = reportData.categories.reduce((sum, cat) => 
    sum + Math.round((cat.vulnerabilityRate / 100) * cat.totalAttempts), 0
  );

  const overallVulnerabilityRate = reportData.categories.length > 0 
    ? reportData.categories.reduce((sum, cat) => sum + cat.vulnerabilityRate, 0) / reportData.categories.length
    : 0;


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-1">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Reports
                </button>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900">Garak Repository</h1>
              
              {/* File Path Breadcrumb */}
              <div className="mt-2">
                <nav className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Reports</span>
                  {filename.includes('/') ? (
                    <>
                      {filename.split('/').map((part, index, array) => (
                        <span key={`breadcrumb-${part}-${index}`} className="flex items-center">
                          <svg className="w-3 h-3 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className={index === array.length - 1 ? 'text-gray-900 font-medium' : ''}>
                            {part}
                          </span>
                        </span>
                      ))}
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-gray-900 font-medium">{filename}</span>
                    </>
                  )}
                </nav>
              </div>
            </div>
            
            {/* Metadata on the right */}
            <div className="text-right text-sm text-gray-600 ml-8">
              <div className="space-y-1">
                <div>
                  <span className="font-medium">Run ID:</span> {reportData.runId}
                </div>
                <div>
                  <span className="font-medium">Version:</span> {reportData.garakVersion}
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Started:</span> {new Date(reportData.startTime).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.categories.length}</div>
                <div className="text-sm text-gray-600">Test Categories</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{totalVulnerabilities}</div>
                <div className="text-sm text-gray-600">Vulnerabilities Found</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{overallVulnerabilityRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Overall % Vulnerable</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.categories.reduce((sum, cat) => sum + cat.totalAttempts, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Attempts</div>
              </div>
            </div>
          </div>

        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search test categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.name}
              category={category}
              onClick={() => {
                setSelectedCategory(category);
                setCurrentPage(1);
                setVulnerabilityFilter('all');
                loadCategoryAttempts(category, 1, 'all');
              }}
            />
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
          </div>
        )}
      </div>

      {/* Category Detail Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedCategory.displayName}
                  </h3>
                  {selectedCategory.groupLink && (
                    <a
                      href={selectedCategory.groupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-green-600 hover:text-green-800 transition-colors"
                    >
                      <svg className="mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>View Documentation</span>
                    </a>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setVulnerabilityFilter('all');
                    setCategoryAttempts([]);
                    setCurrentPage(1);
                    setTotalPages(0);
                    setTotalCount(0);
                    setHasNextPage(false);
                    setHasPrevPage(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{selectedCategory.totalAttempts}</div>
                  <div className="text-sm text-gray-600">Total Attempts</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{selectedCategory.averageScore.toFixed(3)}</div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{selectedCategory.maxScore.toFixed(3)}</div>
                  <div className="text-sm text-gray-600">Max Score</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedCategory.vulnerabilityRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">% Vulnerable</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getDefconColor(selectedCategory.defconGrade)}`}>
                      {getDefconLabel(selectedCategory.defconGrade)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Z-Score: {selectedCategory.zScore.toFixed(2)}</div>
                </div>
              </div>

              {/* Vulnerability Filter */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Filter by vulnerability:</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setVulnerabilityFilter('all');
                        setCurrentPage(1);
                        loadCategoryAttempts(selectedCategory, 1, 'all');
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        vulnerabilityFilter === 'all'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All ({selectedCategory.totalAttempts})
                    </button>
                    <button
                      onClick={() => {
                        setVulnerabilityFilter('vulnerable');
                        setCurrentPage(1);
                        loadCategoryAttempts(selectedCategory, 1, 'vulnerable');
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        vulnerabilityFilter === 'vulnerable'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Vulnerable ({Math.round((selectedCategory.vulnerabilityRate / 100) * selectedCategory.totalAttempts)})
                    </button>
                    <button
                      onClick={() => {
                        setVulnerabilityFilter('safe');
                        setCurrentPage(1);
                        loadCategoryAttempts(selectedCategory, 1, 'safe');
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        vulnerabilityFilter === 'safe'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Safe ({selectedCategory.totalAttempts - Math.round((selectedCategory.vulnerabilityRate / 100) * selectedCategory.totalAttempts)})
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtered Results Summary */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-blue-900">
                      Showing {categoryAttempts.length} of {totalCount} attempts
                    </span>
                    {vulnerabilityFilter !== 'all' && (
                      <span className="text-sm text-blue-700 ml-2">
                        (filtered by {vulnerabilityFilter})
                      </span>
                    )}
                    <span className="text-sm text-blue-700 ml-2">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">
                    {categoryAttempts.filter(attempt => 
                      Object.values(attempt.detector_results || {}).some(scores => 
                        Array.isArray(scores) && scores.some(score => score > 0.5)
                      )
                    ).length} vulnerable attempts in this view
                  </div>
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (hasPrevPage) {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        loadCategoryAttempts(selectedCategory, newPage, vulnerabilityFilter);
                      }
                    }}
                    disabled={!hasPrevPage}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      hasPrevPage
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      if (hasNextPage) {
                        const newPage = currentPage + 1;
                        setCurrentPage(newPage);
                        loadCategoryAttempts(selectedCategory, newPage, vulnerabilityFilter);
                      }
                    }}
                    disabled={!hasNextPage}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      hasNextPage
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {totalCount} total attempts
                </div>
              </div>

              {/* Loading State */}
              {attemptsLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading attempts...</p>
                </div>
              )}

              {/* Attempts List */}
              {!attemptsLoading && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {categoryAttempts.map((attempt) => (
                  <div key={attempt.uuid} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">Attempt #{attempt.seq}</h4>
                        <span className="text-xs text-gray-500">UUID: {attempt.uuid}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          attempt.status === 2 
                            ? 'bg-green-100 text-green-800' 
                            : attempt.status === 1
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {attempt.status === 2 ? 'Evaluated' : attempt.status === 1 ? 'Responded' : 'Not Sent'}
                        </span>
                        <span className="text-xs text-gray-500">Status: {attempt.status}</span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Prompt:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {attempt.prompt.turns[0]?.content.text || 'No prompt text'}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Goal:</div>
                      <div className="text-sm text-gray-600">{attempt.goal}</div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Detector Results:</div>
                      <div className="space-y-2">
                        {Object.entries(attempt.detector_results).map(([detector, scores]) => {
                          const maxScore = Math.max(...scores);
                          const hasVulnerability = maxScore > 0.5;
                          return (
                            <div key={detector} className="bg-gray-50 rounded p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700">{detector}</span>
                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                  hasVulnerability ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {hasVulnerability ? 'VULNERABLE' : 'SAFE'}
                                </span>
                              </div>
                              <div className="flex space-x-1">
                                {scores.map((score, i) => (
                                  <span
                                    key={`${attempt.uuid}-${detector}-score-${i}`}
                                    className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(score)}`}
                                    title={`Generation ${i + 1}: ${score.toFixed(3)}`}
                                  >
                                    {score.toFixed(3)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Responses:</div>
                      {(() => {
                        const responses = analyzeResponses(attempt);
                        const vulnerableResponses = responses.filter(r => r.isVulnerable);
                        
                        return (
                          <div>
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">
                                {responses.length} responses • {vulnerableResponses.length} vulnerable
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {responses.map((response, index) => (
                                <div
                                  key={`${attempt.uuid}-response-${index}`}
                                  className={`p-2 rounded text-sm ${
                                    response.isVulnerable
                                      ? 'bg-red-50 border border-red-200'
                                      : 'bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-600">
                                      Response {index + 1}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      {response.isVulnerable && (
                                        <span className="text-xs font-medium text-red-800 bg-red-100 px-2 py-1 rounded">
                                          VULNERABLE
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">
                                        Max Score: {response.maxScore.toFixed(3)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-gray-700 max-h-16 overflow-y-auto">
                                    {response.text}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
