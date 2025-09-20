import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  AffiliateNetworkType,
  AffiliateNetworkConfig,
  AffiliateProduct,
  Click,
  Conversion,
  CommissionStructure,
  SyncOperation,
  BulkOperation,
  BulkOperationResult,
  NetworkApiResponse,
  PaginatedRequest,
  WebhookPayload,
  AffiliateNetworkError,
  RateLimitError,
  AuthenticationError,
  RateLimitInfo,
} from '../types';

export interface AdapterCapabilities {
  supportsProductSync: boolean;
  supportsCommissionSync: boolean;
  supportsClickTracking: boolean;
  supportsConversionTracking: boolean;
  supportsWebhooks: boolean;
  supportsBulkOperations: boolean;
  supportsRealTimeUpdates: boolean;
  maxBatchSize: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

export interface AuthenticationCredentials {
  [key: string]: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ProductSyncOptions {
  fullSync?: boolean;
  merchantIds?: string[];
  categories?: string[];
  updatedSince?: string;
  batchSize?: number;
}

export interface CommissionSyncOptions {
  dateFrom?: string;
  dateTo?: string;
  merchantIds?: string[];
  status?: string[];
}

/**
 * Abstract base class for all affiliate network adapters
 * Provides common functionality and enforces consistent interface
 */
export abstract class AffiliateNetworkAdapter {
  protected httpClient: AxiosInstance;
  protected config: AffiliateNetworkConfig;
  protected rateLimitInfo: RateLimitInfo | null = null;
  protected lastRequestTime: number = 0;

  constructor(config: AffiliateNetworkConfig) {
    this.config = config;
    this.httpClient = this.createHttpClient();
  }

  // =============================================================================
  // Abstract Methods - Must be implemented by each network
  // =============================================================================

  abstract get networkType(): AffiliateNetworkType;
  abstract get capabilities(): AdapterCapabilities;

  /**
   * Authenticate with the affiliate network
   */
  abstract authenticate(credentials: AuthenticationCredentials): Promise<boolean>;

  /**
   * Test the connection and authentication
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Sync products from the network
   */
  abstract syncProducts(options?: ProductSyncOptions): Promise<SyncOperation>;

  /**
   * Sync commission structures
   */
  abstract syncCommissions(options?: CommissionSyncOptions): Promise<CommissionStructure[]>;

  /**
   * Get products with pagination
   */
  abstract getProducts(request: PaginatedRequest): Promise<NetworkApiResponse<AffiliateProduct[]>>;

  /**
   * Get a single product by network ID
   */
  abstract getProduct(networkProductId: string): Promise<NetworkApiResponse<AffiliateProduct>>;

  /**
   * Generate affiliate link for a product
   */
  abstract generateAffiliateLink(productId: string, customParams?: Record<string, string>): Promise<string>;

  /**
   * Track a click
   */
  abstract trackClick(click: Omit<Click, 'id' | 'tenantId'>): Promise<NetworkApiResponse<Click>>;

  /**
   * Get conversions
   */
  abstract getConversions(dateFrom?: string, dateTo?: string): Promise<NetworkApiResponse<Conversion[]>>;

  /**
   * Handle webhook payload
   */
  abstract handleWebhook(payload: WebhookPayload): Promise<void>;

  /**
   * Validate webhook signature
   */
  abstract validateWebhookSignature(payload: string, signature: string): boolean;

  // =============================================================================
  // Common Implementation Methods
  // =============================================================================

  /**
   * Create configured HTTP client
   */
  protected createHttpClient(): AxiosInstance {
    const client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'AffiliateOS/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    client.interceptors.request.use((config) => {
      return this.addAuthHeaders(config);
    });

