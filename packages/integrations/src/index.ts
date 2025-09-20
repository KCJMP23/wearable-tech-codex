// Core types and interfaces
export * from './types';

// Base adapter class
export { AffiliateNetworkAdapter, type AdapterCapabilities } from './base/adapter';

// Network-specific adapters
export { ShareASaleAdapter } from './networks/shareasale';
export { CJAffiliateAdapter } from './networks/cj';
export { ImpactRadiusAdapter } from './networks/impact';
export { RakutenAdvertisingAdapter } from './networks/rakuten';

// Factory for creating adapters
export { AffiliateNetworkAdapterFactory } from './factory';

// Webhook handlers
export * from './webhooks';

// Service manager
export {
  AffiliateNetworkManager,
  createAffiliateNetworkManager,
  getAffiliateNetworkManager,
  destroyAffiliateNetworkManager,
  type ManagerConfig,
  type NetworkStatus,
  type SyncSchedule,
} from './services/manager';

// Utilities
export * from './utils';

// Re-export commonly used types for convenience
export type {
  AffiliateNetworkType,
  AffiliateNetworkConfig,
  AffiliateProduct,
  Click,
  Conversion,
  CommissionStructure,
  SyncOperation,
  NetworkApiResponse,
  PaginatedRequest,
  WebhookPayload,
  BulkOperation,
  BulkOperationResult,
  WebhookEventType,
} from './types';