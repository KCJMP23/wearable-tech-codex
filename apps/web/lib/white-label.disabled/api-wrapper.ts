import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { domainMapper } from './domain-mapper';

export interface WhiteLabelAPIConfig {
  id: string;
  tenantId: string;
  customDomain?: string;
  apiSubdomain?: string; // api.customdomain.com
  customApiKey?: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  allowedOrigins: string[];
  enableCORS: boolean;
  customHeaders: Record<string, string>;
  responseFormat: 'json' | 'xml' | 'custom';
  errorBranding: {
    errorPageUrl?: string;
    supportEmail?: string;
    contactUrl?: string;
  };
  webhookEndpoints: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    tenant: string;
    timestamp: string;
    requestId: string;
    rateLimit?: {
      remaining: number;
      reset: number;
    };
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  windowStart: number;
}

export class WhiteLabelAPIWrapper {
  private supabase;
  private rateLimitCache: Map<string, RateLimitInfo> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Handle white-labeled API request
   */
  async handleAPIRequest(
    request: NextRequest,
    endpoint: string
  ): Promise<NextResponse> {
    try {
      // Extract domain and tenant info
      const domain = await domainMapper.extractDomain(request);
      const tenantMapping = await domainMapper.mapDomainToTenant(domain);

      if (!tenantMapping) {
        return this.createErrorResponse('TENANT_NOT_FOUND', 'Tenant not found for domain', 404);
      }

      // Get API configuration
      const apiConfig = await this.getAPIConfig(tenantMapping.tenantId);
      if (!apiConfig || !apiConfig.isActive) {
        return this.createErrorResponse('API_DISABLED', 'API access is disabled', 403);
      }

      // Validate rate limits
      const rateLimitResult = await this.checkRateLimit(tenantMapping.tenantId, request);
      if (!rateLimitResult.allowed) {
        return this.createRateLimitResponse(rateLimitResult);
      }

      // Validate CORS
      if (apiConfig.enableCORS) {
        const corsResult = this.validateCORS(request, apiConfig);
        if (!corsResult.allowed) {
          return this.createErrorResponse('CORS_VIOLATION', 'CORS policy violation', 403);
        }
      }

      // Generate request ID for tracing
      const requestId = this.generateRequestId();

      // Process the API request
      const response = await this.processAPIRequest(
        request,
        endpoint,
        tenantMapping.tenantId,
        apiConfig,
        requestId
      );

      // Add custom headers
      this.addCustomHeaders(response, apiConfig);

      // Add rate limit headers
      this.addRateLimitHeaders(response, rateLimitResult.rateLimit);

      // Log API usage
      await this.logAPIUsage(tenantMapping.tenantId, request, response, requestId);

      return response;
    } catch (error) {
      console.error('API wrapper error:', error);
      return this.createErrorResponse(
        'INTERNAL_ERROR',
        'An internal error occurred',
        500
      );
    }
  }

