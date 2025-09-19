'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useNetwork, useBalance, useDisconnect } from 'wagmi';
import { formatEther } from 'viem';
import type { Address } from '@affiliate-factory/blockchain/types';

interface WalletConnectionProps {
  onConnectionChange?: (connected: boolean, address?: Address) => void;
  className?: string;
}

export function WalletConnection({ onConnectionChange, className = '' }: WalletConnectionProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { chain } = useNetwork();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    watch: true,
  });

  const [networkInfo, setNetworkInfo] = useState<any>(null);

  // Notify parent component of connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected, address as Address);
  }, [isConnected, address, onConnectionChange]);

  // Fetch network information
  useEffect(() => {
    if (chain) {
      fetch('/api/blockchain/network')
        .then(res => res.json())
        .then(data => setNetworkInfo(data))
        .catch(console.error);
    }
  }, [chain]);

  const handleDisconnect = () => {
    disconnect();
    onConnectionChange?.(false);
  };

  if (!isConnected) {
    return (
      <div className={`wallet-connection ${className}`}>
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
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
              Connect Your Wallet
            </h3>
            <p className="text-gray-600 mb-6">
              Connect your Web3 wallet to participate in the affiliate program and receive blockchain-based rewards.
            </p>
            <ConnectButton.Custom>
              {({ openConnectModal, connectModalOpen }) => (
                <button
                  onClick={openConnectModal}
                  disabled={isConnecting || connectModalOpen}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 min-w-[140px]"
                >
                  {isConnecting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </div>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              )}
            </ConnectButton.Custom>
            
            <div className="mt-6 text-sm text-gray-500">
              <p className="mb-2">Supported wallets:</p>
              <div className="flex justify-center space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  MetaMask
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  WalletConnect
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Coinbase Wallet
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-connection ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Wallet Connected</h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Wallet Address */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Wallet Address</p>
              <p className="text-sm text-gray-600 font-mono">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
              </p>
            </div>
            <button
              onClick={() => address && navigator.clipboard.writeText(address)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy address"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>

          {/* Network Info */}
          {chain && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Network</p>
                <p className="text-sm text-gray-600">{chain.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">Chain ID</p>
                <p className="text-sm text-gray-600">{chain.id}</p>
              </div>
            </div>
          )}

          {/* Balance */}
          {balance && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Balance</p>
                <p className="text-sm text-gray-600">
                  {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
                </p>
              </div>
              {balance.value < BigInt('1000000000000000000') && ( // Less than 1 ETH/MATIC
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Low Balance
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Network Status */}
          {networkInfo && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Network Status</p>
                <div className="flex items-center space-x-2">
                  {networkInfo.isMainnet && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Mainnet
                    </span>
                  )}
                  {networkInfo.isTestnet && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Testnet
                    </span>
                  )}
                  {networkInfo.isLocal && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Local
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p>Explorer: {networkInfo.network?.explorerUrl}</p>
                <p>Contracts: {networkInfo.network?.contracts?.affiliateAttribution ? 'Deployed' : 'Not Deployed'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <ConnectButton.Custom>
            {({ openAccountModal }) => (
              <button
                onClick={openAccountModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Account Details
              </button>
            )}
          </ConnectButton.Custom>
          
          <button
            onClick={handleDisconnect}
            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Disconnect
          </button>
        </div>

        {/* Affiliate Program Note */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Your wallet is now connected to the affiliate program. All commissions and rewards will be sent directly to this address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletConnection;