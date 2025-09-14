'use client';

import { TestCategory, getScoreColor, getSuccessRateColor, getDefconColor, getDefconLabel } from '@/lib/garak-parser';

interface CategoryCardProps {
  category: TestCategory;
  onClick: () => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const vulnerabilityCount = category.attempts.filter(attempt => 
    Object.values(attempt.detector_results).some(scores => 
      scores.some(score => score > 0.5)
    )
  ).length;

  const vulnerabilityRate = category.vulnerabilityRate;

  return (
    <div 
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {category.displayName}
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDefconColor(category.defconGrade)}`}>
              {getDefconLabel(category.defconGrade)}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {category.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{category.totalAttempts}</div>
            <div className="text-xs text-gray-600">Attempts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{vulnerabilityCount}</div>
            <div className="text-xs text-gray-600">Vulnerabilities</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">% Vulnerable</span>
              <span className="text-sm text-gray-600">{vulnerabilityRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-red-500"
                style={{ width: `${Math.min(vulnerabilityRate, 100)}%` }}
              ></div>
            </div>
          </div>


          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Avg Score</span>
              <span className={`text-sm font-medium px-2 py-1 rounded ${getScoreColor(category.averageScore)}`}>
                {category.averageScore.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Max: {category.maxScore.toFixed(3)}</span>
            <span>Min: {category.minScore.toFixed(3)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Z-Score:</span>
            <span className={`font-medium ${category.zScore <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {category.zScore.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center text-sm text-blue-600 hover:text-blue-800">
            <span>View Details</span>
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
