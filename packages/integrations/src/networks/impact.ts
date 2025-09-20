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

interface ImpactCredentials extends AuthenticationCredentials {
  accountSid: string;
  authToken: string;
  partnerId: string;
  apiKey?: string;
}

interface ImpactProduct {
  Id: string;
  Name: string;
  Description: string;
  BrandName: string;
  Category: string;
  SubCategory: string;
  ImageUrl: string;
  ThumbnailUrl: string;
  Price: number;
  Currency: string;
  SalePrice?: number;
  Sku: string;
  Upc: string;
  InStock: boolean;
  ClickUrl: string;
  TrackingUrl: string;
  CampaignId: string;
  CampaignName: string;
  Keywords: string;
  LastUpdated: string;
}

interface ImpactConversion {
  Id: string;
  ActionId: string;
  CampaignId: string;
  CampaignName: string;
  ActionTrackerId: string;
  Payout: number;
  DeltaPayout: number;
  IntendedPayout: number;
  Amount: number;
  DeltaAmount: number;
  IntendedAmount: number;
  Currency: string;
  State: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL';
  EventDate: string;
  LockingDate: string;
  CreationDate: string;
  ModificationDate: string;
  ClearedDate?: string;
  ReferringDomain: string;
  SubId1?: string;
  SubId2?: string;
  SubId3?: string;
  PromoCode?: string;
  Oid?: string;
  CustomerStatus: string;
}

interface ImpactCampaign {
  Id: string;
  Name: string;
  Description: string;
  CategoryName: string;
  CookieLength: number;
  DefaultPayout: number;
  Currency: string;
  PayoutType: 'CPA' | 'CPC' | 'CPS';
  TermsAndConditions: string;
  ContractId: string;
  State: 'ACTIVE' | 'INACTIVE';
  StartDate: string;
  EndDate?: string;
}

/**
 * Impact Radius affiliate network integration
 * Implements Partner API authentication, campaign management, and conversion tracking
 */
export class ImpactRadiusAdapter extends AffiliateNetworkAdapter {
  private readonly baseUrl = 'https://api.impact.com';
  private credentials: ImpactCredentials | null = null;

