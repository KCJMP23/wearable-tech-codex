'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface Comparable {
  site: string;
  niche: string;
  sold_price: number;
  multiple: number;
  date: string;
}

interface ComparablesListProps {
  comparables: Comparable[];
}

export function ComparablesList({ comparables }: ComparablesListProps) {
  if (!comparables || comparables.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comparable sites available in the database.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Comparable Site Sales</h3>
      <p className="text-sm text-gray-600 mb-6">
        Recent sales of similar sites in the market, adjusted for size and niche.
      </p>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Site / Niche
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sale Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Multiple
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sale Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comparables.map((comp, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{comp.site}</div>
                    <div className="text-sm text-gray-500">{comp.niche}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(comp.sold_price)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {comp.multiple.toFixed(1)}x
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(comp.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short' 
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These comparables are based on verified sales data from major marketplaces.
          Your site's unique characteristics may justify a higher or lower multiple.
        </p>
      </div>
    </div>
  );
}