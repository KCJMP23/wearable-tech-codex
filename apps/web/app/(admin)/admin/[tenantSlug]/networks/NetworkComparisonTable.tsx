'use client';

import { useState, useEffect } from 'react';

interface NetworkComparisonTableProps {
  query: string;
  tenantId: string;
  onClose: () => void;
}

interface ComparisonData {
  productName: string;
  networks: {
    networkId: string;
    networkName: string;
    commission: number;
    commissionType: string;
    cookieDuration: number;
    price: number;
    inStock: boolean;
    merchantName: string;
    url: string;
  }[];
}

export function NetworkComparisonTable({ query, tenantId, onClose }: NetworkComparisonTableProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComparisonData | null>(null);

  useEffect(() => {
    fetchComparisonData();
  }, [query]);

  const fetchComparisonData = async () => {
    try {
      const response = await fetch(
        `/api/networks?action=compare&tenantId=${tenantId}&product=${encodeURIComponent(query)}`
      );
      const result = await response.json();
      setData(result.comparisons);
    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBestNetwork = () => {
    if (!data || !data.networks.length) return null;
    return data.networks.reduce((best, current) => 
      current.commission > best.commission ? current : best
    );
  };

  const bestNetwork = getBestNetwork();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-xl p-6 max-w-5xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Commission Comparison</h2>
            <p className="text-sm text-neutral-400 mt-1">Product: {query}</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-neutral-400">Comparing commissions...</div>
          </div>
        ) : data && data.networks.length > 0 ? (
          <>
            {bestNetwork && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-green-500 font-medium">
                  💰 Best Commission: {bestNetwork.networkName} - {bestNetwork.commission}% 
                  ({bestNetwork.commissionType})
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">
                      Network
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">
                      Merchant
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">
                      Price
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">
                      Commission
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">
                      Earnings
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">
                      Cookie
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">
                      Stock
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.networks.map((network) => (
                    <tr 
                      key={network.networkId}
                      className={`border-b border-neutral-800 hover:bg-neutral-800/50 ${
                        network === bestNetwork ? 'bg-green-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{network.networkName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-neutral-300 text-sm">{network.merchantName}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-white">${network.price.toFixed(2)}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className={`font-medium ${
                          network === bestNetwork ? 'text-green-500' : 'text-white'
                        }`}>
                          {network.commission}%
                        </div>
                        <div className="text-xs text-neutral-500">{network.commissionType}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-amber-500 font-medium">
                          ${(network.price * network.commission / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="text-neutral-300 text-sm">{network.cookieDuration}d</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          network.inStock 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {network.inStock ? 'In Stock' : 'Out'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => window.open(network.url, '_blank')}
                          className="text-sm px-3 py-1 bg-amber-500 text-neutral-900 rounded hover:bg-amber-400"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h3 className="text-amber-500 font-medium mb-2">💡 Optimization Tips</h3>
              <ul className="space-y-1 text-sm text-neutral-300">
                <li>• Route traffic to {bestNetwork?.networkName} for maximum earnings</li>
                <li>• Consider cookie duration for long purchase decision cycles</li>
                <li>• Monitor stock availability to avoid sending traffic to out-of-stock products</li>
                <li>• Test different networks to find best conversion rates for your audience</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-neutral-400">No comparison data available</div>
            <p className="text-sm text-neutral-500 mt-2">
              Connect more networks to compare commissions
            </p>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}