    // Add response interceptor for rate limiting and error handling
    client.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response);
        return response;
      },
      (error) => {
        return this.handleHttpError(error);
      }
    );

    return client;
  }

  /**
   * Add authentication headers to requests
   */
  protected abstract addAuthHeaders(config: AxiosRequestConfig): AxiosRequestConfig;

  /**
   * Update rate limit information from response headers
   */
  protected updateRateLimitInfo(response: AxiosResponse): void {
    const headers = response.headers;
    
    // Common rate limit header patterns
    const limit = this.parseHeader(headers['x-ratelimit-limit'] || headers['x-rate-limit-limit']);
    const remaining = this.parseHeader(headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining']);
    const resetAt = headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'];
    const retryAfter = this.parseHeader(headers['retry-after']);

    if (limit && remaining !== null) {
      this.rateLimitInfo = {
        limit,
        remaining,
        resetAt: resetAt ? new Date(parseInt(resetAt) * 1000).toISOString() : new Date().toISOString(),
        retryAfter: retryAfter || undefined,
      };
    }
  }

  /**
   * Parse header value to number
   */
  private parseHeader(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Handle HTTP errors and convert to appropriate exceptions
   */
  protected handleHttpError(error: any): Promise<never> {
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 429) {
        const retryAfter = this.parseHeader(error.response.headers['retry-after']) || 60;
        throw new RateLimitError(
          this.networkType,
          retryAfter,
          this.rateLimitInfo?.limit || 0,
          this.rateLimitInfo?.remaining || 0
        );
      }
      
      if (status === 401 || status === 403) {
        throw new AuthenticationError(this.networkType, data?.message || 'Authentication failed');
      }
      
      throw new AffiliateNetworkError(
        data?.message || `HTTP ${status} error`,
        this.networkType,
        data?.code || `HTTP_${status}`,
        status,
        status >= 500 // 5xx errors are retryable
      );
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new AffiliateNetworkError(
        'Request timeout',
        this.networkType,
        'TIMEOUT',
        undefined,
        true
      );
    }
    
    throw new AffiliateNetworkError(
      error.message || 'Unknown network error',
      this.networkType,
      'UNKNOWN_ERROR',
      undefined,
      true
    );
  }

  /**
   * Implement rate limiting
   */
  protected async enforceRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) return;

    const { remaining, retryAfter } = this.rateLimitInfo;
    
    if (remaining <= 0 && retryAfter) {
      await this.sleep(retryAfter * 1000);
    }

    // Implement basic rate limiting based on requests per minute
    const capabilities = this.capabilities;
    const minInterval = 60000 / capabilities.rateLimits.requestsPerMinute; // ms between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    
    if (timeSinceLastRequest < minInterval) {
      await this.sleep(minInterval - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute bulk operations with proper batching and error handling
   */
  protected async executeBulkOperation<T, R>(
    operation: BulkOperation<T>,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<BulkOperationResult> {
    const startTime = Date.now();
    const batchSize = operation.batchSize || this.capabilities.maxBatchSize;
    const { data, continueOnError = true } = operation;
    
    const result: BulkOperationResult = {
      totalRecords: data.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      duration: 0,
    };

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        await this.enforceRateLimit();
        await processor(batch);
        result.successCount += batch.length;
      } catch (error) {
        result.errorCount += batch.length;
        
        // Record errors for each item in the batch
        batch.forEach((_, index) => {
          result.errors.push({
            index: i + index,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: error instanceof AffiliateNetworkError ? error.retryable : false,
          });
        });

        if (!continueOnError) {
          break;
        }
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const isRetryable = error instanceof AffiliateNetworkError && error.retryable;
        
        if (isLastAttempt || !isRetryable) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.sleep(delay);
      }
    }
    
    throw new Error('Retry logic error'); // Should never reach here
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Update adapter configuration
   */
  public updateConfig(config: Partial<AffiliateNetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get adapter configuration
   */
  public getConfig(): AffiliateNetworkConfig {
    return { ...this.config };
  }

  /**
   * Get network status information
   */
  public async getNetworkStatus(): Promise<{
    connected: boolean;
    lastSync?: string;
    rateLimitInfo?: RateLimitInfo;
    error?: string;
  }> {
    try {
      const connected = await this.testConnection();
      return {
        connected,
        lastSync: this.config.lastSyncAt || undefined,
        rateLimitInfo: this.rateLimitInfo || undefined,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}