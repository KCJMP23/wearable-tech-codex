'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { TrendingUpIcon, ClockIcon, StarIcon } from '@heroicons/react/outline';

interface Improvement {
  action: string;
  potential_increase: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
}

interface ImprovementRecommendationsProps {
  improvements: Improvement[];
}

export function ImprovementRecommendations({ improvements }: ImprovementRecommendationsProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      default:
        return 1;
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Value Enhancement Opportunities</h3>
      <p className="text-sm text-gray-600 mb-6">
        Strategic actions to increase your site's valuation, sorted by potential impact.
      </p>
      
      <div className="space-y-4">
        {improvements.map((improvement, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-base font-medium text-gray-900 mb-2">
                  {improvement.action}
                </h4>
                
                <div className="flex items-center space-x-4 text-sm">
                  {/* Potential Value Increase */}
                  <div className="flex items-center text-green-600">
                    <TrendingUpIcon className="h-4 w-4 mr-1" />
                    <span className="font-medium">
                      +{formatCurrency(improvement.potential_increase)}
                    </span>
                  </div>
                  
                  {/* Timeframe */}
                  <div className="flex items-center text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span>{improvement.timeframe}</span>
                  </div>
                  
                  {/* Difficulty */}
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(improvement.difficulty)}`}>
                    <div className="flex items-center">
                      {[...Array(getDifficultyStars(improvement.difficulty))].map((_, i) => (
                        <StarIcon key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                    <span className="ml-1 capitalize">{improvement.difficulty}</span>
                  </div>
                </div>
              </div>
              
              {/* Priority Badge */}
              {index === 0 && (
                <span className="ml-4 px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full">
                  Top Priority
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* ROI Summary */}
      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
        <h4 className="text-sm font-medium text-indigo-900 mb-2">Total Value Opportunity</h4>
        <div className="text-2xl font-bold text-indigo-900">
          {formatCurrency(improvements.reduce((sum, imp) => sum + imp.potential_increase, 0))}
        </div>
        <p className="text-sm text-indigo-700 mt-2">
          Implementing all recommendations could increase your site's value by this amount.
        </p>
      </div>
    </div>
  );
}