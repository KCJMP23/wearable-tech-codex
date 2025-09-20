import { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import qs from 'qs';
import xml2js from 'xml2js';
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

interface ShareASaleCredentials extends AuthenticationCredentials {
  affiliateId: string;
  token: string;
  secretKey: string;
  version: string; // API version
}

interface ShareASaleProduct {
  merchantID: string;
  merchantName: string;
  productID: string;
  productName: string;
  productDescription: string;
  productURL: string;
  category: string;
  subcategory?: string;
  price: string;
  salePrice?: string;
  currency: string;
  commission: string;
  commissionType: 'percentage' | 'fixed';
  brand?: string;
  sku?: string;
  upc?: string;
  imageURL?: string;
  thumbnailURL?: string;
  inStock: 'yes' | 'no';
  lastUpdated: string;
  keywords?: string;
  rating?: string;
  reviewCount?: string;
}

interface ShareASaleClick {
  merchantID: string;
  transactionDate: string;
  clickID: string;
  affID: string;
  subID?: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
}

interface ShareASaleTransaction {
  merchantID: string;
  transactionDate: string;
  transactionID: string;
  orderID: string;
  productID?: string;
  sku?: string;
  productName?: string;
  category?: string;
  saleAmount: string;
  commission: string;
  commissionRate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'reversed';
  payoutDate?: string;
  clickID?: string;
  subID?: string;
}

/**
 * ShareASale affiliate network integration
 * Implements OAuth authentication, product feeds, commission tracking, and webhooks
 */
export class ShareASaleAdapter extends AffiliateNetworkAdapter {
  private readonly baseUrl = 'https://www.shareasale.com';
  private readonly apiUrl = `${this.baseUrl}/w.cfm`;
  private credentials: ShareASaleCredentials | null = null;

  get networkType(): AffiliateNetworkType {
    return 'shareasale';
  }

  get capabilities(): AdapterCapabilities {
    return {
      supportsProductSync: true,
      supportsCommissionSync: true,
      supportsClickTracking: true,
      supportsConversionTracking: true,
      supportsWebhooks: true,
      supportsBulkOperations: true,
      supportsRealTimeUpdates: false, // ShareASale doesn't support real-time updates
      maxBatchSize: 100,
      rateLimits: {
        requestsPerMinute: 30, // ShareASale has conservative rate limits
        requestsPerHour: 1800,
        requestsPerDay: 43200,
      },
    };
  }

  /**
   * Authenticate with ShareASale using affiliate ID, token, and secret key
   */
  async authenticate(credentials: AuthenticationCredentials): Promise<boolean> {
    try {
      this.credentials = credentials as ShareASaleCredentials;
      
      // Test authentication by making a simple API call
      const params = {
        affiliateId: this.credentials.affiliateId,
        token: this.credentials.token,
        version: this.credentials.version || '2.8',
        action: 'merchantList',
        format: 'json',
      };

      const response = await this.makeAuthenticatedRequest(params);
      return response.status === 200;
    } catch (error) {
      this.credentials = null;
      throw new AffiliateNetworkError(
        `ShareASale authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'shareasale',
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
        'ShareASale credentials not configured',
        'shareasale',
        'NO_CREDENTIALS',
        undefined,
        false
      );
    }

    try {
      const params = {
        affiliateId: this.credentials.affiliateId,
        token: this.credentials.token,
        version: this.credentials.version || '2.8',
        action: 'merchantList',
        format: 'json',
        rows: '1', // Minimal request
      };

      const response = await this.makeAuthenticatedRequest(params);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sync products from ShareASale merchant feeds
   */
  async syncProducts(options: ProductSyncOptions = {}): Promise<SyncOperation> {
    await this.enforceRateLimit();

    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      tenantId: this.config.tenantId,
      networkType: 'shareasale',
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
        affiliateId: this.credentials!.affiliateId,
        token: this.credentials!.token,
        version: this.credentials!.version || '2.8',
        action: 'productSearch',
        format: 'json',
        rows: options.batchSize || 100,
      };

      // Add filters if specified
      if (options.merchantIds?.length) {
        params.merchantId = options.merchantIds.join(',');
      }

      if (options.categories?.length) {
        params.category = options.categories.join(',');
      }

      if (options.updatedSince) {
        params.modifiedSince = options.updatedSince;
      }

      let page = 1;
      let hasMore = true;

      while (hasMore) {
        params.page = page;
        
        const response = await this.makeAuthenticatedRequest(params);
        const products = this.parseProductResponse(response.data);
        
        operation.recordsProcessed += products.length;
        
        // Here you would typically save products to your database
        // For now, we'll just update the success count
        operation.recordsSucceeded += products.length;
        
        hasMore = products.length === (options.batchSize || 100);
        page++;
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
   * Sync commission structures from ShareASale
   */
  async syncCommissions(options: CommissionSyncOptions = {}): Promise<CommissionStructure[]> {
    await this.enforceRateLimit();

    const params: any = {
      affiliateId: this.credentials!.affiliateId,
      token: this.credentials!.token,
      version: this.credentials!.version || '2.8',
      action: 'merchantList',
      format: 'json',
    };

    if (options.merchantIds?.length) {
      params.merchantId = options.merchantIds.join(',');
    }

    const response = await this.makeAuthenticatedRequest(params);
    const merchants = response.data.merchants || [];

    return merchants.map((merchant: any) => ({
      id: `shareasale-${merchant.merchantID}`,
      networkType: 'shareasale' as const,
      merchantId: merchant.merchantID,
      merchantName: merchant.merchantName,
      baseRate: parseFloat(merchant.commission) || 0,
      commissionType: merchant.commissionType === 'fixed' ? 'fixed' : 'percentage' as const,
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
        affiliateId: this.credentials!.affiliateId,
        token: this.credentials!.token,
        version: this.credentials!.version || '2.8',
        action: 'productSearch',
        format: 'json',
        page: request.page || 1,
        rows: request.limit || 20,
      };

      // Add filters from request
      if (request.filters) {
        if (request.filters.merchantId) {
          params.merchantId = request.filters.merchantId;
        }
        if (request.filters.category) {
          params.category = request.filters.category;
        }
        if (request.filters.keyword) {
          params.keyword = request.filters.keyword;
        }
      }

      if (request.sortBy) {
        params.sort = request.sortBy;
        params.sortOrder = request.sortOrder || 'asc';
      }

      const response = await this.makeAuthenticatedRequest(params);
      const products = this.parseProductResponse(response.data);

      return {
        success: true,
        data: products,
        meta: {
          page: request.page || 1,
          limit: request.limit || 20,
          total: response.data.totalCount || 0,
          hasMore: products.length === (request.limit || 20),
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
   * Get a single product by ShareASale product ID
   */
  async getProduct(networkProductId: string): Promise<NetworkApiResponse<AffiliateProduct>> {
    await this.enforceRateLimit();

    try {
      const params = {
        affiliateId: this.credentials!.affiliateId,
        token: this.credentials!.token,
        version: this.credentials!.version || '2.8',
        action: 'productSearch',
        format: 'json',
        productId: networkProductId,
      };

      const response = await this.makeAuthenticatedRequest(params);
      const products = this.parseProductResponse(response.data);

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
   * Generate ShareASale affiliate link
   */
  async generateAffiliateLink(
    productId: string,
    customParams: Record<string, string> = {}
  ): Promise<string> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'ShareASale credentials not configured',
        'shareasale',
        'NO_CREDENTIALS'
      );
    }

    // ShareASale affiliate link format
    const baseUrl = `${this.baseUrl}/r.cfm`;
    const params = {
      b: productId, // Product/banner ID
      u: this.credentials.affiliateId,
      m: customParams.merchantId || '',
      urllink: customParams.productUrl || '',
      afftrack: customParams.subId || '',
      ...customParams,
    };

    const queryString = qs.stringify(params, { addQueryPrefix: true });
    return `${baseUrl}${queryString}`;
  }

  /**
   * Track a click (ShareASale handles this automatically via their tracking)
   */
  async trackClick(click: Omit<Click, 'id' | 'tenantId'>): Promise<NetworkApiResponse<Click>> {
    // ShareASale handles click tracking automatically when users click affiliate links
    // This method would typically be used for server-side tracking if needed
    
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
   * Get conversions/transactions from ShareASale
   */
  async getConversions(dateFrom?: string, dateTo?: string): Promise<NetworkApiResponse<Conversion[]>> {
    await this.enforceRateLimit();

    try {
      const params: any = {
        affiliateId: this.credentials!.affiliateId,
        token: this.credentials!.token,
        version: this.credentials!.version || '2.8',
        action: 'transactionList',
        format: 'json',
      };

      if (dateFrom) {
        params.dateStart = dateFrom;
      }

      if (dateTo) {
        params.dateEnd = dateTo;
      }

      const response = await this.makeAuthenticatedRequest(params);
      const conversions = this.parseTransactionResponse(response.data);

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
   * Handle ShareASale webhook payload
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    // ShareASale webhooks are typically XML-based postbacks
    // Implementation would depend on the specific webhook format
    
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
        console.warn(`Unhandled ShareASale webhook event: ${payload.eventType}`);
    }
  }

  /**
   * Validate ShareASale webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.credentials?.secretKey) {
      throw new AffiliateNetworkError(
        'ShareASale secret key not configured',
        'shareasale',
        'NO_SECRET_KEY'
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.credentials.secretKey)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  /**
   * Add ShareASale authentication headers
   */
  protected addAuthHeaders(config: AxiosRequestConfig): AxiosRequestConfig {
    // ShareASale uses query parameters for authentication rather than headers
    return config;
  }

  /**
   * Make authenticated request to ShareASale API
   */
  private async makeAuthenticatedRequest(params: Record<string, any>) {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'ShareASale credentials not configured',
        'shareasale',
        'NO_CREDENTIALS'
      );
    }

    // Generate timestamp and hash for authentication
    const timestamp = Math.floor(Date.now() / 1000);
    const hashString = `${this.credentials.token}:${timestamp}:${this.credentials.affiliateId}:${this.credentials.secretKey}`;
    const hash = crypto.createHash('sha256').update(hashString).digest('hex');

    const authParams = {
      ...params,
      timestamp,
      hash,
    };

    const queryString = qs.stringify(authParams);
    const url = `${this.apiUrl}?${queryString}`;

    return this.httpClient.get(url);
  }

  /**
   * Parse ShareASale product response into standardized format
   */
  private parseProductResponse(data: any): AffiliateProduct[] {
    const products = data.products || data || [];
    if (!Array.isArray(products)) return [];

    return products.map((product: ShareASaleProduct) => {
      const price: ProductPrice = {
        amount: parseFloat(product.price) || 0,
        currency: product.currency || 'USD',
        originalPrice: product.salePrice ? parseFloat(product.price) : undefined,
        salePrice: product.salePrice ? parseFloat(product.salePrice) : undefined,
      };

      const images: ProductImage[] = [];
      if (product.imageURL) {
        images.push({
          url: product.imageURL,
          alt: product.productName,
          isPrimary: true,
        });
      }
      if (product.thumbnailURL && product.thumbnailURL !== product.imageURL) {
        images.push({
          url: product.thumbnailURL,
          alt: product.productName,
          isPrimary: false,
        });
      }

      const availability: ProductAvailability = {
        inStock: product.inStock === 'yes',
        stockStatus: product.inStock === 'yes' ? 'active' : 'out_of_stock',
      };

      const rating: ProductRating | undefined = product.rating ? {
        average: parseFloat(product.rating),
        count: product.reviewCount ? parseInt(product.reviewCount) : 0,
      } : undefined;

      return {
        id: `shareasale-${product.productID}`,
        networkType: 'shareasale' as const,
        networkProductId: product.productID,
        merchantId: product.merchantID,
        merchantName: product.merchantName,
        title: product.productName,
        description: product.productDescription || '',
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory,
        sku: product.sku,
        images,
        price,
        commissionRate: parseFloat(product.commission) || 0,
        commissionType: product.commissionType || 'percentage',
        affiliateUrl: product.productURL,
        trackingUrl: product.productURL, // ShareASale tracking is handled via r.cfm redirects
        availability,
        ratings: rating,
        tags: product.keywords ? product.keywords.split(',').map(k => k.trim()) : [],
        metadata: {
          upc: product.upc,
          lastUpdated: product.lastUpdated,
        },
        lastUpdatedAt: product.lastUpdated || new Date().toISOString(),
        isActive: product.inStock === 'yes',
      };
    });
  }

  /**
   * Parse ShareASale transaction response into standardized format
   */
  private parseTransactionResponse(data: any): Conversion[] {
    const transactions = data.transactions || data || [];
    if (!Array.isArray(transactions)) return [];

    return transactions.map((transaction: ShareASaleTransaction) => ({
      id: `shareasale-${transaction.transactionID}`,
      tenantId: this.config.tenantId,
      networkType: 'shareasale' as const,
      networkConversionId: transaction.transactionID,
      clickId: transaction.clickID,
      orderId: transaction.orderID,
      productId: transaction.productID,
      merchantId: transaction.merchantID,
      orderValue: parseFloat(transaction.saleAmount) || 0,
      currency: 'USD', // ShareASale typically uses USD
      commissionAmount: parseFloat(transaction.commission) || 0,
      commissionRate: parseFloat(transaction.commissionRate) || 0,
      status: transaction.status,
      conversionDate: transaction.transactionDate,
      payoutDate: transaction.payoutDate,
      metadata: {
        sku: transaction.sku,
        productName: transaction.productName,
        category: transaction.category,
        subId: transaction.subID,
      },
    }));
  }
}