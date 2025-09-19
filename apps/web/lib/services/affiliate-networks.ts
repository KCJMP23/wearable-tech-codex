import { createServiceClient } from '@/lib/supabase';

export interface AffiliateNetwork {
  id: string;
  tenant_id: string;
  network_id: string;
  name: string;
  status: 'connected' | 'pending' | 'disconnected' | 'error';
  api_key?: string;
  api_secret?: string;
  merchant_id?: string;
  tracking_id?: string;
  commission_rate?: number;
  cookie_duration_days?: number;
  payment_terms?: string;
  config?: Record<string, any>;
  last_sync?: Date;
  sync_status?: string;
}

export interface AffiliateEarnings {
  id: string;
  tenant_id: string;
  network_id: string;
  date: Date;
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
  currency: string;
}

export interface AffiliateProduct {
  id: string;
  tenant_id: string;
  network_id: string;
  external_id: string;
  name: string;
  url?: string;
  affiliate_url?: string;
  price?: number;
  commission_rate?: number;
  category?: string;
  image_url?: string;
  in_stock: boolean;
}

class AffiliateNetworkService {
  async getNetworks(tenantId: string): Promise<AffiliateNetwork[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('affiliate_networks')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async connectNetwork(
    tenantId: string,
    networkId: string,
    credentials: {
      api_key?: string;
      api_secret?: string;
      merchant_id?: string;
      tracking_id?: string;
    }
  ): Promise<AffiliateNetwork> {
    const supabase = createServiceClient();
    
    // Validate credentials with the network API
    const isValid = await this.validateNetworkCredentials(networkId, credentials);
    
    if (!isValid) {
      throw new Error('Invalid network credentials');
    }

    const { data, error } = await supabase
      .from('affiliate_networks')
      .upsert({
        tenant_id: tenantId,
        network_id: networkId,
        name: this.getNetworkName(networkId),
        status: 'connected',
        api_key: credentials.api_key,
        api_secret: credentials.api_secret,
        merchant_id: credentials.merchant_id,
        tracking_id: credentials.tracking_id,
        last_sync: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    
    // Trigger initial sync
    await this.syncNetworkData(tenantId, networkId);
    
    return data;
  }

  async disconnectNetwork(tenantId: string, networkId: string): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('affiliate_networks')
      .update({ 
        status: 'disconnected',
        api_key: null,
        api_secret: null,
      })
      .eq('tenant_id', tenantId)
      .eq('network_id', networkId);

    if (error) throw error;
  }

  async syncNetworkData(tenantId: string, networkId: string): Promise<void> {
    const supabase = createServiceClient();
    
    // Get network credentials
    const { data: network } = await supabase
      .from('affiliate_networks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('network_id', networkId)
      .single();

    if (!network) throw new Error('Network not found');

    try {
      // Fetch data from network API
      const earnings = await this.fetchNetworkEarnings(network);
      const products = await this.fetchNetworkProducts(network);

      // Update earnings
      if (earnings.length > 0) {
        await supabase
          .from('affiliate_earnings')
          .upsert(
            earnings.map(e => ({
              ...e,
              tenant_id: tenantId,
              network_id: networkId,
            }))
          );
      }

      // Update products
      if (products.length > 0) {
        await supabase
          .from('affiliate_products')
          .upsert(
            products.map(p => ({
              ...p,
              tenant_id: tenantId,
              network_id: networkId,
            }))
          );
      }

      // Update sync status
      await supabase
        .from('affiliate_networks')
        .update({ 
          last_sync: new Date().toISOString(),
          sync_status: 'success',
        })
        .eq('tenant_id', tenantId)
        .eq('network_id', networkId);
    } catch (error) {
      // Update sync status with error
      await supabase
        .from('affiliate_networks')
        .update({ 
          sync_status: 'error',
          status: 'error',
        })
        .eq('tenant_id', tenantId)
        .eq('network_id', networkId);
      
      throw error;
    }
  }

  async getEarnings(
    tenantId: string,
    networkId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AffiliateEarnings[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('affiliate_earnings')
      .select('*')
      .eq('tenant_id', tenantId);

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    if (dateRange) {
      query = query
        .gte('date', dateRange.start.toISOString())
        .lte('date', dateRange.end.toISOString());
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getProducts(
    tenantId: string,
    networkId?: string,
    filters?: {
      category?: string;
      in_stock?: boolean;
      min_price?: number;
      max_price?: number;
    }
  ): Promise<AffiliateProduct[]> {
    const supabase = createServiceClient();
    
    let query = supabase
      .from('affiliate_products')
      .select('*')
      .eq('tenant_id', tenantId);

    if (networkId) {
      query = query.eq('network_id', networkId);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.in_stock !== undefined) {
      query = query.eq('in_stock', filters.in_stock);
    }

    if (filters?.min_price !== undefined) {
      query = query.gte('price', filters.min_price);
    }

    if (filters?.max_price !== undefined) {
      query = query.lte('price', filters.max_price);
    }

    const { data, error } = await query
      .order('last_updated', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  // Network-specific implementations
  private async validateNetworkCredentials(
    networkId: string,
    credentials: any
  ): Promise<boolean> {
    // Network-specific validation logic
    switch (networkId) {
      case 'amazon':
        return this.validateAmazonCredentials(credentials);
      case 'shareasale':
        return this.validateShareASaleCredentials(credentials);
      case 'cj':
        return this.validateCJCredentials(credentials);
      case 'rakuten':
        return this.validateRakutenCredentials(credentials);
      case 'impact':
        return this.validateImpactCredentials(credentials);
      case 'awin':
        return this.validateAwinCredentials(credentials);
      case 'flexoffers':
        return this.validateFlexOffersCredentials(credentials);
      case 'clickbank':
        return this.validateClickBankCredentials(credentials);
      default:
        return false;
    }
  }

  private async fetchNetworkEarnings(network: AffiliateNetwork): Promise<any[]> {
    // Network-specific API calls
    switch (network.network_id) {
      case 'amazon':
        return this.fetchAmazonEarnings(network);
      case 'shareasale':
        return this.fetchShareASaleEarnings(network);
      // Add other networks
      default:
        return [];
    }
  }

  private async fetchNetworkProducts(network: AffiliateNetwork): Promise<any[]> {
    // Network-specific API calls
    switch (network.network_id) {
      case 'amazon':
        return this.fetchAmazonProducts(network);
      case 'shareasale':
        return this.fetchShareASaleProducts(network);
      // Add other networks
      default:
        return [];
    }
  }

  private getNetworkName(networkId: string): string {
    const names: Record<string, string> = {
      amazon: 'Amazon Associates',
      shareasale: 'ShareASale',
      cj: 'CJ Affiliate',
      rakuten: 'Rakuten Advertising',
      impact: 'Impact',
      awin: 'Awin',
      flexoffers: 'FlexOffers',
      clickbank: 'ClickBank',
    };
    return names[networkId] || networkId;
  }

  // Network-specific validation methods
  private async validateAmazonCredentials(credentials: any): Promise<boolean> {
    // Mock validation - in production, would call Amazon PA-API
    return !!(credentials.api_key && credentials.api_secret && credentials.tracking_id);
  }

  private async validateShareASaleCredentials(credentials: any): Promise<boolean> {
    // Mock validation - in production, would call ShareASale API
    return !!(credentials.api_key && credentials.api_secret && credentials.merchant_id);
  }

  private async validateCJCredentials(credentials: any): Promise<boolean> {
    // Mock validation - in production, would call CJ API
    return !!(credentials.api_key);
  }

  private async validateRakutenCredentials(credentials: any): Promise<boolean> {
    // Mock validation - in production, would call Rakuten API
    return !!(credentials.api_key && credentials.api_secret);
  }

  private async validateImpactCredentials(credentials: any): Promise<boolean> {
    return !!(credentials.api_key && credentials.api_secret);
  }

  private async validateAwinCredentials(credentials: any): Promise<boolean> {
    return !!(credentials.api_key && credentials.merchant_id);
  }

  private async validateFlexOffersCredentials(credentials: any): Promise<boolean> {
    return !!(credentials.api_key);
  }

  private async validateClickBankCredentials(credentials: any): Promise<boolean> {
    return !!(credentials.api_key && credentials.api_secret);
  }

  // Network-specific data fetching methods
  private async fetchAmazonEarnings(network: AffiliateNetwork): Promise<any[]> {
    // Mock implementation - in production, would call Amazon PA-API
    const today = new Date();
    return [
      {
        date: today.toISOString(),
        clicks: Math.floor(Math.random() * 1000),
        conversions: Math.floor(Math.random() * 50),
        revenue: Math.random() * 5000,
        commission: Math.random() * 500,
        currency: 'USD',
      },
    ];
  }

  private async fetchShareASaleEarnings(network: AffiliateNetwork): Promise<any[]> {
    // Mock implementation - in production, would call ShareASale API
    const today = new Date();
    return [
      {
        date: today.toISOString(),
        clicks: Math.floor(Math.random() * 800),
        conversions: Math.floor(Math.random() * 40),
        revenue: Math.random() * 4000,
        commission: Math.random() * 400,
        currency: 'USD',
      },
    ];
  }

  private async fetchAmazonProducts(network: AffiliateNetwork): Promise<any[]> {
    // Mock implementation - in production, would call Amazon PA-API
    return [
      {
        external_id: 'B09JQSLL92',
        name: 'Apple Watch Series 9',
        price: 399.99,
        commission_rate: 3.0,
        category: 'Smartwatches',
        image_url: 'https://example.com/product.jpg',
        in_stock: true,
      },
    ];
  }

  private async fetchShareASaleProducts(network: AffiliateNetwork): Promise<any[]> {
    // Mock implementation - in production, would call ShareASale API
    return [
      {
        external_id: 'FITBIT-CHARGE6',
        name: 'Fitbit Charge 6',
        price: 159.99,
        commission_rate: 5.0,
        category: 'Fitness Trackers',
        image_url: 'https://example.com/fitbit.jpg',
        in_stock: true,
      },
    ];
  }
}

export const affiliateNetworkService = new AffiliateNetworkService();