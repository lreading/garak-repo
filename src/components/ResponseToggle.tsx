'use client';

import { useState } from 'react';
import { apiJson } from '@/lib/api-client';

interface ResponseToggleProps {
  attemptUuid: string;
  responseIndex: number;
  detectorName: string;
  currentScore: number;
  filename: string;
  onToggle: (newScore: number) => void;
}

export function ResponseToggle({ 
  attemptUuid, 
  responseIndex, 
  detectorName, 
  currentScore, 
  filename,
  onToggle 
}: ResponseToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    const newScore = currentScore > 0.5 ? 0 : 1;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiJson<{ success: boolean; error?: string; message?: string }>('/api/garak-report-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          attemptUuid,
          responseIndex,
          detectorName,
          newScore
        })
      });
      
      // Only update if the API call was successful
      if (response.success) {
        onToggle(newScore);
      } else {
        setError(response.error || 'Failed to update score');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update score');
    } finally {
      setIsLoading(false);
    }
  };

  const isVulnerable = currentScore > 0.5;

  return (
    <div className="flex items-center space-x-2">
      {error && (
        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </span>
      )}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${isVulnerable ? 'bg-red-600' : 'bg-gray-200'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={`Toggle vulnerability (currently ${isVulnerable ? 'vulnerable' : 'safe'})`}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isVulnerable ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <span className="text-xs text-gray-500">
        {isVulnerable ? 'Vulnerable' : 'Safe'}
      </span>
      {isLoading && (
        <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
      )}
    </div>
  );
}
