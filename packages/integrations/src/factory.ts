import { AffiliateNetworkAdapter } from './base/adapter';
import { ShareASaleAdapter } from './networks/shareasale';
import { CJAffiliateAdapter } from './networks/cj';
import { ImpactRadiusAdapter } from './networks/impact';
import { RakutenAdvertisingAdapter } from './networks/rakuten';
import {
  AffiliateNetworkType,
  AffiliateNetworkConfig,
  AffiliateNetworkError,
} from './types';

/**
 * Factory class for creating affiliate network adapter instances
 */
export class AffiliateNetworkAdapterFactory {
  private static adapters = new Map<string, AffiliateNetworkAdapter>();

  /**
   * Create or retrieve an adapter instance for the specified network
   */
  static create(config: AffiliateNetworkConfig): AffiliateNetworkAdapter {
    const key = `${config.networkType}-${config.tenantId}`;
    
    // Return existing adapter if already created
    if (this.adapters.has(key)) {
      const adapter = this.adapters.get(key)!;
      adapter.updateConfig(config);
      return adapter;
    }

    // Create new adapter based on network type
    let adapter: AffiliateNetworkAdapter;

    switch (config.networkType) {
      case 'shareasale':
        adapter = new ShareASaleAdapter(config);
        break;
      case 'cj':
        adapter = new CJAffiliateAdapter(config);
        break;
      case 'impact':
        adapter = new ImpactRadiusAdapter(config);
        break;
      case 'rakuten':
        adapter = new RakutenAdvertisingAdapter(config);
        break;
      default:
        throw new AffiliateNetworkError(
          `Unsupported network type: ${config.networkType}`,
          config.networkType as AffiliateNetworkType,
          'UNSUPPORTED_NETWORK',
          undefined,
          false
        );
    }

    // Cache the adapter
    this.adapters.set(key, adapter);
    return adapter;
  }

  /**
   * Get all available network types
   */
  static getAvailableNetworks(): AffiliateNetworkType[] {
    return ['shareasale', 'cj', 'impact', 'rakuten'];
  }

  /**
   * Get adapter capabilities for a network type
   */
  static getNetworkCapabilities(networkType: AffiliateNetworkType) {
    const tempConfig: AffiliateNetworkConfig = {
      id: 'temp',
      tenantId: 'temp',
      networkType,
      name: 'temp',
      authenticationType: 'api_key',
      credentials: {},
      settings: {
        autoSync: false,
        syncInterval: 60,
        enableWebhooks: false,
      },
      status: 'inactive',
      lastSyncAt: null,
      nextSyncAt: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const adapter = this.create(tempConfig);
    return adapter.capabilities;
  }

  /**
   * Remove adapter from cache
   */
  static remove(networkType: AffiliateNetworkType, tenantId: string): void {
    const key = `${networkType}-${tenantId}`;
    this.adapters.delete(key);
  }

  /**
   * Clear all cached adapters
   */
  static clearCache(): void {
    this.adapters.clear();
  }

  /**
   * Get cached adapter if exists
   */
  static getCached(networkType: AffiliateNetworkType, tenantId: string): AffiliateNetworkAdapter | null {
    const key = `${networkType}-${tenantId}`;
    return this.adapters.get(key) || null;
  }

  /**
   * Validate network configuration
   */
  static validateConfig(config: AffiliateNetworkConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.networkType) {
      errors.push('Network type is required');
    }

    if (!config.tenantId) {
      errors.push('Tenant ID is required');
    }

    if (!config.name) {
      errors.push('Configuration name is required');
    }

    if (!config.credentials || Object.keys(config.credentials).length === 0) {
      errors.push('Credentials are required');
    }

    // Network-specific validation
    switch (config.networkType) {
      case 'shareasale':
        if (!config.credentials.affiliateId) {
          errors.push('ShareASale affiliate ID is required');
        }
        if (!config.credentials.token) {
          errors.push('ShareASale token is required');
        }
        if (!config.credentials.secretKey) {
          errors.push('ShareASale secret key is required');
        }
        break;

      case 'cj':
        if (!config.credentials.developerId) {
          errors.push('CJ developer ID is required');
        }
        if (!config.credentials.websiteId) {
          errors.push('CJ website ID is required');
        }
        if (!config.credentials.personalAccessToken) {
          errors.push('CJ personal access token is required');
        }
        break;

      case 'impact':
        if (!config.credentials.accountSid) {
          errors.push('Impact account SID is required');
        }
        if (!config.credentials.authToken) {
          errors.push('Impact auth token is required');
        }
        if (!config.credentials.partnerId) {
          errors.push('Impact partner ID is required');
        }
        break;

      case 'rakuten':
        if (!config.credentials.publisherId) {
          errors.push('Rakuten publisher ID is required');
        }
        if (!config.credentials.apiKey) {
          errors.push('Rakuten API key is required');
        }
        break;

      default:
        errors.push(`Unsupported network type: ${config.networkType}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test connection for a configuration
   */
  static async testConnection(config: AffiliateNetworkConfig): Promise<{
    success: boolean;
    error?: string;
    networkStatus?: any;
  }> {
    try {
      // Validate configuration first
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: `Configuration validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Create adapter and test connection
      const adapter = this.create(config);
      await adapter.authenticate(config.credentials);
      const connected = await adapter.testConnection();
      
      if (connected) {
        const networkStatus = await adapter.getNetworkStatus();
        return {
          success: true,
          networkStatus,
        };
      } else {
        return {
          success: false,
          error: 'Connection test failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}