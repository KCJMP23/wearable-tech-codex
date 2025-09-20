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

interface RakutenCredentials extends AuthenticationCredentials {
  publisherId: string;
  apiKey: string;
  secretKey: string;
  username?: string;
  password?: string;
}

interface RakutenProduct {
  productid: string;
  productname: string;
  shortdescription: string;
  longdescription: string;
  price: string;
  saleprice: string;
  currency: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  manufacturersku: string;
  upc: string;
  isbn: string;
  linkurl: string;
  imageurl: string;
  thumbnailurl: string;
  instock: string;
  keywords: string;
  commission: string;
  commissiontype: 'percentage' | 'fixed';
  merchantid: string;
  merchantname: string;
  lastupdated: string;
}

interface RakutenTransaction {
  orderid: string;
  transactionid: string;
  productid: string;
  sku: string;
  productname: string;
  category: string;
  saleamount: string;
  commission: string;
  commissionrate: string;
  currency: string;
  orderdate: string;
  processdate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'reversed';
  merchantid: string;
  merchantname: string;
  subid: string;
  clickdate: string;
  clickid: string;
}

interface RakutenCoupon {
  offerid: string;
  offername: string;
  offerdescription: string;
  offertype: 'coupon' | 'deal' | 'cashback';
  couponcode: string;
  discountamount: string;
  discounttype: 'percentage' | 'fixed';
  startdate: string;
  enddate: string;
  restrictions: string;
  categories: string;
  merchantid: string;
  merchantname: string;
  linkurl: string;
  imageurl: string;
}

/**
 * Rakuten Advertising (formerly LinkShare) network integration
 * Implements LinkShare API authentication, product feeds, coupon/deal import, and analytics
 */
export class RakutenAdvertisingAdapter extends AffiliateNetworkAdapter {
  private readonly baseUrl = 'https://api.linksynergy.com';
  private readonly productSearchUrl = 'https://productsearch.linksynergy.com';
  private readonly couponsUrl = 'https://couponfeed.linksynergy.com';
  private credentials: RakutenCredentials | null = null;

  get networkType(): AffiliateNetworkType {
    return 'rakuten';
  }

