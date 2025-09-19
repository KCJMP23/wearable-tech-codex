'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { Address, Hash } from '@affiliate-factory/blockchain/types';

interface Transaction {
  id: string;
  transactionHash: Hash | null;
  type: string;
  userWallet: Address | null;
  amount: string | null;
  formattedAmount: string | null;
  tokenAddress: Address | null;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber: string | null;
  gasUsed: number | null;
  gasPrice: string | null;
  metadata: any;
  createdAt: string;
  confirmedAt: string | null;
}

interface TransactionMonitorProps {
  tenantId: string;
  affiliateAddress?: Address;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function TransactionMonitor({
  tenantId,
  affiliateAddress,
  autoRefresh = true,
  refreshInterval = 30000,
  className = '',
}: TransactionMonitorProps) {
  const { address: connectedAddress } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    type: string;
    status: string;
  }>({
    type: 'all',
    status: 'all',
  });

  const effectiveAddress = affiliateAddress || connectedAddress;

  const fetchTransactions = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        tenantId,
        limit: '20',
        ...(filter.type !== 'all' && { type: filter.type }),
        ...(filter.status !== 'all' && { status: filter.status }),
      });

      const response = await fetch(`/api/blockchain/transactions?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      // Filter by affiliate address if specified
      let filteredTransactions = data.transactions;
      if (effectiveAddress) {
        filteredTransactions = data.transactions.filter(
          (tx: Transaction) => tx.userWallet?.toLowerCase() === effectiveAddress?.toLowerCase()
        );
      }

      setTransactions(filteredTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [tenantId, effectiveAddress, filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchTransactions, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTransactions]);

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'confirmed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeBadge = (type: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (type) {
      case 'click':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'conversion':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'commission':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'reward':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getExplorerUrl = (hash: string, chainId: number) => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      137: 'https://polygonscan.com',
      80001: 'https://mumbai.polygonscan.com',
      11155111: 'https://sepolia.etherscan.io',
    };
    
    const baseUrl = explorers[chainId] || 'https://etherscan.io';
    return `${baseUrl}/tx/${hash}`;
  };

  if (error) {
    return (
      <div className={`transaction-monitor ${className}`}>
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
              <h3 className="text-sm font-medium text-red-800">Error Loading Transactions</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchTransactions}
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
    <div className={`transaction-monitor ${className}`}>
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Blockchain Transactions
            </h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchTransactions}
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

          {/* Filters */}
          <div className="mt-4 flex space-x-4">
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="type-filter"
                value={filter.type}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Types</option>
                <option value="click">Clicks</option>
                <option value="conversion">Conversions</option>
                <option value="commission">Commissions</option>
                <option value="reward">Rewards</option>
              </select>
            </div>
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status-filter"
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-gray-200">
          {loading && transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">
                Transactions will appear here once you start participating in the affiliate program.
              </p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={getTypeBadge(transaction.type)}>
                        {transaction.type}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.transactionHash ? (
                            <a
                              href={getExplorerUrl(transaction.transactionHash, 137)} // Default to Polygon
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600"
                            >
                              {`${transaction.transactionHash.slice(0, 10)}...${transaction.transactionHash.slice(-8)}`}
                            </a>
                          ) : (
                            'No hash'
                          )}
                        </p>
                        {transaction.transactionHash && (
                          <button
                            onClick={() => transaction.transactionHash && navigator.clipboard.writeText(transaction.transactionHash)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy transaction hash"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                        {transaction.confirmedAt && (
                          <span> • Confirmed {formatDate(transaction.confirmedAt)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {transaction.formattedAmount && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.formattedAmount}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.tokenAddress ? 
                            `${transaction.tokenAddress.slice(0, 6)}...${transaction.tokenAddress.slice(-4)}` : 
                            'ETH/MATIC'
                          }
                        </p>
                      </div>
                    )}
                    <div className={getStatusBadge(transaction.status)}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
                
                {/* Additional Details */}
                {(transaction.blockNumber || transaction.gasUsed) && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                      {transaction.blockNumber && (
                        <span>Block: {transaction.blockNumber}</span>
                      )}
                      {transaction.gasUsed && (
                        <span>Gas Used: {transaction.gasUsed.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {transactions.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {transactions.length} transactions
              </p>
              <div className="flex items-center space-x-2">
                {autoRefresh && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Auto-refresh enabled</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionMonitor;