// Main exports for the blockchain package
export * from './types';
export * from './config';
export * from './blockchain-service';

// Re-export commonly used types from viem
export type { Address, Hash, TransactionReceipt } from 'viem';

// Default export for easy importing
export { BlockchainService } from './blockchain-service';
export { NETWORK_CONFIGS, DEFAULT_BLOCKCHAIN_CONFIG } from './config';