import crypto from 'crypto';
import {
  AffiliateProduct,
  Conversion,
  AffiliateNetworkType,
  AffiliateNetworkConfig,
  ProductFilters,
  RateLimitInfo,
} from '../types';

/**
 * Utility functions for affiliate network integrations
 */

/**
 * Encrypt sensitive credentials for storage
 */
export function encryptCredentials(
  credentials: Record<string, string>,
  encryptionKey: string
): string {
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypt credentials from storage
 */
export function decryptCredentials(
  encryptedCredentials: string,
  encryptionKey: string
): Record<string, string> {
  const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
  let decrypted = decipher.update(encryptedCredentials, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

/**
 * Generate a unique tracking ID for clicks/conversions
 */
export function generateTrackingId(
  networkType: AffiliateNetworkType,
  tenantId: string,
  additionalData?: string
): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const data = [networkType, tenantId, timestamp, additionalData, randomBytes]
    .filter(Boolean)
    .join('-');
  
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Validate and sanitize product data
 */
export function sanitizeProduct(product: Partial<AffiliateProduct>): AffiliateProduct | null {
  // Required fields validation
  if (!product.networkProductId || !product.title || !product.merchantId) {
    return null;
  }

  // Price validation
  if (!product.price || product.price.amount < 0) {
    return null;
  }

  // Sanitize text fields
  const sanitizedProduct: AffiliateProduct = {
    id: product.id || `${product.networkType}-${product.networkProductId}`,
    networkType: product.networkType!,
    networkProductId: product.networkProductId,
    merchantId: product.merchantId,
    merchantName: product.merchantName || '',
    title: sanitizeText(product.title),
    description: sanitizeText(product.description || ''),
    brand: product.brand ? sanitizeText(product.brand) : undefined,
    category: product.category || 'uncategorized',
    subcategory: product.subcategory,
    sku: product.sku,
    images: product.images || [],
    price: {
      amount: Math.max(0, product.price.amount),
      currency: product.price.currency || 'USD',
      originalPrice: product.price.originalPrice,
      salePrice: product.price.salePrice,
    },
    commissionRate: Math.max(0, Math.min(100, product.commissionRate || 0)),
    commissionType: product.commissionType || 'percentage',
    affiliateUrl: product.affiliateUrl || '',
    trackingUrl: product.trackingUrl || product.affiliateUrl || '',
    availability: product.availability || {
      inStock: true,
      stockStatus: 'active',
    },
    tags: product.tags || [],
    metadata: product.metadata || {},
    lastUpdatedAt: product.lastUpdatedAt || new Date().toISOString(),
    isActive: product.isActive !== false,
  };

  return sanitizedProduct;
}

/**
 * Sanitize text by removing potentially harmful content
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s\-.,!?()&%$#@]/g, '') // Remove special characters except common punctuation
    .trim();
}

/**
 * Apply filters to product list
 */
export function applyProductFilters(
  products: AffiliateProduct[],
  filters: ProductFilters
): AffiliateProduct[] {
  return products.filter(product => {
    // Category filters
    if (filters.categories?.length && !filters.categories.includes(product.category)) {
      return false;
    }

    if (filters.excludeCategories?.length && filters.excludeCategories.includes(product.category)) {
      return false;
    }

    // Brand filters
    if (filters.brands?.length && (!product.brand || !filters.brands.includes(product.brand))) {
      return false;
    }

    if (filters.excludeBrands?.length && product.brand && filters.excludeBrands.includes(product.brand)) {
      return false;
    }

    // Commission rate filters
    if (filters.minCommissionRate !== undefined && product.commissionRate < filters.minCommissionRate) {
      return false;
    }

    if (filters.maxCommissionRate !== undefined && product.commissionRate > filters.maxCommissionRate) {
      return false;
    }

    // Price range filters
    if (filters.priceRange) {
      if (filters.priceRange.min !== undefined && product.price.amount < filters.priceRange.min) {
        return false;
      }

      if (filters.priceRange.max !== undefined && product.price.amount > filters.priceRange.max) {
        return false;
      }
    }

    // Keyword filters
    if (filters.keywords?.length) {
      const searchText = `${product.title} ${product.description} ${product.tags?.join(' ')}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    if (filters.excludeKeywords?.length) {
      const searchText = `${product.title} ${product.description} ${product.tags?.join(' ')}`.toLowerCase();
      const hasExcludedKeyword = filters.excludeKeywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      if (hasExcludedKeyword) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate commission amount for a conversion
 */
export function calculateCommissionAmount(
  orderValue: number,
  commissionRate: number,
  commissionType: 'percentage' | 'fixed' | 'tiered'
): number {
  switch (commissionType) {
    case 'percentage':
      return (orderValue * commissionRate) / 100;
    case 'fixed':
      return commissionRate;
    case 'tiered':
      // Tiered commission would require additional tier data
      // For now, treat as percentage
      return (orderValue * commissionRate) / 100;
    default:
      return 0;
  }
}

/**
 * Format currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    // Fallback formatting
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Generate deep link with tracking parameters
 */
export function generateDeepLink(
  baseUrl: string,
  productId: string,
  trackingParams: Record<string, string> = {}
): string {
  const url = new URL(baseUrl);
  
  // Add tracking parameters
  Object.entries(trackingParams).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

/**
 * Rate limit helper to calculate delay
 */
export function calculateRateLimitDelay(rateLimitInfo: RateLimitInfo): number {
  if (rateLimitInfo.remaining > 0) {
    return 0;
  }

  if (rateLimitInfo.retryAfter) {
    return rateLimitInfo.retryAfter * 1000; // Convert to milliseconds
  }

  // Parse reset time
  const resetTime = new Date(rateLimitInfo.resetAt).getTime();
  const now = Date.now();
  
  return Math.max(0, resetTime - now);
}

/**
 * Batch array into chunks of specified size
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry logic error'); // Should never reach here
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Generate configuration summary for logging/monitoring
 */
export function getConfigSummary(config: AffiliateNetworkConfig): Record<string, any> {
  return {
    id: config.id,
    networkType: config.networkType,
    name: config.name,
    status: config.status,
    autoSync: config.settings.autoSync,
    syncInterval: config.settings.syncInterval,
    enableWebhooks: config.settings.enableWebhooks,
    lastSync: config.lastSyncAt,
    nextSync: config.nextSyncAt,
    hasError: !!config.errorMessage,
    // Don't include sensitive credentials
  };
}

/**
 * Performance metrics helper
 */
export class PerformanceTracker {
  private metrics: Map<string, number> = new Map();

  start(operation: string): void {
    this.metrics.set(operation, Date.now());
  }

  end(operation: string): number {
    const startTime = this.metrics.get(operation);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.delete(operation);
    return duration;
  }

  getMetrics(): Record<string, number> {
    const now = Date.now();
    const result: Record<string, number> = {};
    
    this.metrics.forEach((startTime, operation) => {
      result[operation] = now - startTime;
    });

    return result;
  }

  clear(): void {
    this.metrics.clear();
  }
}

/**
 * Data validation helpers
 */
export const validators = {
  email: (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  phone: (phone: string): boolean => {
    const regex = /^\+?[\d\s\-\(\)]{10,}$/;
    return regex.test(phone);
  },

  currency: (currency: string): boolean => {
    const regex = /^[A-Z]{3}$/;
    return regex.test(currency);
  },

  percentage: (value: number): boolean => {
    return value >= 0 && value <= 100;
  },

  price: (price: number): boolean => {
    return price >= 0 && Number.isFinite(price);
  },
};

/**
 * Network-specific URL builders
 */
export const urlBuilders = {
  shareasale: {
    affiliateLink: (affiliateId: string, merchantId: string, productUrl: string, subId?: string): string => {
      const params = new URLSearchParams({
        b: merchantId,
        u: affiliateId,
        urllink: productUrl,
        ...(subId && { afftrack: subId }),
      });
      return `https://www.shareasale.com/r.cfm?${params}`;
    },
  },

  cj: {
    affiliateLink: (websiteId: string, advertiserId: string, productUrl: string, subId?: string): string => {
      const params = new URLSearchParams({
        PID: websiteId,
        AID: advertiserId,
        URL: productUrl,
        ...(subId && { SID: subId }),
      });
      return `https://www.anrdoezrs.net/click-${websiteId}-${advertiserId}?${params}`;
    },
  },

  impact: {
    affiliateLink: (partnerId: string, campaignId: string, subId1?: string): string => {
      const params = new URLSearchParams({
        btag: partnerId,
        ptag: campaignId,
        ...(subId1 && { subId1 }),
      });
      return `https://impact.com/campaign-promo-codes/click-through?${params}`;
    },
  },

  rakuten: {
    affiliateLink: (publisherId: string, merchantId: string, productUrl: string, subId?: string): string => {
      const params = new URLSearchParams({
        id: publisherId,
        mid: merchantId,
        murl: productUrl,
        ...(subId && { u1: subId }),
      });
      return `https://click.linksynergy.com/deeplink?${params}`;
    },
  },
};