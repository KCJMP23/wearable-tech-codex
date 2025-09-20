import { z } from 'zod';

// =============================================================================
// Core Affiliate Network Types
// =============================================================================

export type AffiliateNetworkType = 'shareasale' | 'cj' | 'impact' | 'rakuten' | 'amazon';
export type AuthenticationType = 'oauth' | 'api_key' | 'token' | 'credentials';
export type SyncStatus = 'idle' | 'syncing' | 'completed' | 'error';
export type ProductStatus = 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
export type CommissionType = 'percentage' | 'fixed' | 'tiered';

// =============================================================================
// Configuration Types
// =============================================================================

export interface AffiliateNetworkConfig {
  id: string;
  tenantId: string;
  networkType: AffiliateNetworkType;
  name: string;
  authenticationType: AuthenticationType;
  credentials: Record<string, string>; // Encrypted storage
  settings: NetworkSettings;
  status: 'active' | 'inactive' | 'error';
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  enableWebhooks: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  productFilters?: ProductFilters;
  commissionOverrides?: CommissionOverride[];
  customMappings?: Record<string, string>;
}

export interface ProductFilters {
  categories?: string[];
  excludeCategories?: string[];
  minCommissionRate?: number;
  maxCommissionRate?: number;
  brands?: string[];
  excludeBrands?: string[];
  keywords?: string[];
  excludeKeywords?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
}

export interface CommissionOverride {
  merchantId?: string;
  categoryId?: string;
  productId?: string;
  commissionRate: number;
  commissionType: CommissionType;
  conditions?: Record<string, unknown>;
}

// =============================================================================
// Product Data Types
// =============================================================================

export interface AffiliateProduct {
  id: string;
  networkType: AffiliateNetworkType;
  networkProductId: string;
  merchantId: string;
  merchantName: string;
  title: string;
  description: string;
  brand?: string;
  category: string;
  subcategory?: string;
  sku?: string;
  upc?: string;
  images: ProductImage[];
  price: ProductPrice;
  commissionRate: number;
  commissionType: CommissionType;
  affiliateUrl: string;
  trackingUrl: string;
  deepLink?: string;
  availability: ProductAvailability;
  specifications?: ProductSpecification[];
  ratings?: ProductRating;
  tags?: string[];
  metadata: Record<string, unknown>;
  lastUpdatedAt: string;
  isActive: boolean;
}

export interface ProductImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  isPrimary?: boolean;
}

export interface ProductPrice {
  amount: number;
  currency: string;
  originalPrice?: number;
  salePrice?: number;
  discountPercentage?: number;
  priceHistory?: PriceHistoryEntry[];
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
  currency: string;
}

export interface ProductAvailability {
  inStock: boolean;
  quantity?: number;
  stockStatus: ProductStatus;
  restockDate?: string;
  shippingInfo?: ShippingInfo;
}

export interface ShippingInfo {
  freeShipping: boolean;
  shippingCost?: number;
  estimatedDelivery?: string;
  shippingMethods?: string[];
}

export interface ProductSpecification {
  name: string;
  value: string;
  unit?: string;
}

export interface ProductRating {
  average: number;
  count: number;
  distribution?: RatingDistribution;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

// =============================================================================
// Commission & Tracking Types
// =============================================================================

export interface CommissionStructure {
  id: string;
  networkType: AffiliateNetworkType;
  merchantId: string;
  merchantName: string;
  baseRate: number;
  commissionType: CommissionType;
  tiers?: CommissionTier[];
  bonuses?: CommissionBonus[];
  conditions?: CommissionCondition[];
  effectiveDate: string;
  expirationDate?: string;
}

export interface CommissionTier {
  threshold: number;
  rate: number;
  type: 'sales_volume' | 'transaction_count' | 'customer_count';
}

export interface CommissionBonus {
  type: 'new_customer' | 'repeat_customer' | 'high_value' | 'seasonal';
  amount: number;
  isPercentage: boolean;
  conditions?: Record<string, unknown>;
}

export interface CommissionCondition {
  type: 'category' | 'product' | 'customer_type' | 'geographic' | 'temporal';
  criteria: Record<string, unknown>;
  modifier: number; // Multiplier or fixed adjustment
}

export interface Click {
  id: string;
  tenantId: string;
  networkType: AffiliateNetworkType;
  networkClickId: string;
  productId?: string;
  affiliateUrl: string;
  referrerUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  clickedAt: string;
  converted: boolean;
  conversionId?: string;
  metadata: Record<string, unknown>;
}

export interface Conversion {
  id: string;
  tenantId: string;
  networkType: AffiliateNetworkType;
  networkConversionId: string;
  clickId?: string;
  orderId: string;
  customerId?: string;
  productId?: string;
  merchantId: string;
  orderValue: number;
  currency: string;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'reversed';
  conversionDate: string;
  payoutDate?: string;
  metadata: Record<string, unknown>;
}

// =============================================================================
// Sync & Operation Types
// =============================================================================

export interface SyncOperation {
  id: string;
  tenantId: string;
  networkType: AffiliateNetworkType;
  operationType: 'full_sync' | 'incremental_sync' | 'product_update' | 'commission_sync';
  status: SyncStatus;
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorDetails?: SyncError[];
  metadata: Record<string, unknown>;
}

export interface SyncError {
  recordId?: string;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  context?: Record<string, unknown>;
}

export interface BulkOperation<T = unknown> {
  operation: 'create' | 'update' | 'delete';
  data: T[];
  batchSize?: number;
  continueOnError?: boolean;
}

export interface BulkOperationResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: BulkOperationError[];
  duration: number;
}

