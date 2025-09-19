'use client';

import { useState } from 'react';

interface NetworkConfigModalProps {
  network: {
    id: string;
    name: string;
    logo: string;
    status: string;
  };
  tenantId: string;
  onClose: () => void;
}

export function NetworkConfigModal({ network, tenantId, onClose }: NetworkConfigModalProps) {
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    affiliateId: '',
    trackingId: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'configure',
          tenantId,
          networkId: network.id,
          credentials,
        }),
      });

      if (response.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to configure network:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{network.logo}</span>
            <h2 className="text-xl font-semibold text-white">Configure {network.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              API Key
            </label>
            <input
              type="text"
              value={credentials.apiKey}
              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              placeholder="Enter API key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              API Secret
            </label>
            <input
              type="password"
              value={credentials.apiSecret}
              onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              placeholder="Enter API secret"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              Affiliate ID
            </label>
            <input
              type="text"
              value={credentials.affiliateId}
              onChange={(e) => setCredentials({ ...credentials, affiliateId: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              placeholder="Enter affiliate ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              Tracking ID (Optional)
            </label>
            <input
              type="text"
              value={credentials.trackingId}
              onChange={(e) => setCredentials({ ...credentials, trackingId: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              placeholder="Enter tracking ID"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-500 text-neutral-900 rounded-lg hover:bg-amber-400 font-medium disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}