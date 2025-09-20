/**
 * Affiliate Networks SDK Integration
 * 
 * This module integrates the affiliate networks package with the main SDK,
 * providing a simplified interface for AffiliateOS applications.
 */

import {
  AffiliateNetworkManager,
  createAffiliateNetworkManager,
  getAffiliateNetworkManager,
  destroyAffiliateNetworkManager,
  AffiliateNetworkAdapterFactory,
  type AffiliateNetworkConfig,
  type AffiliateNetworkType,
  type AffiliateProduct,
  type Conversion,
  type NetworkStatus,
  type SyncOperation,
  type ManagerConfig,
} from '@affiliate-factory/integrations';
import { createClient } from './supabase';
import { encryptCredentials, decryptCredentials } from '@affiliate-factory/integrations';

/**
 * Affiliate Networks Service for AffiliateOS
 * Provides high-level interface for managing affiliate network integrations
 */
export class AffiliateNetworksService {
  private manager: AffiliateNetworkManager | null = null;
  private supabase = createClient();
  private encryptionKey: string;

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || process.env.ENCRYPTION_KEY || 'default-key';
  }

  /**
   * Initialize the affiliate networks service
   */
  async initialize(config?: Partial<ManagerConfig>): Promise<void> {
    if (this.manager) {
      return; // Already initialized
    }

    const managerConfig: ManagerConfig = {
      encryptionKey: this.encryptionKey,
      webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'https://localhost:3000',
      maxConcurrentSyncs: 3,
      defaultSyncInterval: 60,
      enableMonitoring: true,
      retryAttempts: 3,
      ...config,
    };

    this.manager = createAffiliateNetworkManager(managerConfig);

    // Set up event listeners
    this.setupEventListeners();

    // Load existing configurations from database
    await this.loadConfigurationsFromDatabase();
  }

  /**
   * Add a new affiliate network configuration
   */
  async addNetwork(
    tenantId: string,
    networkType: AffiliateNetworkType,
    name: string,
    credentials: Record<string, string>,
    settings: Partial<AffiliateNetworkConfig['settings']> = {}
  ): Promise<void> {
    if (!this.manager) {
      throw new Error('Affiliate networks service not initialized');
    }

    // Encrypt credentials
    const credentialsEncrypted = encryptCredentials(credentials, this.encryptionKey);

    // Create configuration
    const config: AffiliateNetworkConfig = {
      id: `${networkType}-${tenantId}-${Date.now()}`,
      tenantId,
      networkType,
      name,
      authenticationType: this.getAuthTypeForNetwork(networkType),
      credentials,
      settings: {
        autoSync: false,
        syncInterval: 60,
        enableWebhooks: false,
        ...settings,
      },
      status: 'inactive',
      lastSyncAt: null,
      nextSyncAt: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    const { error } = await this.supabase
      .from('affiliate_network_configs')
      .insert({
        id: config.id,
        tenant_id: config.tenantId,
        network_type: config.networkType,
        name: config.name,
        authentication_type: config.authenticationType,
        credentials_encrypted: credentialsEncrypted,
        settings: config.settings,
        status: config.status,
      });

    if (error) {
      throw new Error(`Failed to save network configuration: ${error.message}`);
    }

    // Add to manager
    await this.manager.addNetworkConfig(config);
  }

  /**
   * Remove an affiliate network configuration
   */
  async removeNetwork(tenantId: string, networkType: AffiliateNetworkType): Promise<void> {
    if (!this.manager) {
      throw new Error('Affiliate networks service not initialized');
    }

    // Remove from database
    const { error } = await this.supabase
      .from('affiliate_network_configs')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('network_type', networkType);

    if (error) {
      throw new Error(`Failed to remove network configuration: ${error.message}`);
    }

    // Remove from manager
    this.manager.removeNetworkConfig(networkType, tenantId);
  }

  /**
   * Get network configurations for a tenant
   */
  async getNetworkConfigs(tenantId: string): Promise<AffiliateNetworkConfig[]> {
    const { data, error } = await this.supabase
      .from('affiliate_network_configs')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to fetch network configurations: ${error.message}`);
    }

    return data.map(row => this.mapDatabaseRowToConfig(row));
  }

  /**
   * Sync products for a specific network
   */
  async syncNetwork(
    tenantId: string,
    networkType: AffiliateNetworkType,
    options: { fullSync?: boolean; forceSync?: boolean } = {}
  ): Promise<SyncOperation> {
    if (!this.manager) {
      throw new Error('Affiliate networks service not initialized');
    }

    return this.manager.syncNetwork(networkType, tenantId, options);
  }

  /**
   * Get products from a specific network
   */
  async getProducts(
    tenantId: string,
    networkType?: AffiliateNetworkType,
    filters: {
      page?: number;
      limit?: number;
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
    } = {}
  ): Promise<AffiliateProduct[]> {
    let query = this.supabase
      .from('affiliate_products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (networkType) {
      query = query.eq('network_type', networkType);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }

    if (filters.minPrice || filters.maxPrice) {
      if (filters.minPrice) {
        query = query.gte('price->amount', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('price->amount', filters.maxPrice);
      }
    }

    if (filters.search) {
      query = query.textSearch('title,description,brand', filters.search);
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return data.map(row => this.mapDatabaseRowToProduct(row));
  }

  /**
   * Get conversions for a tenant
   */
  async getConversions(
    tenantId: string,
    options: {
      networkType?: AffiliateNetworkType;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<Conversion[]> {
    let query = this.supabase
      .from('affiliate_conversions')
      .select('*')
      .eq('tenant_id', tenantId);

    if (options.networkType) {
      query = query.eq('network_type', options.networkType);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.dateFrom) {
      query = query.gte('conversion_date', options.dateFrom);
    }

    if (options.dateTo) {
      query = query.lte('conversion_date', options.dateTo);
    }

    // Pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch conversions: ${error.message}`);
    }

    return data.map(row => this.mapDatabaseRowToConversion(row));
  }

  /**
   * Generate affiliate link for a product
   */
  async generateAffiliateLink(
    tenantId: string,
    productId: string,
    customParams: Record<string, string> = {}
  ): Promise<string> {
    if (!this.manager) {
      throw new Error('Affiliate networks service not initialized');
    }

    // Get product details
    const { data: product, error } = await this.supabase
      .from('affiliate_products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .single();

    if (error || !product) {
      throw new Error('Product not found');
    }

    // Get network configuration
    const config = this.manager.getNetworkConfig(product.network_type, tenantId);
    if (!config) {
      throw new Error(`No configuration found for network ${product.network_type}`);
    }

    // Create adapter and generate link
    const adapter = AffiliateNetworkAdapterFactory.create(config);
    await adapter.authenticate(config.credentials);

    return adapter.generateAffiliateLink(product.network_product_id, {
      merchantId: product.merchant_id,
      productUrl: product.affiliate_url,
      ...customParams,
    });
  }

  /**
   * Get network status for all configured networks
   */
  async getNetworkStatuses(tenantId?: string): Promise<NetworkStatus[]> {
    if (!this.manager) {
      throw new Error('Affiliate networks service not initialized');
    }

    const allStatuses = await this.manager.getNetworkStatuses();
    
    if (tenantId) {
      return allStatuses.filter(status => status.tenantId === tenantId);
    }

    return allStatuses;
  }

  /**
   * Get affiliate performance analytics
   */
  async getPerformanceAnalytics(
    tenantId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    totalProducts: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    totalCommission: number;
    conversionRate: number;
    averageOrderValue: number;
    networkBreakdown: Array<{
      networkType: string;
      products: number;
      clicks: number;
      conversions: number;
      revenue: number;
      commission: number;
    }>;
  }> {
    // Use the database view for performance analytics
    let query = this.supabase
      .from('affiliate_performance_summary')
      .select('*')
      .eq('tenant_slug', tenantId); // Assuming tenant slug mapping

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch performance analytics: ${error.message}`);
    }

    // Aggregate data
    const totals = data.reduce(
      (acc, row) => {
        acc.totalProducts += row.total_products || 0;
        acc.totalClicks += row.total_clicks || 0;
        acc.totalConversions += row.total_conversions || 0;
        acc.totalRevenue += parseFloat(row.total_order_value || '0');
        acc.totalCommission += parseFloat(row.total_commission || '0');
        return acc;
      },
      {
        totalProducts: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalCommission: 0,
      }
    );

    return {
      ...totals,
      conversionRate: totals.totalClicks > 0 ? (totals.totalConversions / totals.totalClicks) * 100 : 0,
      averageOrderValue: totals.totalConversions > 0 ? totals.totalRevenue / totals.totalConversions : 0,
      networkBreakdown: data.map(row => ({
        networkType: row.network_type,
        products: row.total_products || 0,
        clicks: row.total_clicks || 0,
        conversions: row.total_conversions || 0,
        revenue: parseFloat(row.total_order_value || '0'),
        commission: parseFloat(row.total_commission || '0'),
      })),
    };
  }

  /**
   * Cleanup and destroy the service
   */
  async destroy(): Promise<void> {
    if (this.manager) {
      await destroyAffiliateNetworkManager();
      this.manager = null;
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async loadConfigurationsFromDatabase(): Promise<void> {
    if (!this.manager) return;

    const { data, error } = await this.supabase
      .from('affiliate_network_configs')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Failed to load network configurations:', error);
      return;
    }

    for (const row of data) {
      try {
        const config = this.mapDatabaseRowToConfig(row);
        await this.manager.addNetworkConfig(config);
      } catch (error) {
        console.error(`Failed to load configuration for ${row.network_type}:`, error);
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.manager) return;

    this.manager.on('syncCompleted', async (event) => {
      // Update sync status in database
      await this.supabase
        .from('affiliate_network_configs')
        .update({
          last_sync_at: new Date().toISOString(),
          status: 'active',
          error_message: null,
        })
        .eq('tenant_id', event.tenantId)
        .eq('network_type', event.networkType);
    });

    this.manager.on('syncError', async (event) => {
      // Update error status in database
      await this.supabase
        .from('affiliate_network_configs')
        .update({
          status: 'error',
          error_message: event.error,
        })
        .eq('tenant_id', event.tenantId)
        .eq('network_type', event.networkType);
    });
  }

  private mapDatabaseRowToConfig(row: any): AffiliateNetworkConfig {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      networkType: row.network_type,
      name: row.name,
      authenticationType: row.authentication_type,
      credentials: decryptCredentials(row.credentials_encrypted, this.encryptionKey),
      settings: row.settings,
      status: row.status,
      lastSyncAt: row.last_sync_at,
      nextSyncAt: row.next_sync_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDatabaseRowToProduct(row: any): AffiliateProduct {
    return {
      id: row.id,
      networkType: row.network_type,
      networkProductId: row.network_product_id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      title: row.title,
      description: row.description,
      brand: row.brand,
      category: row.category,
      subcategory: row.subcategory,
      sku: row.sku,
      images: row.images,
      price: row.price,
      commissionRate: parseFloat(row.commission_rate),
      commissionType: row.commission_type,
      affiliateUrl: row.affiliate_url,
      trackingUrl: row.tracking_url,
      deepLink: row.deep_link,
      availability: row.availability,
      specifications: row.specifications,
      ratings: row.ratings,
      tags: row.tags,
      metadata: row.metadata,
      lastUpdatedAt: row.last_updated_at,
      isActive: row.is_active,
    };
  }

  private mapDatabaseRowToConversion(row: any): Conversion {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      networkType: row.network_type,
      networkConversionId: row.network_conversion_id,
      clickId: row.click_id,
      orderId: row.order_id,
      customerId: row.customer_id,
      productId: row.product_id,
      merchantId: row.merchant_id,
      orderValue: parseFloat(row.order_value),
      currency: row.currency,
      commissionAmount: parseFloat(row.commission_amount),
      commissionRate: parseFloat(row.commission_rate),
      status: row.status,
      conversionDate: row.conversion_date,
      payoutDate: row.payout_date,
      metadata: row.metadata,
    };
  }

  private getAuthTypeForNetwork(networkType: AffiliateNetworkType): string {
    switch (networkType) {
      case 'shareasale':
      case 'rakuten':
        return 'api_key';
      case 'cj':
        return 'token';
      case 'impact':
        return 'credentials';
      default:
        return 'api_key';
    }
  }
}

// Singleton instance
let serviceInstance: AffiliateNetworksService | null = null;

/**
 * Get or create the affiliate networks service instance
 */
export function getAffiliateNetworksService(encryptionKey?: string): AffiliateNetworksService {
  if (!serviceInstance) {
    serviceInstance = new AffiliateNetworksService(encryptionKey);
  }
  return serviceInstance;
}

/**
 * Initialize the affiliate networks service
 */
export async function initializeAffiliateNetworks(
  config?: Partial<ManagerConfig>,
  encryptionKey?: string
): Promise<AffiliateNetworksService> {
  const service = getAffiliateNetworksService(encryptionKey);
  await service.initialize(config);
  return service;
}

/**
 * Destroy the affiliate networks service
 */
export async function destroyAffiliateNetworks(): Promise<void> {
  if (serviceInstance) {
    await serviceInstance.destroy();
    serviceInstance = null;
  }
}