export interface BulkOperationError {
  index: number;
  recordId?: string;
  error: string;
  retryable: boolean;
}

// =============================================================================
// Webhook Types
// =============================================================================

export interface WebhookPayload {
  eventType: WebhookEventType;
  networkType: AffiliateNetworkType;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

export type WebhookEventType =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.stock_changed'
  | 'commission.updated'
  | 'conversion.created'
  | 'conversion.updated'
  | 'conversion.cancelled'
  | 'click.tracked'
  | 'merchant.status_changed';

// =============================================================================
// API Response Types
// =============================================================================

export interface NetworkApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    requestId?: string;
    rateLimit?: RateLimitInfo;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

// =============================================================================
// Validation Schemas
// =============================================================================

export const AffiliateNetworkConfigSchema = z.object({
  networkType: z.enum(['shareasale', 'cj', 'impact', 'rakuten', 'amazon']),
  name: z.string().min(1),
  authenticationType: z.enum(['oauth', 'api_key', 'token', 'credentials']),
  credentials: z.record(z.string()),
  settings: z.object({
    autoSync: z.boolean(),
    syncInterval: z.number().min(5),
    enableWebhooks: z.boolean(),
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    productFilters: z.object({
      categories: z.array(z.string()).optional(),
      excludeCategories: z.array(z.string()).optional(),
      minCommissionRate: z.number().min(0).max(100).optional(),
      maxCommissionRate: z.number().min(0).max(100).optional(),
      brands: z.array(z.string()).optional(),
      excludeBrands: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      excludeKeywords: z.array(z.string()).optional(),
      priceRange: z.object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
      }).optional(),
    }).optional(),
  }),
});

export const AffiliateProductSchema = z.object({
  networkType: z.enum(['shareasale', 'cj', 'impact', 'rakuten', 'amazon']),
  networkProductId: z.string(),
  merchantId: z.string(),
  merchantName: z.string(),
  title: z.string().min(1),
  description: z.string(),
  category: z.string(),
  price: z.object({
    amount: z.number().min(0),
    currency: z.string().length(3),
    originalPrice: z.number().min(0).optional(),
    salePrice: z.number().min(0).optional(),
  }),
  commissionRate: z.number().min(0).max(100),
  commissionType: z.enum(['percentage', 'fixed', 'tiered']),
  affiliateUrl: z.string().url(),
  trackingUrl: z.string().url(),
});

// =============================================================================
// Error Types
// =============================================================================

export class AffiliateNetworkError extends Error {
  constructor(
    message: string,
    public networkType: AffiliateNetworkType,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AffiliateNetworkError';
  }
}

export class RateLimitError extends AffiliateNetworkError {
  constructor(
    networkType: AffiliateNetworkType,
    public retryAfter: number,
    public limit: number,
    public remaining: number
  ) {
    super(
      `Rate limit exceeded for ${networkType}. Retry after ${retryAfter} seconds.`,
      networkType,
      'RATE_LIMIT_EXCEEDED',
      429,
      true
    );
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AffiliateNetworkError {
  constructor(networkType: AffiliateNetworkType, message: string = 'Authentication failed') {
    super(message, networkType, 'AUTHENTICATION_FAILED', 401, false);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AffiliateNetworkError {
  constructor(
    networkType: AffiliateNetworkType,
    public validationErrors: Record<string, string[]>
  ) {
    super(
      `Validation failed for ${networkType}: ${Object.keys(validationErrors).join(', ')}`,
      networkType,
      'VALIDATION_FAILED',
      400,
      false
    );
    this.name = 'ValidationError';
  }
}