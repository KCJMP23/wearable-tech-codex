/**
 * Phase 2 API Services
 * Demonstrates Next.js 14 App Router patterns with TypeScript
 * 
 * This file shows how to use the comprehensive Phase 2 database schema
 * with strict TypeScript patterns and Supabase integration.
 */

import { 
  getSupabaseClient, 
  TypedSupabaseClient,
  type Database,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from '../index.js';
import type {
  Brand,
  BrandPartnership,
  PrivateMarketplaceProduct,
  MobileDevice,
  NotificationCampaign,
  DeveloperApp,
  AppInstallation,
  ConversionEvent,
  WebhookDelivery,
  ApiResponse,
  PaginatedResponse,
  CreateBrandRequest,
  CreatePartnershipRequest,
  CreateAppRequest,
  InstallAppRequest,
  CreateNotificationCampaignRequest,
  RegisterDeviceRequest,
} from '../types.js';

// =============================================================================
// Brand & Partnership Management Service
// =============================================================================

export class BrandService {
  private client: TypedSupabaseClient;

  constructor(client?: TypedSupabaseClient) {
    this.client = client || getSupabaseClient('service');
  }

  /**
   * Create a new brand partnership
   */
  async createBrand(request: CreateBrandRequest): Promise<ApiResponse<Brand>> {
    try {
      const { data, error } = await this.client
        .from('brands')
        .insert([{
          name: request.name,
          slug: request.slug || request.name.toLowerCase().replace(/\s+/g, '-'),
          description: request.description,
          logo_url: request.logoUrl,
          website_url: request.websiteUrl,
          commission_rate: request.commissionRate,
          exclusive_rate: request.exclusiveRate,
          contact_email: request.contactEmail,
          api_endpoint: request.apiEndpoint,
          tier: request.tier || 'standard',
          metadata: request.metadata || {},
        }])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'CREATE_BRAND_FAILED',
            message: error.message,
            details: { error }
          }
        };
      }

      return {
        success: true,
        data: this.mapBrandRowToBrand(data)
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  /**
   * Get brands with pagination and filtering
   */
  async getBrands(params?: {
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
  }): Promise<PaginatedResponse<Brand>> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 20;
      const offset = (page - 1) * limit;

      let query = this.client
        .from('brands')
        .select('*', { count: 'exact' });

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      if (params?.tier) {
        query = query.eq('tier', params.tier);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: {
            code: 'GET_BRANDS_FAILED',
            message: error.message,
          }
        };
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: data.map(row => this.mapBrandRowToBrand(row)),
        meta: {
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          }
        }
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  /**
   * Create a brand partnership for a tenant
   */
  async createPartnership(
    tenantId: string, 
    request: CreatePartnershipRequest
  ): Promise<ApiResponse<BrandPartnership>> {
    try {
      const { data, error } = await this.client
        .from('brand_partnerships')
        .insert([{
          tenant_id: tenantId,
          brand_id: request.brandId,
          commission_rate: request.commissionRate,
          contract_start_date: request.contractStartDate,
          contract_end_date: request.contractEndDate,
          exclusive: request.exclusive || false,
          performance_bonus: request.performanceBonus || {},
        }])
        .select(`
          *,
          brand:brands(*)
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'CREATE_PARTNERSHIP_FAILED',
            message: error.message,
          }
        };
      }

      return {
        success: true,
        data: this.mapPartnershipRowToPartnership(data)
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  private mapBrandRowToBrand(row: Tables<'brands'>): Brand {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      logoUrl: row.logo_url,
      websiteUrl: row.website_url,
      commissionRate: row.commission_rate,
      exclusiveRate: row.exclusive_rate,
      contactEmail: row.contact_email,
      apiEndpoint: row.api_endpoint,
      apiKeyEncrypted: row.api_key_encrypted,
      status: row.status as Brand['status'],
      tier: row.tier as Brand['tier'],
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPartnershipRowToPartnership(row: any): BrandPartnership {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      commissionRate: row.commission_rate,
      status: row.status as BrandPartnership['status'],
      contractStartDate: row.contract_start_date,
      contractEndDate: row.contract_end_date,
      exclusive: row.exclusive,
      performanceBonus: row.performance_bonus as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      brand: row.brand ? this.mapBrandRowToBrand(row.brand) : undefined,
    };
  }
}

// =============================================================================
// Mobile Device & Notification Service
// =============================================================================

export class MobileService {
  private client: TypedSupabaseClient;

  constructor(client?: TypedSupabaseClient) {
    this.client = client || getSupabaseClient('service');
  }

  /**
   * Register a mobile device for push notifications
   */
  async registerDevice(
    tenantId: string,
    request: RegisterDeviceRequest
  ): Promise<ApiResponse<MobileDevice>> {
    try {
      const { data, error } = await this.client
        .from('mobile_devices')
        .upsert([{
          tenant_id: tenantId,
          user_identifier: request.userIdentifier,
          device_type: request.deviceType,
          device_token: request.deviceToken,
          app_version: request.appVersion,
          os_version: request.osVersion,
          timezone: request.timezone,
          language: request.language,
          active: true,
          last_seen_at: new Date().toISOString(),
        }], {
          onConflict: 'tenant_id,user_identifier,device_token'
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'REGISTER_DEVICE_FAILED',
            message: error.message,
          }
        };
      }

      return {
        success: true,
        data: this.mapMobileDeviceRowToDevice(data)
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  /**
   * Create a notification campaign
   */
  async createNotificationCampaign(
    tenantId: string,
    request: CreateNotificationCampaignRequest
  ): Promise<ApiResponse<NotificationCampaign>> {
    try {
      const { data, error } = await this.client
        .from('notification_campaigns')
        .insert([{
          tenant_id: tenantId,
          name: request.name,
          type: request.type,
          title: request.title,
          body: request.body,
          image_url: request.imageUrl,
          deep_link: request.deepLink,
          target_audience: request.targetAudience || {},
          scheduled_at: request.scheduledAt,
          status: 'scheduled',
          delivery_stats: {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            failed: 0
          },
        }])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'CREATE_CAMPAIGN_FAILED',
            message: error.message,
          }
        };
      }

      return {
        success: true,
        data: this.mapNotificationCampaignRowToCampaign(data)
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  private mapMobileDeviceRowToDevice(row: Tables<'mobile_devices'>): MobileDevice {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userIdentifier: row.user_identifier,
      deviceType: row.device_type as MobileDevice['deviceType'],
      deviceToken: row.device_token,
      appVersion: row.app_version,
      osVersion: row.os_version,
      timezone: row.timezone,
      language: row.language,
      active: row.active,
      lastSeenAt: row.last_seen_at,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapNotificationCampaignRowToCampaign(row: Tables<'notification_campaigns'>): NotificationCampaign {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type as NotificationCampaign['type'],
      title: row.title,
      body: row.body,
      imageUrl: row.image_url,
      deepLink: row.deep_link,
      targetAudience: row.target_audience as Record<string, unknown>,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      status: row.status as NotificationCampaign['status'],
      deliveryStats: row.delivery_stats as NotificationCampaign['deliveryStats'],
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// =============================================================================
// Developer App & API Management Service
// =============================================================================

export class DeveloperService {
  private client: TypedSupabaseClient;

  constructor(client?: TypedSupabaseClient) {
    this.client = client || getSupabaseClient('service');
  }

  /**
   * Create a new developer app
   */
  async createApp(
    developerId: string,
    request: CreateAppRequest
  ): Promise<ApiResponse<DeveloperApp>> {
    try {
      // Generate API key and secret
      const apiKey = this.generateApiKey();
      const secretKey = this.generateSecretKey();
      const secretKeyHash = await this.hashSecret(secretKey);

      const { data, error } = await this.client
        .from('developer_apps')
        .insert([{
          developer_id: developerId,
          name: request.name,
          description: request.description,
          category: request.category,
          api_key: apiKey,
          secret_key_hash: secretKeyHash,
          webhook_url: request.webhookUrl,
          permissions: request.permissions,
          pricing_model: request.pricingModel || 'free',
          pricing_details: request.pricingDetails || {},
          status: 'pending_review',
        }])
        .select(`
          *,
          developer:developer_profiles(*)
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'CREATE_APP_FAILED',
            message: error.message,
          }
        };
      }

      const app = this.mapDeveloperAppRowToApp(data);
      
      // Return the secret key only once during creation
      return {
        success: true,
        data: {
          ...app,
          secretKey, // Include secret key in response for developer to save
        }
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  /**
   * Install an app for a tenant
   */
  async installApp(
    tenantId: string,
    request: InstallAppRequest
  ): Promise<ApiResponse<AppInstallation>> {
    try {
      const { data, error } = await this.client
        .from('app_installations')
        .insert([{
          tenant_id: tenantId,
          app_id: request.appId,
          config: request.config || {},
          status: 'active',
          installed_at: new Date().toISOString(),
          usage_stats: {
            totalRequests: 0,
            lastRequest: null,
            requestsThisMonth: 0,
            errorsThisMonth: 0,
          },
        }])
        .select(`
          *,
          app:developer_apps(*),
          tenant:tenants(*)
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'INSTALL_APP_FAILED',
            message: error.message,
          }
        };
      }

      // Update app install count
      await this.client
        .from('developer_apps')
        .update({ 
          installs_count: data.app.installs_count + 1 
        })
        .eq('id', request.appId);

      return {
        success: true,
        data: this.mapAppInstallationRowToInstallation(data)
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  /**
   * Log API usage for rate limiting and analytics
   */
  async logApiUsage(params: {
    appId: string;
    tenantId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs?: number;
    requestSizeBytes?: number;
    responseSizeBytes?: number;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      await this.client
        .from('api_usage_logs')
        .insert([{
          app_id: params.appId,
          tenant_id: params.tenantId,
          endpoint: params.endpoint,
          method: params.method,
          status_code: params.statusCode,
          response_time_ms: params.responseTimeMs,
          request_size_bytes: params.requestSizeBytes,
          response_size_bytes: params.responseSizeBytes,
          user_agent: params.userAgent,
          ip_address: params.ipAddress,
        }]);
    } catch (err) {
      // Log error but don't throw - usage logging should not break the main flow
      console.error('Failed to log API usage:', err);
    }
  }

  private generateApiKey(): string {
    return `ak_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSecretKey(): string {
    return `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  private async hashSecret(secret: string): Promise<string> {
    // In a real implementation, use bcrypt or similar
    // This is a simplified example
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private mapDeveloperAppRowToApp(row: any): DeveloperApp {
    return {
      id: row.id,
      developerId: row.developer_id,
      name: row.name,
      description: row.description,
      category: row.category as DeveloperApp['category'],
      apiKey: row.api_key,
      secretKeyHash: row.secret_key_hash,
      webhookUrl: row.webhook_url,
      webhookSecret: row.webhook_secret,
      permissions: row.permissions,
      pricingModel: row.pricing_model as DeveloperApp['pricingModel'],
      pricingDetails: row.pricing_details as Record<string, unknown>,
      status: row.status as DeveloperApp['status'],
      installsCount: row.installs_count,
      rating: row.rating,
      ratingCount: row.rating_count,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      developer: row.developer ? {
        id: row.developer.id,
        userId: row.developer.user_id,
        name: row.developer.name,
        company: row.developer.company,
        email: row.developer.email,
        website: row.developer.website,
        bio: row.developer.bio,
        avatarUrl: row.developer.avatar_url,
        verified: row.developer.verified,
        tier: row.developer.tier as DeveloperApp['developer']['tier'],
        createdAt: row.developer.created_at,
        updatedAt: row.developer.updated_at,
      } : undefined,
    };
  }

  private mapAppInstallationRowToInstallation(row: any): AppInstallation {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      appId: row.app_id,
      status: row.status as AppInstallation['status'],
      config: row.config as Record<string, unknown>,
      installedBy: row.installed_by,
      installedAt: row.installed_at,
      lastUsedAt: row.last_used_at,
      usageStats: row.usage_stats as AppInstallation['usageStats'],
      app: row.app ? this.mapDeveloperAppRowToApp(row.app) : undefined,
      tenant: row.tenant ? {
        id: row.tenant.id,
        name: row.tenant.name,
        slug: row.tenant.slug,
        domain: row.tenant.domain,
        theme: row.tenant.config as Record<string, unknown>,
        logoUrl: null,
        colorTokens: {},
        status: row.tenant.active ? 'active' : 'inactive',
        createdAt: row.tenant.created_at,
      } : undefined,
    };
  }
}

// =============================================================================
// Analytics & Conversion Tracking Service
// =============================================================================

export class AnalyticsService {
  private client: TypedSupabaseClient;

  constructor(client?: TypedSupabaseClient) {
    this.client = client || getSupabaseClient('service');
  }

  /**
   * Track a conversion event
   */
  async trackConversion(params: {
    tenantId: string;
    userIdentifier?: string;
    sessionId?: string;
    eventType: string;
    productId?: string;
    brandId?: string;
    affiliateUrl?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    deviceType?: string;
    conversionValue?: number;
    currency?: string;
    commissionEarned?: number;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<ConversionEvent>> {
    try {
      const { data, error } = await this.client
        .from('conversion_events')
        .insert([{
          tenant_id: params.tenantId,
          user_identifier: params.userIdentifier,
          session_id: params.sessionId,
          event_type: params.eventType,
          product_id: params.productId,
          brand_id: params.brandId,
          affiliate_url: params.affiliateUrl,
          referrer: params.referrer,
          user_agent: params.userAgent,
          ip_address: params.ipAddress,
          country: params.country,
          device_type: params.deviceType,
          conversion_value: params.conversionValue,
          currency: params.currency || 'USD',
          commission_earned: params.commissionEarned,
          metadata: params.metadata || {},
        }])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'TRACK_CONVERSION_FAILED',
            message: error.message,
          }
        };
      }

      return {
        success: true,
        data: this.mapConversionEventRowToEvent(data)
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  /**
   * Get conversion analytics for a tenant
   */
  async getConversionAnalytics(
    tenantId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      eventType?: string;
      groupBy?: 'day' | 'week' | 'month';
    }
  ): Promise<ApiResponse<any>> {
    try {
      let query = this.client
        .from('conversion_events')
        .select('*')
        .eq('tenant_id', tenantId);

      if (params?.startDate) {
        query = query.gte('created_at', params.startDate);
      }

      if (params?.endDate) {
        query = query.lte('created_at', params.endDate);
      }

      if (params?.eventType) {
        query = query.eq('event_type', params.eventType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: {
            code: 'GET_ANALYTICS_FAILED',
            message: error.message,
          }
        };
      }

      // Process and aggregate data based on groupBy parameter
      const processedData = this.processAnalyticsData(data, params?.groupBy);

      return {
        success: true,
        data: processedData
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        }
      };
    }
  }

  private mapConversionEventRowToEvent(row: Tables<'conversion_events'>): ConversionEvent {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userIdentifier: row.user_identifier,
      sessionId: row.session_id,
      eventType: row.event_type,
      productId: row.product_id,
      brandId: row.brand_id,
      affiliateUrl: row.affiliate_url,
      referrer: row.referrer,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      country: row.country,
      deviceType: row.device_type,
      conversionValue: row.conversion_value,
      currency: row.currency,
      commissionEarned: row.commission_earned,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
    };
  }

  private processAnalyticsData(data: any[], groupBy?: string): any {
    // Implementation for data aggregation
    // This is a simplified example - in production you might use SQL aggregation
    const events = data.map(row => this.mapConversionEventRowToEvent(row));
    
    return {
      totalEvents: events.length,
      totalRevenue: events.reduce((sum, event) => sum + (event.conversionValue || 0), 0),
      totalCommission: events.reduce((sum, event) => sum + (event.commissionEarned || 0), 0),
      eventTypes: this.groupEventsByType(events),
      timeline: groupBy ? this.groupEventsByTime(events, groupBy) : null,
    };
  }

  private groupEventsByType(events: ConversionEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupEventsByTime(events: ConversionEvent[], groupBy: string): any[] {
    // Simplified time grouping - in production use more sophisticated date handling
    return events.reduce((acc, event) => {
      const date = new Date(event.createdAt);
      let key: string;
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          // Simplified week grouping
          const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
          key = `week-${week}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      const existing = acc.find(item => item.period === key);
      if (existing) {
        existing.count += 1;
        existing.revenue += event.conversionValue || 0;
      } else {
        acc.push({
          period: key,
          count: 1,
          revenue: event.conversionValue || 0,
        });
      }

      return acc;
    }, [] as any[]);
  }
}

// =============================================================================
// Export all services
// =============================================================================

export const createPhase2Services = (client?: TypedSupabaseClient) => ({
  brands: new BrandService(client),
  mobile: new MobileService(client),
  developer: new DeveloperService(client),
  analytics: new AnalyticsService(client),
});