  /**
   * Get tenant API configuration
   */
  async getAPIConfig(tenantId: string): Promise<WhiteLabelAPIConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_api_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return this.getDefaultAPIConfig(tenantId);
      }

      return this.transformAPIConfigData(data);
    } catch (error) {
      console.error('Error fetching API config:', error);
      return this.getDefaultAPIConfig(tenantId);
    }
  }

  /**
   * Update tenant API configuration
   */
  async updateAPIConfig(
    tenantId: string,
    config: Partial<WhiteLabelAPIConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('tenant_api_config')
        .upsert({
          tenant_id: tenantId,
          custom_domain: config.customDomain,
          api_subdomain: config.apiSubdomain,
          custom_api_key: config.customApiKey,
          rate_limits: config.rateLimits || {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            requestsPerDay: 10000,
          },
          allowed_origins: config.allowedOrigins || [],
          enable_cors: config.enableCORS !== false,
          custom_headers: config.customHeaders || {},
          response_format: config.responseFormat || 'json',
          error_branding: config.errorBranding || {},
          webhook_endpoints: config.webhookEndpoints || [],
          is_active: config.isActive !== false,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(
    tenantId: string,
    request: NextRequest
  ): Promise<{ allowed: boolean; rateLimit: RateLimitInfo }> {
    const clientIP = this.getClientIP(request);
    const cacheKey = `${tenantId}:${clientIP}`;
    
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window

    let rateLimit = this.rateLimitCache.get(cacheKey);
    
    if (!rateLimit || rateLimit.windowStart !== windowStart) {
      // Get API config for limits
      const apiConfig = await this.getAPIConfig(tenantId);
      const limit = apiConfig?.rateLimits.requestsPerMinute || 60;
      
      rateLimit = {
        limit,
        remaining: limit - 1,
        reset: windowStart + 60000,
        windowStart,
      };
    } else {
      rateLimit.remaining = Math.max(0, rateLimit.remaining - 1);
    }

    this.rateLimitCache.set(cacheKey, rateLimit);

    return {
      allowed: rateLimit.remaining >= 0,
      rateLimit,
    };
  }

  /**
   * Validate CORS
   */
  private validateCORS(
    request: NextRequest,
    config: WhiteLabelAPIConfig
  ): { allowed: boolean; origin?: string } {
    const origin = request.headers.get('origin');
    
    if (!origin) {
      return { allowed: true }; // Non-browser requests
    }

    if (config.allowedOrigins.includes('*')) {
      return { allowed: true, origin };
    }

    const allowed = config.allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === origin) return true;
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2);
        return origin.endsWith(`.${domain}`) || origin === domain;
      }
      return false;
    });

    return { allowed, origin };
  }

  /**
   * Process API request based on endpoint
   */
  private async processAPIRequest(
    request: NextRequest,
    endpoint: string,
    tenantId: string,
    config: WhiteLabelAPIConfig,
    requestId: string
  ): Promise<NextResponse> {
    const method = request.method;
    const url = new URL(request.url);
    const pathSegments = endpoint.split('/').filter(Boolean);

    // Route to appropriate handler based on endpoint
    switch (pathSegments[0]) {
      case 'products':
        return this.handleProductsAPI(request, pathSegments.slice(1), tenantId, config);
      case 'content':
        return this.handleContentAPI(request, pathSegments.slice(1), tenantId, config);
      case 'analytics':
        return this.handleAnalyticsAPI(request, pathSegments.slice(1), tenantId, config);
      case 'notifications':
        return this.handleNotificationsAPI(request, pathSegments.slice(1), tenantId, config);
      case 'webhooks':
        return this.handleWebhooksAPI(request, pathSegments.slice(1), tenantId, config);
      default:
        return this.createErrorResponse('ENDPOINT_NOT_FOUND', 'API endpoint not found', 404);
    }
  }

  /**
   * Handle products API
   */
  private async handleProductsAPI(
    request: NextRequest,
    pathSegments: string[],
    tenantId: string,
    config: WhiteLabelAPIConfig
  ): Promise<NextResponse> {
    const method = request.method;

    if (method === 'GET') {
      if (pathSegments.length === 0) {
        // GET /products - list products
        return this.listProducts(tenantId, request);
      } else if (pathSegments.length === 1) {
        // GET /products/:id - get product
        return this.getProduct(tenantId, pathSegments[0]);
      }
    }

    return this.createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  /**
   * Handle content API
   */
  private async handleContentAPI(
    request: NextRequest,
    pathSegments: string[],
    tenantId: string,
    config: WhiteLabelAPIConfig
  ): Promise<NextResponse> {
    const method = request.method;

    if (method === 'GET') {
      if (pathSegments.length === 0) {
        // GET /content - list posts
        return this.listPosts(tenantId, request);
      } else if (pathSegments.length === 1) {
        // GET /content/:slug - get post
        return this.getPost(tenantId, pathSegments[0]);
      }
    }

    return this.createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  /**
   * Handle analytics API
   */
  private async handleAnalyticsAPI(
    request: NextRequest,
    pathSegments: string[],
    tenantId: string,
    config: WhiteLabelAPIConfig
  ): Promise<NextResponse> {
    const method = request.method;

    if (method === 'POST' && pathSegments[0] === 'events') {
      return this.trackEvent(tenantId, request);
    }

    if (method === 'GET' && pathSegments[0] === 'reports') {
      return this.getAnalyticsReport(tenantId, request);
    }

    return this.createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  /**
   * Handle notifications API
   */
  private async handleNotificationsAPI(
    request: NextRequest,
    pathSegments: string[],
    tenantId: string,
    config: WhiteLabelAPIConfig
  ): Promise<NextResponse> {
    const method = request.method;

    if (method === 'POST') {
      return this.sendNotification(tenantId, request);
    }

    return this.createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  /**
   * Handle webhooks API
   */
  private async handleWebhooksAPI(
    request: NextRequest,
    pathSegments: string[],
    tenantId: string,
    config: WhiteLabelAPIConfig
  ): Promise<NextResponse> {
    // Webhook management endpoints
    return this.createErrorResponse('NOT_IMPLEMENTED', 'Webhooks API not implemented', 501);
  }

  /**
   * API endpoint implementations
   */
  private async listProducts(tenantId: string, request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return this.createErrorResponse('DATABASE_ERROR', error.message, 500);
    }

    return this.createSuccessResponse(data, {
      pagination: {
        limit,
        offset,
        total: data.length,
      },
    });
  }

  private async getProduct(tenantId: string, productId: string): Promise<NextResponse> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .single();

    if (error) {
      return this.createErrorResponse('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }

    return this.createSuccessResponse(data);
  }

  private async listPosts(tenantId: string, request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .range(offset, offset + limit - 1)
      .order('published_at', { ascending: false });

    if (error) {
      return this.createErrorResponse('DATABASE_ERROR', error.message, 500);
    }

    return this.createSuccessResponse(data, {
      pagination: {
        limit,
        offset,
        total: data.length,
      },
    });
  }

  private async getPost(tenantId: string, slug: string): Promise<NextResponse> {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      return this.createErrorResponse('POST_NOT_FOUND', 'Post not found', 404);
    }

    return this.createSuccessResponse(data);
  }

  private async trackEvent(tenantId: string, request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { tenantAnalytics } = await import('./analytics');
      
      const result = await tenantAnalytics.trackEvent(tenantId, {
        eventName: body.event_name,
        eventData: body.event_data || {},
        userId: body.user_id,
        sessionId: body.session_id || this.generateRequestId(),
        deviceType: body.device_type || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        ipAddress: this.getClientIP(request),
        page: body.page || '',
      });

      if (!result.success) {
        return this.createErrorResponse('TRACKING_ERROR', result.error!, 500);
      }

      return this.createSuccessResponse({ tracked: true });
    } catch (error) {
      return this.createErrorResponse('INVALID_REQUEST', 'Invalid request body', 400);
    }
  }

  private async getAnalyticsReport(tenantId: string, request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    if (!startDate || !endDate) {
      return this.createErrorResponse('MISSING_PARAMS', 'start_date and end_date are required', 400);
    }

    const { tenantAnalytics } = await import('./analytics');
    const report = await tenantAnalytics.generateReport(
      tenantId,
      new Date(startDate),
      new Date(endDate)
    );

    if (!report) {
      return this.createErrorResponse('REPORT_ERROR', 'Failed to generate report', 500);
    }

    return this.createSuccessResponse(report);
  }

  private async sendNotification(tenantId: string, request: NextRequest): Promise<NextResponse> {
    // Implementation for sending notifications
    return this.createErrorResponse('NOT_IMPLEMENTED', 'Notifications API not implemented', 501);
  }

  /**
   * Response helpers
   */
  private createSuccessResponse<T>(data: T, meta?: any): NextResponse {
    const response: APIResponse<T> = {
      success: true,
      data,
      meta: {
        tenant: 'white-label',
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        ...meta,
      },
    };

    return NextResponse.json(response);
  }

  private createErrorResponse(
    code: string,
    message: string,
    status: number,
    details?: any
  ): NextResponse {
    const response: APIResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        tenant: 'white-label',
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      },
    };

    return NextResponse.json(response, { status });
  }

  private createRateLimitResponse(result: { rateLimit: RateLimitInfo }): NextResponse {
    const response = this.createErrorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Rate limit exceeded',
      429
    );

    response.headers.set('X-RateLimit-Limit', result.rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', result.rateLimit.reset.toString());

    return response;
  }

  /**
   * Helper methods
   */
  private addCustomHeaders(response: NextResponse, config: WhiteLabelAPIConfig): void {
    Object.entries(config.customHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  private addRateLimitHeaders(response: NextResponse, rateLimit: RateLimitInfo): void {
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async logAPIUsage(
    tenantId: string,
    request: NextRequest,
    response: NextResponse,
    requestId: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('api_usage_logs')
        .insert({
          tenant_id: tenantId,
          endpoint: new URL(request.url).pathname,
          method: request.method,
          status_code: response.status,
          user_agent: request.headers.get('user-agent'),
          ip_address: this.getClientIP(request),
          request_id: requestId,
        });
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  /**
   * Transform database data
   */
  private transformAPIConfigData(data: any): WhiteLabelAPIConfig {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      customDomain: data.custom_domain,
      apiSubdomain: data.api_subdomain,
      customApiKey: data.custom_api_key,
      rateLimits: data.rate_limits || {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      allowedOrigins: data.allowed_origins || [],
      enableCORS: data.enable_cors !== false,
      customHeaders: data.custom_headers || {},
      responseFormat: data.response_format || 'json',
      errorBranding: data.error_branding || {},
      webhookEndpoints: data.webhook_endpoints || [],
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get default API config
   */
  private getDefaultAPIConfig(tenantId: string): WhiteLabelAPIConfig {
    return {
      id: 'default',
      tenantId,
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      allowedOrigins: ['*'],
      enableCORS: true,
      customHeaders: {},
      responseFormat: 'json',
      errorBranding: {},
      webhookEndpoints: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const whiteLabelAPIWrapper = new WhiteLabelAPIWrapper();