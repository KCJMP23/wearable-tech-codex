'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { Address } from '@affiliate-factory/blockchain/types';

interface AffiliateStats {
  affiliate: Address;
  stats: {
    totalEarned: string;
    totalClicks: string;
    totalConversions: string;
    conversionRate: number;
    averageCommission: string;
  };
  pendingCommissions: Array<{
    token: Address;
    amount: string;
    formattedAmount: string;
    conversionCount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    transactionHash: string | null;
    type: string;
    status: string;
    amount: string | null;
    formattedAmount: string | null;
    createdAt: string;
    confirmedAt: string | null;
  }>;
}

interface AffiliateStatsWidgetProps {
  tenantId: string;
  affiliateAddress?: Address;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function AffiliateStatsWidget({
  tenantId,
  affiliateAddress,
  autoRefresh = true,
  refreshInterval = 60000,
  className = '',
}: AffiliateStatsWidgetProps) {
  const { address: connectedAddress } = useAccount();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveAddress = affiliateAddress || connectedAddress;

  const fetchStats = useCallback(async () => {
    if (!tenantId || !effectiveAddress) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        tenantId,
        affiliate: effectiveAddress,
      });

      const response = await fetch(`/api/blockchain/affiliate-stats?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch affiliate stats');
      }

      setStats(data);
    } catch (err) {
      console.error('Error fetching affiliate stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [tenantId, effectiveAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStats]);

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num === 0) return '0';
    if (num < 0.001) return '<0.001';
    return num.toFixed(6);
  };

  if (!effectiveAddress) {
    return (
      <div className={`affiliate-stats-widget ${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connect Wallet
            </h3>
            <p className="text-gray-600">
              Connect your wallet to view affiliate statistics and earnings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`affiliate-stats-widget ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Stats</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchStats}
                className="mt-2 text-sm text-red-800 hover:text-red-700 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`affiliate-stats-widget ${className}`}>
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Affiliate Statistics
            </h3>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="px-6 py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading affiliate statistics...</p>
          </div>
        ) : stats ? (
          <div className="p-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-700">Total Earned</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(stats.stats.totalEarned)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-700">Total Clicks</p>
                    <p className="text-2xl font-bold text-green-900">
                      {parseInt(stats.stats.totalClicks).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-700">Conversions</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {parseInt(stats.stats.totalConversions).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-700">Conversion Rate</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatPercentage(stats.stats.conversionRate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Commissions */}
            {stats.pendingCommissions.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Pending Commissions</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="space-y-3">
                    {stats.pendingCommissions.map((commission, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {commission.formattedAmount}
                          </p>
                          <p className="text-xs text-gray-500">
                            Token: {commission.token.slice(0, 8)}...{commission.token.slice(-6)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-700">
                            {commission.conversionCount} conversion{commission.conversionCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-yellow-300">
                    <p className="text-sm text-yellow-800">
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      These commissions are pending blockchain confirmation and will be automatically paid once confirmed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h4>
              {stats.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'click' ? 'bg-blue-100 text-blue-800' :
                          transaction.type === 'conversion' ? 'bg-purple-100 text-purple-800' :
                          transaction.type === 'commission' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.type}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.transactionHash ? 
                              `${transaction.transactionHash.slice(0, 10)}...${transaction.transactionHash.slice(-8)}` :
                              'Processing...'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {transaction.formattedAmount && (
                          <span className="text-sm font-medium text-gray-900">
                            {transaction.formattedAmount}
                          </span>
                        )}
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start promoting products to see your affiliate activity here.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Auto-refresh indicator */}
        {autoRefresh && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-refresh enabled</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AffiliateStatsWidget;