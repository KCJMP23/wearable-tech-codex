'use client';

import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationIcon } from '@heroicons/react/outline';

interface ExitReadiness {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface ExitReadinessScoreProps {
  exitReadiness: ExitReadiness;
}

export function ExitReadinessScore({ exitReadiness }: ExitReadinessScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Your site is well-positioned for sale';
    if (score >= 60) return 'Some improvements needed before listing';
    return 'Significant preparation required before selling';
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">Exit Readiness Assessment</h3>
      
      {/* Score Display */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Overall Readiness Score</h4>
            <p className="text-sm text-gray-500 mt-1">{getScoreMessage(exitReadiness.score)}</p>
          </div>
          <div className={`text-4xl font-bold ${getScoreColor(exitReadiness.score)}`}>
            {exitReadiness.score}%
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
            style={{ width: `${exitReadiness.score}%` }}
          />
        </div>
        
        {/* Score Indicators */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Not Ready</span>
          <span>Preparation Needed</span>
          <span>Ready to Sell</span>
        </div>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Strengths */}
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <h4 className="font-medium text-green-900">Strengths</h4>
          </div>
          <ul className="space-y-2">
            {exitReadiness.strengths.map((strength, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span className="text-sm text-green-800">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
            <h4 className="font-medium text-red-900">Areas for Improvement</h4>
          </div>
          <ul className="space-y-2">
            {exitReadiness.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span className="text-sm text-red-800">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ExclamationIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h4 className="font-medium text-blue-900">Action Items for Exit Preparation</h4>
        </div>
        <div className="space-y-3">
          {exitReadiness.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full text-xs font-medium flex items-center justify-center mr-3">
                {index + 1}
              </span>
              <span className="text-sm text-blue-800">{recommendation}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Exit Timeline */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Recommended Exit Timeline</h4>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-32 text-sm text-gray-600">0-2 Months</div>
            <div className="flex-1 text-sm text-gray-800">
              Complete documentation, optimize financials, fix critical issues
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-32 text-sm text-gray-600">2-4 Months</div>
            <div className="flex-1 text-sm text-gray-800">
              Implement growth strategies, diversify revenue, build processes
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-32 text-sm text-gray-600">4-6 Months</div>
            <div className="flex-1 text-sm text-gray-800">
              Stabilize metrics, prepare sales materials, engage broker
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-32 text-sm font-medium text-green-600">6+ Months</div>
            <div className="flex-1 text-sm font-medium text-green-800">
              List for sale with strong metrics and documentation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}