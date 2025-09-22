'use client';

import { useState } from 'react';
import { Card } from '@affiliate-factory/ui';
import { NetworkConfigModal } from './NetworkConfigModal';
import { NetworkComparisonTable } from './NetworkComparisonTable';

export interface AffiliateNetwork {
  id: string;
  name: string;
  logo: string;
  status: 'connected' | 'pending' | 'disconnected';
  commission: string;
  cookieDuration: string;
  paymentTerms: string;
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  products: number;
  lastSync: Date | null;
  apiKey: string | null;
  metrics: {
    conversionRate: number;
    avgOrderValue: number;
    clickThrough: number;
  };
}

interface AffiliateNetworksViewProps {
  tenantSlug: string;
  tenantId: string;
  networks: AffiliateNetwork[];
}

export function AffiliateNetworksView({ 
  tenantSlug, 
  tenantId, 
  networks 
}: AffiliateNetworksViewProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<AffiliateNetwork | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const connectedNetworks = networks.filter(n => n.status === 'connected');
  const totalEarnings = networks.reduce((sum, n) => sum + n.earnings.total, 0);
  const totalProducts = networks.reduce((sum, n) => sum + n.products, 0);

  const handleConnect = (network: AffiliateNetwork) => {
    setSelectedNetwork(network);
    setShowConfigModal(true);
  };

  const handleDisconnect = (network: AffiliateNetwork) => {
    // In production, call API to disconnect network
    console.log('Disconnecting network:', network.id);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    
    // Call API to search products across all connected networks
    const response = await fetch(`/api/networks?action=search&tenantId=${tenantId}&query=${encodeURIComponent(searchQuery)}`);
    const data = await response.json();
    console.log('Search results:', data);
  };

  const handleCompareCommissions = async () => {
    if (!searchQuery) return;
    
    // Call API to compare commissions across networks
    const response = await fetch(`/api/networks?action=compare&tenantId=${tenantId}&product=${encodeURIComponent(searchQuery)}`);
    const data = await response.json();
    console.log('Commission comparison:', data);
    setShowComparison(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Affiliate Networks</h1>
        <p className="text-neutral-400">
          Connect multiple affiliate networks to maximize earnings and product coverage
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="border-neutral-800 bg-neutral-950 p-6">
          <div className="text-sm text-neutral-500 mb-1">Connected Networks</div>
          <div className="text-2xl font-bold text-amber-500">
            {connectedNetworks.length}/{networks.length}
          </div>
        </Card>
        <Card className="border-neutral-800 bg-neutral-950 p-6">
          <div className="text-sm text-neutral-500 mb-1">Total Products</div>
          <div className="text-2xl font-bold text-white">
            {totalProducts.toLocaleString()}
          </div>
        </Card>
        <Card className="border-neutral-800 bg-neutral-950 p-6">
          <div className="text-sm text-neutral-500 mb-1">Total Earnings</div>
          <div className="text-2xl font-bold text-green-500">
            ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="border-neutral-800 bg-neutral-950 p-6">
          <div className="text-sm text-neutral-500 mb-1">Avg Commission</div>
          <div className="text-2xl font-bold text-blue-500">7.5%</div>
        </Card>
      </div>

      {/* Search and Compare */}
      <Card className="border-neutral-800 bg-neutral-950 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Cross-Network Product Search
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for products across all networks..."
            className="flex-1 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-amber-500 text-neutral-900 rounded-lg hover:bg-amber-400 font-medium"
          >
            Search All
          </button>
          <button
            onClick={handleCompareCommissions}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 font-medium"
          >
            Compare Rates
          </button>
        </div>
      </Card>

      {/* Network Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {networks.map((network) => (
          <Card 
            key={network.id}
            className="border-neutral-800 bg-neutral-950 p-6 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{network.logo}</span>
                <div>
                  <h3 className="font-semibold text-white">{network.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                    network.status === 'connected' 
                      ? 'bg-green-500/20 text-green-500'
                      : network.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-neutral-700 text-neutral-400'
                  }`}>
                    {network.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Commission</span>
                <span className="text-white">{network.commission}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Cookie Duration</span>
                <span className="text-white">{network.cookieDuration}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Payment Terms</span>
                <span className="text-white">{network.paymentTerms}</span>
              </div>
              {network.status === 'connected' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Products</span>
                    <span className="text-white">{network.products.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Total Earnings</span>
                    <span className="text-green-500 font-medium">
                      ${network.earnings.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>

            {network.status === 'connected' && (
              <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t border-neutral-800">
                <div className="text-center">
                  <div className="text-xs text-neutral-500">CTR</div>
                  <div className="text-sm font-medium text-white">
                    {network.metrics.clickThrough}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-neutral-500">Conv</div>
                  <div className="text-sm font-medium text-white">
                    {network.metrics.conversionRate}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-neutral-500">AOV</div>
                  <div className="text-sm font-medium text-white">
                    ${network.metrics.avgOrderValue}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {network.status === 'connected' ? (
                <>
                  <button
                    onClick={() => handleConnect(network)}
                    className="flex-1 px-3 py-2 text-sm bg-neutral-800 text-white rounded-lg hover:bg-neutral-700"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => handleDisconnect(network)}
                    className="flex-1 px-3 py-2 text-sm bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect(network)}
                  className="w-full px-3 py-2 text-sm bg-amber-500 text-neutral-900 rounded-lg hover:bg-amber-400 font-medium"
                >
                  Connect
                </button>
              )}
            </div>

            {network.lastSync && (
              <div className="mt-3 text-xs text-neutral-500 text-center">
                Last sync: {new Date(network.lastSync).toLocaleString()}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Features Section */}
      <Card className="border-amber-500/20 bg-amber-500/5 p-6">
        <h2 className="text-lg font-semibold text-amber-500 mb-4">
          🚀 Multi-Network Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <div className="font-medium text-white">Cross-Network Search</div>
              <div className="text-sm text-neutral-400">
                Search products across all connected networks simultaneously
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <div className="font-medium text-white">Commission Comparison</div>
              <div className="text-sm text-neutral-400">
                Find the highest paying network for each product
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <div className="font-medium text-white">Automatic Link Routing</div>
              <div className="text-sm text-neutral-400">
                Route users to the best converting network automatically
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 mt-1">✓</span>
            <div>
              <div className="font-medium text-white">Unified Analytics</div>
              <div className="text-sm text-neutral-400">
                Track performance across all networks in one dashboard
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modals */}
      {showConfigModal && selectedNetwork && (
        <NetworkConfigModal
          network={selectedNetwork}
          tenantId={tenantId}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedNetwork(null);
          }}
        />
      )}
      
      {showComparison && (
        <NetworkComparisonTable
          query={searchQuery}
          tenantId={tenantId}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