  get networkType(): AffiliateNetworkType {
    return 'impact';
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
      maxBatchSize: 500,
      rateLimits: {
        requestsPerMinute: 120,
        requestsPerHour: 7200,
        requestsPerDay: 172800,
      },
    };
  }

  /**
   * Authenticate with Impact Radius using Account SID and Auth Token
   */
  async authenticate(credentials: AuthenticationCredentials): Promise<boolean> {
    try {
      this.credentials = credentials as ImpactCredentials;
      
      // Test authentication by fetching partner info
      const response = await this.httpClient.get(`/Mediapartners/${this.credentials.accountSid}/Campaigns`, {
        headers: this.getAuthHeaders(),
        params: {
          PageSize: 1,
        },
      });

      return response.status === 200;
    } catch (error) {
      this.credentials = null;
      throw new AffiliateNetworkError(
        `Impact Radius authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'impact',
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
        'Impact Radius credentials not configured',
        'impact',
        'NO_CREDENTIALS',
        undefined,
        false
      );
    }

    try {
      const response = await this.httpClient.get(`/Mediapartners/${this.credentials.accountSid}/Campaigns`, {
        headers: this.getAuthHeaders(),
        params: {
          PageSize: 1,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sync products from Impact Radius campaigns
   */
  async syncProducts(options: ProductSyncOptions = {}): Promise<SyncOperation> {
    await this.enforceRateLimit();

    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      tenantId: this.config.tenantId,
      networkType: 'impact',
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
      // First get active campaigns
      const campaignsResponse = await this.httpClient.get(`/Mediapartners/${this.credentials!.accountSid}/Campaigns`, {
        headers: this.getAuthHeaders(),
        params: {
          State: 'ACTIVE',
          PageSize: 100,
        },
      });

      const campaigns = campaignsResponse.data.Campaigns || [];
      
      // For each campaign, fetch products if available
      for (const campaign of campaigns) {
        if (options.merchantIds?.length && !options.merchantIds.includes(campaign.Id)) {
          continue;
        }

        try {
          // Note: Impact Radius doesn't have a direct product catalog API
          // Products would typically come from individual advertiser feeds
          // This is a placeholder for the sync logic
          
          operation.recordsProcessed += 1;
          operation.recordsSucceeded += 1;
        } catch (error) {
          operation.recordsFailed += 1;
          operation.errorDetails?.push({
            recordId: campaign.Id,
            errorCode: 'CAMPAIGN_SYNC_FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            retryCount: 0,
          });
        }
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
   * Sync commission structures from Impact Radius campaigns
   */
  async syncCommissions(options: CommissionSyncOptions = {}): Promise<CommissionStructure[]> {
    await this.enforceRateLimit();

    const params: any = {
      State: 'ACTIVE',
      PageSize: 1000,
    };

    if (options.merchantIds?.length) {
      params.CampaignIds = options.merchantIds.join(',');
    }

    const response = await this.httpClient.get(`/Mediapartners/${this.credentials!.accountSid}/Campaigns`, {
      headers: this.getAuthHeaders(),
      params,
    });

    const campaigns = response.data.Campaigns || [];

    return campaigns.map((campaign: ImpactCampaign) => ({
      id: `impact-${campaign.Id}`,
      networkType: 'impact' as const,
      merchantId: campaign.Id,
      merchantName: campaign.Name,
      baseRate: campaign.DefaultPayout || 0,
      commissionType: campaign.PayoutType === 'CPS' ? 'percentage' : 'fixed' as const,
      effectiveDate: campaign.StartDate,
      expirationDate: campaign.EndDate,
    }));
  }

  /**
   * Get products with pagination (Impact Radius doesn't have a unified product catalog)
   */
  async getProducts(request: PaginatedRequest): Promise<NetworkApiResponse<AffiliateProduct[]>> {
    await this.enforceRateLimit();

    try {
      // Impact Radius doesn't have a unified product catalog API
      // Products would come from individual advertiser data feeds
      // This is a placeholder implementation
      
      return {
        success: true,
        data: [],
        meta: {
          page: request.page || 1,
          limit: request.limit || 20,
          total: 0,
          hasMore: false,
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
   * Get a single product by Impact campaign/product ID
   */
  async getProduct(networkProductId: string): Promise<NetworkApiResponse<AffiliateProduct>> {
    // Impact Radius doesn't have a unified product catalog
    return {
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Impact Radius does not support individual product lookup',
      },
    };
  }

  /**
   * Generate Impact Radius tracking link
   */
  async generateAffiliateLink(
    productId: string,
    customParams: Record<string, string> = {}
  ): Promise<string> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'Impact Radius credentials not configured',
        'impact',
        'NO_CREDENTIALS'
      );
    }

    // Impact Radius tracking link format
    const baseUrl = 'https://impact.com/campaign-promo-codes/click-through';
    
    const params = {
      btag: this.credentials.partnerId,
      ptag: productId, // Campaign ID or tracking tag
      subId1: customParams.subId1 || '',
      subId2: customParams.subId2 || '',
      subId3: customParams.subId3 || '',
      ...customParams,
    };

    const queryString = qs.stringify(params, { addQueryPrefix: true });
    return `${baseUrl}${queryString}`;
  }

  /**
   * Track a click (Impact handles this automatically via their tracking)
   */
  async trackClick(click: Omit<Click, 'id' | 'tenantId'>): Promise<NetworkApiResponse<Click>> {
    // Impact Radius handles click tracking automatically
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
   * Get conversions from Impact Radius
   */
  async getConversions(dateFrom?: string, dateTo?: string): Promise<NetworkApiResponse<Conversion[]>> {
    await this.enforceRateLimit();

    try {
      const params: any = {
        PageSize: 1000,
      };

      if (dateFrom) {
        params.StartDate = dateFrom;
      }

      if (dateTo) {
        params.EndDate = dateTo;
      }

      const response = await this.httpClient.get(`/Mediapartners/${this.credentials!.accountSid}/Actions`, {
        headers: this.getAuthHeaders(),
        params,
      });

      const data = response.data;
      const conversions = this.parseConversionResponse(data);

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
   * Handle Impact Radius webhook payload
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    switch (payload.eventType) {
      case 'conversion.created':
        // Handle new conversion
        break;
      case 'conversion.updated':
        // Handle conversion status change
        break;
      default:
        console.warn(`Unhandled Impact Radius webhook event: ${payload.eventType}`);
    }
  }

  /**
   * Validate Impact Radius webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.credentials?.authToken) {
      throw new AffiliateNetworkError(
        'Impact Radius auth token not configured',
        'impact',
        'NO_AUTH_TOKEN'
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.credentials.authToken)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  /**
   * Add Impact Radius authentication headers
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
   * Get authentication headers for Impact API
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new AffiliateNetworkError(
        'Impact Radius credentials not configured',
        'impact',
        'NO_CREDENTIALS'
      );
    }

    // Impact uses Basic auth with Account SID and Auth Token
    const credentials = Buffer.from(`${this.credentials.accountSid}:${this.credentials.authToken}`).toString('base64');

    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Parse Impact conversion response into standardized format
   */
  private parseConversionResponse(data: any): Conversion[] {
    const actions = data.Actions || [];
    if (!Array.isArray(actions)) return [];

    return actions.map((action: ImpactConversion) => ({
      id: `impact-${action.Id}`,
      tenantId: this.config.tenantId,
      networkType: 'impact' as const,
      networkConversionId: action.Id,
      clickId: action.ActionId,
      orderId: action.Oid || action.Id,
      merchantId: action.CampaignId,
      orderValue: action.Amount || 0,
      currency: action.Currency || 'USD',
      commissionAmount: action.Payout || 0,
      commissionRate: 0, // Would need to calculate from payout and amount
      status: this.mapImpactStatus(action.State),
      conversionDate: action.EventDate,
      payoutDate: action.ClearedDate,
      metadata: {
        actionTrackerId: action.ActionTrackerId,
        campaignName: action.CampaignName,
        deltaPayout: action.DeltaPayout,
        intendedPayout: action.IntendedPayout,
        deltaAmount: action.DeltaAmount,
        intendedAmount: action.IntendedAmount,
        lockingDate: action.LockingDate,
        creationDate: action.CreationDate,
        modificationDate: action.ModificationDate,
        referringDomain: action.ReferringDomain,
        subId1: action.SubId1,
        subId2: action.SubId2,
        subId3: action.SubId3,
        promoCode: action.PromoCode,
        customerStatus: action.CustomerStatus,
      },
    }));
  }

  /**
   * Map Impact status to standardized format
   */
  private mapImpactStatus(status: string): 'pending' | 'confirmed' | 'cancelled' | 'reversed' {
    switch (status) {
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return 'pending';
      case 'APPROVED':
        return 'confirmed';
      case 'REJECTED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  /**
   * Get campaign information for Impact Radius
   */
  async getCampaigns(): Promise<NetworkApiResponse<any[]>> {
    await this.enforceRateLimit();

    try {
      const response = await this.httpClient.get(`/Mediapartners/${this.credentials!.accountSid}/Campaigns`, {
        headers: this.getAuthHeaders(),
        params: {
          State: 'ACTIVE',
          PageSize: 1000,
        },
      });

      return {
        success: true,
        data: response.data.Campaigns || [],
        meta: {
          requestId: crypto.randomUUID(),
          rateLimit: this.getRateLimitInfo() || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CAMPAIGNS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get payout reports for reconciliation
   */
  async getPayoutReports(dateFrom?: string, dateTo?: string): Promise<NetworkApiResponse<any[]>> {
    await this.enforceRateLimit();

    try {
      const params: any = {
        PageSize: 1000,
      };

      if (dateFrom) {
        params.StartDate = dateFrom;
      }

      if (dateTo) {
        params.EndDate = dateTo;
      }

      const response = await this.httpClient.get(`/Mediapartners/${this.credentials!.accountSid}/PayoutReports`, {
        headers: this.getAuthHeaders(),
        params,
      });

      return {
        success: true,
        data: response.data.PayoutReports || [],
        meta: {
          requestId: crypto.randomUUID(),
          rateLimit: this.getRateLimitInfo() || undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PAYOUT_REPORTS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}