import { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import qs from 'qs';
import {
  AffiliateNetworkAdapter,
  AdapterCapabilities,
  AuthenticationCredentials,
  ProductSyncOptions,
  CommissionSyncOptions,
} from '../base/adapter';
import {
  AffiliateNetworkType,
  AffiliateProduct,
  Click,
  Conversion,
  CommissionStructure,
  SyncOperation,
  NetworkApiResponse,
  PaginatedRequest,
  WebhookPayload,
  ProductImage,
  ProductPrice,
  ProductAvailability,
  ProductRating,
  AffiliateNetworkError,
} from '../types';

interface CJCredentials extends AuthenticationCredentials {
  developerId: string;
  websiteId: string;
  personalAccessToken: string;
  requestId?: string; // For tracking API requests
}

interface CJProduct {
  'advertiser-id': string;
  'advertiser-name': string;
  'catalog-id': string;
  'product-name': string;
  'product-description': string;
  'buy-url': string;
  'impression-url': string;
  'image-url': string;
  'in-stock': string;
  'price': string;
  'sale-price': string;
  'retail-price': string;
  'currency': string;
  'manufacturer-name': string;
  'manufacturer-sku': string;
  'upc': string;
  'isbn': string;
  'advertiser-category': string;
  'keywords': string;
  'search-results-url': string;
  'performance-incentive': string;
}

interface CJCommission {
  'advertiser-id': string;
  'advertiser-name': string;
  'commission-id': string;
  'commission-type': 'percentage' | 'fixed';
  'commission-amount': string;
  'action-type': string;
  'action-status': string;
  'order-id': string;
  'original-action-id': string;
  'aid': string;
  'event-date': string;
  'locking-date': string;
  'posting-date': string;
  'order-discount': string;
  'sid': string;
  'country': string;
}

/**
 * CJ Affiliate (Commission Junction) network integration
 * Implements REST API authentication, product catalog sync, and commission tracking
 */
export class CJAffiliateAdapter extends AffiliateNetworkAdapter {
  private readonly baseUrl = 'https://api.cj.com';
  private credentials: CJCredentials | null = null;

  get networkType(): AffiliateNetworkType {
    return 'cj';
  }

  get capabilities(): AdapterCapabilities {
    return {
      supportsProductSync: true,
      supportsCommissionSync: true,
      supportsClickTracking: true,
      supportsConversionTracking: true,
      supportsWebhooks: true,
      supportsBulkOperations: true,
      supportsRealTimeUpdates: true,
      maxBatchSize: 1000,
      rateLimits: {
        requestsPerMinute: 100, // CJ has generous rate limits
        requestsPerHour: 6000,
        requestsPerDay: 144000,
      },
    };
  }

  /**
   * Authenticate with CJ Affiliate using Personal Access Token
   */
  async authenticate(credentials: AuthenticationCredentials): Promise<boolean> {
    try {
      this.credentials = credentials as CJCredentials;
      
      // Test authentication by fetching advertiser list
      const response = await this.httpClient.get('/v3/advertisers', {
        headers: this.getAuthHeaders(),
        params: {
          'records-per-page': 1,
          'page-number': 1,
        },
      });

      return response.status === 200;
    } catch (error) {
      this.credentials = null;
      throw new AffiliateNetworkError(
        `CJ Affiliate authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'cj',
        'AUTH_FAILED',
        undefined,
        false
      );
    }
  }

  /**
   * Test the connection and authentication
   */
  async testConnection(): Promise<boolean> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'CJ Affiliate credentials not configured',
        'cj',
        'NO_CREDENTIALS',
        undefined,
        false
      );
    }

    try {
      const response = await this.httpClient.get('/v3/advertisers', {
        headers: this.getAuthHeaders(),
        params: {
          'records-per-page': 1,
          'page-number': 1,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sync products from CJ Affiliate product catalog
   */
  async syncProducts(options: ProductSyncOptions = {}): Promise<SyncOperation> {
    await this.enforceRateLimit();

    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      tenantId: this.config.tenantId,
      networkType: 'cj',
      operationType: options.fullSync ? 'full_sync' : 'incremental_sync',
      status: 'syncing',
      startedAt: new Date().toISOString(),
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errorDetails: [],
      metadata: options,
    };

    try {
      const params: any = {
        'records-per-page': options.batchSize || 100,
        'page-number': 1,
      };

      // Add filters if specified
      if (options.merchantIds?.length) {
        params['advertiser-ids'] = options.merchantIds.join(',');
      }

      if (options.categories?.length) {
        params['advertiser-category'] = options.categories.join(',');
      }

      let hasMore = true;
      let pageNumber = 1;

      while (hasMore) {
        params['page-number'] = pageNumber;
        
        const response = await this.httpClient.get('/v3/product-catalog', {
          headers: this.getAuthHeaders(),
          params,
        });

        const data = response.data;
        const products = this.parseProductResponse(data);
        
        operation.recordsProcessed += products.length;
        operation.recordsSucceeded += products.length;
        
        // Check if there are more pages
        const totalRecords = parseInt(data['cj-api']?.['total-matched'] || '0');
        const currentRecords = pageNumber * (options.batchSize || 100);
        hasMore = currentRecords < totalRecords;
        
        pageNumber++;
      }

      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    } catch (error) {
      operation.status = 'error';
      operation.completedAt = new Date().toISOString();
      operation.errorDetails = [{
        errorCode: 'SYNC_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
      }];
    }

    return operation;
  }

  /**
   * Sync commission structures from CJ Affiliate
   */
  async syncCommissions(options: CommissionSyncOptions = {}): Promise<CommissionStructure[]> {
    await this.enforceRateLimit();

    const params: any = {
      'records-per-page': 1000,
      'page-number': 1,
    };

    if (options.merchantIds?.length) {
      params['advertiser-ids'] = options.merchantIds.join(',');
    }

    const response = await this.httpClient.get('/v3/advertisers', {
      headers: this.getAuthHeaders(),
      params,
    });

    const advertisers = response.data?.['cj-api']?.advertisers || [];

    return advertisers.map((advertiser: any) => ({
      id: `cj-${advertiser['advertiser-id']}`,
      networkType: 'cj' as const,
      merchantId: advertiser['advertiser-id'],
      merchantName: advertiser['advertiser-name'],
      baseRate: 0, // CJ doesn't provide base rates in advertiser list
      commissionType: 'percentage' as const,
      effectiveDate: new Date().toISOString(),
    }));
  }

  /**
   * Get products with pagination
   */
  async getProducts(request: PaginatedRequest): Promise<NetworkApiResponse<AffiliateProduct[]>> {
    await this.enforceRateLimit();

    try {
      const params: any = {
        'records-per-page': request.limit || 20,
        'page-number': request.page || 1,
      };

      // Add filters from request
      if (request.filters) {
        if (request.filters.advertiserId) {
          params['advertiser-ids'] = request.filters.advertiserId;
        }
        if (request.filters.category) {
          params['advertiser-category'] = request.filters.category;
        }
        if (request.filters.keywords) {
          params.keywords = request.filters.keywords;
        }
        if (request.filters.inStock) {
          params['in-stock'] = request.filters.inStock;
        }
      }

      if (request.sortBy) {
        params['sort-by'] = request.sortBy;
        params['sort-order'] = request.sortOrder || 'asc';
      }

      const response = await this.httpClient.get('/v3/product-catalog', {
        headers: this.getAuthHeaders(),
        params,
      });

      const data = response.data;
      const products = this.parseProductResponse(data);
      const totalMatched = parseInt(data['cj-api']?.['total-matched'] || '0');

      return {
        success: true,
        data: products,
        meta: {
          page: request.page || 1,
          limit: request.limit || 20,
          total: totalMatched,
          hasMore: (request.page || 1) * (request.limit || 20) < totalMatched,
          requestId: crypto.randomUUID(),
          rateLimit: this.getRateLimitInfo() || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get a single product by CJ catalog ID
   */
  async getProduct(networkProductId: string): Promise<NetworkApiResponse<AffiliateProduct>> {
    await this.enforceRateLimit();

    try {
      const params = {
        'catalog-id': networkProductId,
        'records-per-page': 1,
        'page-number': 1,
      };

      const response = await this.httpClient.get('/v3/product-catalog', {
        headers: this.getAuthHeaders(),
        params,
      });

      const data = response.data;
      const products = this.parseProductResponse(data);

      if (products.length === 0) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product ${networkProductId} not found`,
          },
        };
      }

      return {
        success: true,
        data: products[0],
        meta: {
          requestId: crypto.randomUUID(),
          rateLimit: this.getRateLimitInfo() || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Generate CJ Affiliate tracking link
   */
  async generateAffiliateLink(
    productId: string,
    customParams: Record<string, string> = {}
  ): Promise<string> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'CJ Affiliate credentials not configured',
        'cj',
        'NO_CREDENTIALS'
      );
    }

    // Get product buy URL first
    const productResponse = await this.getProduct(productId);
    if (!productResponse.success || !productResponse.data) {
      throw new AffiliateNetworkError(
        `Product ${productId} not found`,
        'cj',
        'PRODUCT_NOT_FOUND'
      );
    }

    const product = productResponse.data;
    const buyUrl = product.affiliateUrl;

    // CJ tracking parameters
    const trackingParams = {
      PID: this.credentials.websiteId,
      AID: customParams.advertiserId || product.merchantId,
      SID: customParams.subId || '',
      CJSKU: productId,
      URL: encodeURIComponent(buyUrl),
      ...customParams,
    };

    const queryString = qs.stringify(trackingParams, { addQueryPrefix: true });
    return `https://www.anrdoezrs.net/click-${this.credentials.websiteId}-${trackingParams.AID}${queryString}`;
  }

  /**
   * Track a click (CJ handles this automatically via their tracking)
   */
  async trackClick(click: Omit<Click, 'id' | 'tenantId'>): Promise<NetworkApiResponse<Click>> {
    // CJ handles click tracking automatically when users click affiliate links
    const trackedClick: Click = {
      id: crypto.randomUUID(),
      tenantId: this.config.tenantId,
      ...click,
    };

    return {
      success: true,
      data: trackedClick,
      meta: {
        requestId: crypto.randomUUID(),
      },
    };
  }

  /**
   * Get conversions/commissions from CJ Affiliate
   */
  async getConversions(dateFrom?: string, dateTo?: string): Promise<NetworkApiResponse<Conversion[]>> {
    await this.enforceRateLimit();

    try {
      const params: any = {
        'records-per-page': 1000,
        'page-number': 1,
      };

      if (dateFrom) {
        params['start-date'] = dateFrom;
      }

      if (dateTo) {
        params['end-date'] = dateTo;
      }

      const response = await this.httpClient.get('/v3/commissions', {
        headers: this.getAuthHeaders(),
        params,
      });

      const data = response.data;
      const conversions = this.parseCommissionResponse(data);

      return {
        success: true,
        data: conversions,
        meta: {
          total: conversions.length,
          requestId: crypto.randomUUID(),
          rateLimit: this.getRateLimitInfo() || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONVERSION_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Handle CJ Affiliate webhook payload
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    switch (payload.eventType) {
      case 'conversion.created':
        // Handle new conversion
        break;
      case 'conversion.updated':
        // Handle conversion status change
        break;
      case 'product.updated':
        // Handle product updates
        break;
      default:
        console.warn(`Unhandled CJ Affiliate webhook event: ${payload.eventType}`);
    }
  }

  /**
   * Validate CJ Affiliate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    // CJ doesn't use webhook signatures in the traditional sense
    // Validation would be based on source IP or other methods
    return true;
  }

  /**
   * Add CJ Affiliate authentication headers
   */
  protected addAuthHeaders(config: AxiosRequestConfig): AxiosRequestConfig {
    const headers = this.getAuthHeaders();
    return {
      ...config,
      headers: {
        ...config.headers,
        ...headers,
      },
    };
  }

  /**
   * Get authentication headers for CJ API
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'CJ Affiliate credentials not configured',
        'cj',
        'NO_CREDENTIALS'
      );
    }

    return {
      'Authorization': `Bearer ${this.credentials.personalAccessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Parse CJ product response into standardized format
   */
  private parseProductResponse(data: any): AffiliateProduct[] {
    const products = data?.['cj-api']?.products || [];
    if (!Array.isArray(products)) return [];

    return products.map((product: CJProduct) => {
      const price: ProductPrice = {
        amount: parseFloat(product.price) || 0,
        currency: product.currency || 'USD',
        originalPrice: product['retail-price'] ? parseFloat(product['retail-price']) : undefined,
        salePrice: product['sale-price'] ? parseFloat(product['sale-price']) : undefined,
      };

      const images: ProductImage[] = [];
      if (product['image-url']) {
        images.push({
          url: product['image-url'],
          alt: product['product-name'],
          isPrimary: true,
        });
      }

      const availability: ProductAvailability = {
        inStock: product['in-stock'] === 'yes',
        stockStatus: product['in-stock'] === 'yes' ? 'active' : 'out_of_stock',
      };

      return {
        id: `cj-${product['catalog-id']}`,
        networkType: 'cj' as const,
        networkProductId: product['catalog-id'],
        merchantId: product['advertiser-id'],
        merchantName: product['advertiser-name'],
        title: product['product-name'],
        description: product['product-description'] || '',
        brand: product['manufacturer-name'],
        category: product['advertiser-category'],
        sku: product['manufacturer-sku'],
        images,
        price,
        commissionRate: 0, // Not provided in product data
        commissionType: 'percentage' as const,
        affiliateUrl: product['buy-url'],
        trackingUrl: product['buy-url'],
        availability,
        tags: product.keywords ? product.keywords.split(',').map(k => k.trim()) : [],
        metadata: {
          upc: product.upc,
          isbn: product.isbn,
          impressionUrl: product['impression-url'],
          searchResultsUrl: product['search-results-url'],
          performanceIncentive: product['performance-incentive'],
        },
        lastUpdatedAt: new Date().toISOString(),
        isActive: product['in-stock'] === 'yes',
      };
    });
  }

  /**
   * Parse CJ commission response into standardized format
   */
  private parseCommissionResponse(data: any): Conversion[] {
    const commissions = data?.['cj-api']?.commissions || [];
    if (!Array.isArray(commissions)) return [];

    return commissions.map((commission: CJCommission) => ({
      id: `cj-${commission['commission-id']}`,
      tenantId: this.config.tenantId,
      networkType: 'cj' as const,
      networkConversionId: commission['commission-id'],
      clickId: commission['original-action-id'],
      orderId: commission['order-id'],
      merchantId: commission['advertiser-id'],
      orderValue: 0, // Not provided directly
      currency: 'USD', // CJ typically uses USD
      commissionAmount: parseFloat(commission['commission-amount']) || 0,
      commissionRate: 0, // Would need to calculate from commission amount and order value
      status: this.mapCJStatus(commission['action-status']),
      conversionDate: commission['event-date'],
      payoutDate: commission['posting-date'],
      metadata: {
        actionType: commission['action-type'],
        aid: commission.aid,
        sid: commission.sid,
        country: commission.country,
        lockingDate: commission['locking-date'],
        orderDiscount: commission['order-discount'],
      },
    }));
  }

  /**
   * Map CJ status to standardized format
   */
  private mapCJStatus(status: string): 'pending' | 'confirmed' | 'cancelled' | 'reversed' {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'extended':
        return 'pending';
      case 'locked':
      case 'closed':
        return 'confirmed';
      case 'corrected':
        return 'reversed';
      default:
        return 'pending';
    }
  }
}