  get capabilities(): AdapterCapabilities {
    return {
      supportsProductSync: true,
      supportsCommissionSync: true,
      supportsClickTracking: true,
      supportsConversionTracking: true,
      supportsWebhooks: true,
      supportsBulkOperations: true,
      supportsRealTimeUpdates: false, // Rakuten doesn't support real-time updates
      maxBatchSize: 200,
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        requestsPerDay: 86400,
      },
    };
  }

  /**
   * Authenticate with Rakuten using Publisher ID and API Key
   */
  async authenticate(credentials: AuthenticationCredentials): Promise<boolean> {
    try {
      this.credentials = credentials as RakutenCredentials;
      
      // Test authentication by fetching merchant list
      const response = await this.httpClient.get('/v1/advertisers', {
        headers: this.getAuthHeaders(),
        params: {
          page: 1,
          limit: 1,
        },
      });

      return response.status === 200;
    } catch (error) {
      this.credentials = null;
      throw new AffiliateNetworkError(
        `Rakuten Advertising authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'rakuten',
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
        'Rakuten Advertising credentials not configured',
        'rakuten',
        'NO_CREDENTIALS',
        undefined,
        false
      );
    }

    try {
      const response = await this.httpClient.get('/v1/advertisers', {
        headers: this.getAuthHeaders(),
        params: {
          page: 1,
          limit: 1,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sync products from Rakuten merchant feeds
   */
  async syncProducts(options: ProductSyncOptions = {}): Promise<SyncOperation> {
    await this.enforceRateLimit();

    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      tenantId: this.config.tenantId,
      networkType: 'rakuten',
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
        token: this.credentials!.apiKey,
        max: options.batchSize || 100,
        start: 1,
      };

      // Add filters if specified
      if (options.merchantIds?.length) {
        params.mid = options.merchantIds.join(',');
      }

      if (options.categories?.length) {
        params.cat = options.categories.join(',');
      }

      if (options.updatedSince) {
        params.modifiedsince = options.updatedSince;
      }

      let hasMore = true;
      let start = 1;

      while (hasMore) {
        params.start = start;
        
        const url = `${this.productSearchUrl}/productsearch`;
        const response = await this.httpClient.get(url, { params });
        
        // Rakuten returns XML, parse it
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        
        const products = this.parseProductResponse(result);
        
        operation.recordsProcessed += products.length;
        operation.recordsSucceeded += products.length;
        
        hasMore = products.length === (options.batchSize || 100);
        start += products.length;
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
   * Sync commission structures from Rakuten
   */
  async syncCommissions(options: CommissionSyncOptions = {}): Promise<CommissionStructure[]> {
    await this.enforceRateLimit();

    const params: any = {
      page: 1,
      limit: 1000,
    };

    if (options.merchantIds?.length) {
      params.advertisers = options.merchantIds.join(',');
    }

    const response = await this.httpClient.get('/v1/advertisers', {
      headers: this.getAuthHeaders(),
      params,
    });

    const advertisers = response.data.advertisers || [];

    return advertisers.map((advertiser: any) => ({
      id: `rakuten-${advertiser.id}`,
      networkType: 'rakuten' as const,
      merchantId: advertiser.id,
      merchantName: advertiser.name,
      baseRate: 0, // Rakuten doesn't provide base rates in advertiser list
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
        token: this.credentials!.apiKey,
        max: request.limit || 20,
        start: ((request.page || 1) - 1) * (request.limit || 20) + 1,
      };

      // Add filters from request
      if (request.filters) {
        if (request.filters.merchantId) {
          params.mid = request.filters.merchantId;
        }
        if (request.filters.category) {
          params.cat = request.filters.category;
        }
        if (request.filters.keyword) {
          params.keyword = request.filters.keyword;
        }
      }

      const url = `${this.productSearchUrl}/productsearch`;
      const response = await this.httpClient.get(url, { params });
      
      // Parse XML response
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);
      const products = this.parseProductResponse(result);

      return {
        success: true,
        data: products,
        meta: {
          page: request.page || 1,
          limit: request.limit || 20,
          total: parseInt(result.result?.TotalMatches || '0'),
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
   * Get a single product by Rakuten product ID
   */
  async getProduct(networkProductId: string): Promise<NetworkApiResponse<AffiliateProduct>> {
    await this.enforceRateLimit();

    try {
      const params = {
        token: this.credentials!.apiKey,
        keyword: networkProductId,
        max: 1,
      };

      const url = `${this.productSearchUrl}/productsearch`;
      const response = await this.httpClient.get(url, { params });
      
      // Parse XML response
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);
      const products = this.parseProductResponse(result);

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
   * Generate Rakuten affiliate link
   */
  async generateAffiliateLink(
    productId: string,
    customParams: Record<string, string> = {}
  ): Promise<string> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'Rakuten Advertising credentials not configured',
        'rakuten',
        'NO_CREDENTIALS'
      );
    }

    // Rakuten affiliate link format
    const baseUrl = 'https://click.linksynergy.com/deeplink';
    
    const params = {
      id: this.credentials.publisherId,
      mid: customParams.merchantId || '',
      murl: encodeURIComponent(customParams.productUrl || ''),
      u1: customParams.subId || '',
      ...customParams,
    };

    const queryString = qs.stringify(params, { addQueryPrefix: true });
    return `${baseUrl}${queryString}`;
  }

  /**
   * Track a click (Rakuten handles this automatically via their tracking)
   */
  async trackClick(click: Omit<Click, 'id' | 'tenantId'>): Promise<NetworkApiResponse<Click>> {
    // Rakuten handles click tracking automatically when users click affiliate links
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
   * Get conversions/transactions from Rakuten
   */
  async getConversions(dateFrom?: string, dateTo?: string): Promise<NetworkApiResponse<Conversion[]>> {
    await this.enforceRateLimit();

    try {
      const params: any = {
        page: 1,
        limit: 1000,
      };

      if (dateFrom) {
        params.start_date = dateFrom;
      }

      if (dateTo) {
        params.end_date = dateTo;
      }

      const response = await this.httpClient.get('/v1/transactions', {
        headers: this.getAuthHeaders(),
        params,
      });

      const data = response.data;
      const conversions = this.parseTransactionResponse(data);

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
   * Get coupons and deals from Rakuten
   */
  async getCoupons(): Promise<NetworkApiResponse<any[]>> {
    await this.enforceRateLimit();

    try {
      const params = {
        token: this.credentials!.apiKey,
      };

      const url = `${this.couponsUrl}/lsapiv1.svc/Coupons`;
      const response = await this.httpClient.get(url, { params });
      
      // Parse XML response
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);
      const coupons = this.parseCouponResponse(result);

      return {
        success: true,
        data: coupons,
        meta: {
          total: coupons.length,
          requestId: crypto.randomUUID(),
          rateLimit: this.getRateLimitInfo() || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COUPONS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Handle Rakuten webhook payload
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
        console.warn(`Unhandled Rakuten webhook event: ${payload.eventType}`);
    }
  }

  /**
   * Validate Rakuten webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.credentials?.secretKey) {
      throw new AffiliateNetworkError(
        'Rakuten secret key not configured',
        'rakuten',
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
   * Add Rakuten authentication headers
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
   * Get authentication headers for Rakuten API
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'Rakuten Advertising credentials not configured',
        'rakuten',
        'NO_CREDENTIALS'
      );
    }

    return {
      'Authorization': `Bearer ${this.credentials.apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Parse Rakuten product response into standardized format
   */
  private parseProductResponse(data: any): AffiliateProduct[] {
    const result = data.result || {};
    const items = result.item || [];
    const products = Array.isArray(items) ? items : [items];

    return products.filter(Boolean).map((product: any) => {
      const price: ProductPrice = {
        amount: parseFloat(product.price || '0'),
        currency: product.currency || 'USD',
        originalPrice: product.saleprice ? parseFloat(product.price || '0') : undefined,
        salePrice: product.saleprice ? parseFloat(product.saleprice || '0') : undefined,
      };

      const images: ProductImage[] = [];
      if (product.imageurl) {
        images.push({
          url: product.imageurl,
          alt: product.productname,
          isPrimary: true,
        });
      }
      if (product.thumbnailurl && product.thumbnailurl !== product.imageurl) {
        images.push({
          url: product.thumbnailurl,
          alt: product.productname,
          isPrimary: false,
        });
      }

      const availability: ProductAvailability = {
        inStock: product.instock === '1' || product.instock === 'true',
        stockStatus: product.instock === '1' || product.instock === 'true' ? 'active' : 'out_of_stock',
      };

      return {
        id: `rakuten-${product.productid}`,
        networkType: 'rakuten' as const,
        networkProductId: product.productid,
        merchantId: product.merchantid,
        merchantName: product.merchantname,
        title: product.productname,
        description: product.longdescription || product.shortdescription || '',
        brand: product.manufacturer,
        category: product.category,
        subcategory: product.subcategory,
        sku: product.manufacturersku,
        images,
        price,
        commissionRate: parseFloat(product.commission || '0'),
        commissionType: product.commissiontype || 'percentage',
        affiliateUrl: product.linkurl,
        trackingUrl: product.linkurl,
        availability,
        tags: product.keywords ? product.keywords.split(',').map((k: string) => k.trim()) : [],
        metadata: {
          upc: product.upc,
          isbn: product.isbn,
          lastUpdated: product.lastupdated,
        },
        lastUpdatedAt: product.lastupdated || new Date().toISOString(),
        isActive: product.instock === '1' || product.instock === 'true',
      };
    });
  }

  /**
   * Parse Rakuten transaction response into standardized format
   */
  private parseTransactionResponse(data: any): Conversion[] {
    const transactions = data.transactions || [];
    if (!Array.isArray(transactions)) return [];

    return transactions.map((transaction: any) => ({
      id: `rakuten-${transaction.transactionid}`,
      tenantId: this.config.tenantId,
      networkType: 'rakuten' as const,
      networkConversionId: transaction.transactionid,
      clickId: transaction.clickid,
      orderId: transaction.orderid,
      productId: transaction.productid,
      merchantId: transaction.merchantid,
      orderValue: parseFloat(transaction.saleamount || '0'),
      currency: transaction.currency || 'USD',
      commissionAmount: parseFloat(transaction.commission || '0'),
      commissionRate: parseFloat(transaction.commissionrate || '0'),
      status: transaction.status,
      conversionDate: transaction.orderdate,
      payoutDate: transaction.processdate,
      metadata: {
        sku: transaction.sku,
        productName: transaction.productname,
        category: transaction.category,
        subId: transaction.subid,
        clickDate: transaction.clickdate,
        merchantName: transaction.merchantname,
      },
    }));
  }

  /**
   * Parse Rakuten coupon response into standardized format
   */
  private parseCouponResponse(data: any): any[] {
    const result = data.couponfeed || {};
    const coupons = result.coupon || [];
    
    return (Array.isArray(coupons) ? coupons : [coupons]).filter(Boolean).map((coupon: any) => ({
      id: `rakuten-coupon-${coupon.offerid}`,
      networkType: 'rakuten' as const,
      offerId: coupon.offerid,
      name: coupon.offername,
      description: coupon.offerdescription,
      type: coupon.offertype || 'coupon',
      code: coupon.couponcode,
      discountAmount: parseFloat(coupon.discountamount || '0'),
      discountType: coupon.discounttype || 'percentage',
      startDate: coupon.startdate,
      endDate: coupon.enddate,
      restrictions: coupon.restrictions,
      categories: coupon.categories ? coupon.categories.split(',') : [],
      merchantId: coupon.merchantid,
      merchantName: coupon.merchantname,
      linkUrl: coupon.linkurl,
      imageUrl: coupon.imageurl,
      metadata: {
        lastUpdated: new Date().toISOString(),
      },
    }));
  }
}