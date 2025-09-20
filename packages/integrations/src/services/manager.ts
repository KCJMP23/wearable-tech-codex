import { EventEmitter } from 'events';
import { AffiliateNetworkAdapterFactory } from '../factory';
import { AffiliateWebhookHandler } from '../webhooks';
import { PerformanceTracker, batchArray, retryWithBackoff } from '../utils';
import {
  AffiliateNetworkType,
  AffiliateNetworkConfig,
  SyncOperation,
  BulkOperation,
  BulkOperationResult,
  AffiliateProduct,
  Conversion,
  AffiliateNetworkError,
} from '../types';

export interface SyncSchedule {
  networkType: AffiliateNetworkType;
  tenantId: string;
  interval: number; // minutes
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
}

export interface ManagerConfig {
  encryptionKey: string;
  webhookBaseUrl: string;
  maxConcurrentSyncs: number;
  defaultSyncInterval: number;
  enableMonitoring: boolean;
  retryAttempts: number;
}

export interface NetworkStatus {
  networkType: AffiliateNetworkType;
  tenantId: string;
  connected: boolean;
  lastSync?: Date;
  nextSync?: Date;
  error?: string;
  rateLimitInfo?: any;
  performanceMetrics: {
    avgResponseTime: number;
    successRate: number;
    totalRequests: number;
    errorCount: number;
  };
}

/**
 * Central manager for all affiliate network integrations
 * Handles scheduling, monitoring, error handling, and coordination
 */
export class AffiliateNetworkManager extends EventEmitter {
  private configs: Map<string, AffiliateNetworkConfig> = new Map();
  private syncSchedules: Map<string, SyncSchedule> = new Map();
  private webhookHandler: AffiliateWebhookHandler;
  private performanceTracker = new PerformanceTracker();
  private activeSyncs = new Set<string>();
  private config: ManagerConfig;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: ManagerConfig) {
    super();
    this.config = config;
    this.webhookHandler = new AffiliateWebhookHandler([]);
    
    if (config.enableMonitoring) {
      this.startMonitoring();
    }
  }

  // =============================================================================
  // Configuration Management
  // =============================================================================

  /**
   * Add or update network configuration
   */
  async addNetworkConfig(config: AffiliateNetworkConfig): Promise<void> {
    const key = `${config.networkType}-${config.tenantId}`;
    
    try {
      // Validate configuration
      const validation = AffiliateNetworkAdapterFactory.validateConfig(config);
      if (!validation.valid) {
        throw new AffiliateNetworkError(
          `Invalid configuration: ${validation.errors.join(', ')}`,
          config.networkType,
          'INVALID_CONFIG'
        );
      }

      // Test connection
      const connectionTest = await AffiliateNetworkAdapterFactory.testConnection(config);
      if (!connectionTest.success) {
        throw new AffiliateNetworkError(
          `Connection test failed: ${connectionTest.error}`,
          config.networkType,
          'CONNECTION_FAILED'
        );
      }

      // Store configuration
      this.configs.set(key, config);
      
      // Update webhook handler
      this.updateWebhookHandler();
      
      // Schedule sync if auto-sync is enabled
      if (config.settings.autoSync) {
        this.scheduleSyncForNetwork(config);
      }

      this.emit('networkConfigAdded', { networkType: config.networkType, tenantId: config.tenantId });
    } catch (error) {
      this.emit('networkConfigError', { 
        networkType: config.networkType, 
        tenantId: config.tenantId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Remove network configuration
   */
  removeNetworkConfig(networkType: AffiliateNetworkType, tenantId: string): void {
    const key = `${networkType}-${tenantId}`;
    
    this.configs.delete(key);
    this.syncSchedules.delete(key);
    AffiliateNetworkAdapterFactory.remove(networkType, tenantId);
    
    this.updateWebhookHandler();
    this.emit('networkConfigRemoved', { networkType, tenantId });
  }

  /**
   * Get all network configurations
   */
  getNetworkConfigs(): AffiliateNetworkConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get network configuration for specific network and tenant
   */
  getNetworkConfig(networkType: AffiliateNetworkType, tenantId: string): AffiliateNetworkConfig | null {
    const key = `${networkType}-${tenantId}`;
    return this.configs.get(key) || null;
  }

  // =============================================================================
  // Sync Management
  // =============================================================================

  /**
   * Schedule sync for a specific network
   */
  private scheduleSyncForNetwork(config: AffiliateNetworkConfig): void {
    const key = `${config.networkType}-${config.tenantId}`;
    const interval = config.settings.syncInterval || this.config.defaultSyncInterval;
    
    const schedule: SyncSchedule = {
      networkType: config.networkType,
      tenantId: config.tenantId,
      interval,
      nextRun: new Date(Date.now() + interval * 60 * 1000),
      isRunning: false,
    };

    this.syncSchedules.set(key, schedule);
  }

  /**
   * Run sync for a specific network
   */
  async syncNetwork(
    networkType: AffiliateNetworkType, 
    tenantId: string,
    options?: { fullSync?: boolean; forceSync?: boolean }
  ): Promise<SyncOperation> {
    const key = `${networkType}-${tenantId}`;
    const config = this.configs.get(key);
    
    if (!config) {
      throw new AffiliateNetworkError(
        `No configuration found for ${networkType} (tenant: ${tenantId})`,
        networkType,
        'NO_CONFIG'
      );
    }

    // Check if sync is already running
    if (this.activeSyncs.has(key) && !options?.forceSync) {
      throw new AffiliateNetworkError(
        `Sync already running for ${networkType} (tenant: ${tenantId})`,
        networkType,
        'SYNC_IN_PROGRESS'
      );
    }

    // Check concurrent sync limit
    if (this.activeSyncs.size >= this.config.maxConcurrentSyncs && !options?.forceSync) {
      throw new AffiliateNetworkError(
        'Maximum concurrent syncs reached',
        networkType,
        'CONCURRENT_LIMIT_REACHED'
      );
    }

    this.activeSyncs.add(key);
    this.performanceTracker.start(`sync-${key}`);
    
    try {
      // Update schedule
      const schedule = this.syncSchedules.get(key);
      if (schedule) {
        schedule.isRunning = true;
        schedule.lastRun = new Date();
      }

      // Create adapter and run sync
      const adapter = AffiliateNetworkAdapterFactory.create(config);
      await adapter.authenticate(config.credentials);
      
      const syncResult = await retryWithBackoff(
        () => adapter.syncProducts({ 
          fullSync: options?.fullSync,
          batchSize: 100, // Reasonable batch size
        }),
        this.config.retryAttempts
      );

      // Update next sync time
      if (schedule) {
        schedule.nextRun = new Date(Date.now() + schedule.interval * 60 * 1000);
        schedule.isRunning = false;
      }

      this.emit('syncCompleted', {
        networkType,
        tenantId,
        operation: syncResult,
        duration: this.performanceTracker.end(`sync-${key}`),
      });

      return syncResult;
    } catch (error) {
      // Update schedule on error
      const schedule = this.syncSchedules.get(key);
      if (schedule) {
        schedule.isRunning = false;
        // Increase interval on error to avoid hammering failed connections
        schedule.nextRun = new Date(Date.now() + (schedule.interval * 2) * 60 * 1000);
      }

      this.emit('syncError', {
        networkType,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: this.performanceTracker.end(`sync-${key}`),
      });

      throw error;
    } finally {
      this.activeSyncs.delete(key);
    }
  }

  /**
   * Run scheduled syncs
   */
  async runScheduledSyncs(): Promise<void> {
    const now = new Date();
    const readyForSync = Array.from(this.syncSchedules.values()).filter(
      schedule => 
        !schedule.isRunning && 
        schedule.nextRun && 
        schedule.nextRun <= now &&
        !this.activeSyncs.has(`${schedule.networkType}-${schedule.tenantId}`)
    );

    // Respect concurrent sync limit
    const availableSlots = this.config.maxConcurrentSyncs - this.activeSyncs.size;
    const toSync = readyForSync.slice(0, availableSlots);

    const syncPromises = toSync.map(schedule =>
      this.syncNetwork(schedule.networkType, schedule.tenantId).catch(error => {
        console.error(`Scheduled sync failed for ${schedule.networkType}-${schedule.tenantId}:`, error);
      })
    );

    await Promise.allSettled(syncPromises);
  }

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  /**
   * Bulk import products to a network
   */
  async bulkImportProducts(
    networkType: AffiliateNetworkType,
    tenantId: string,
    products: AffiliateProduct[]
  ): Promise<BulkOperationResult> {
    const config = this.getNetworkConfig(networkType, tenantId);
    if (!config) {
      throw new AffiliateNetworkError(
        `No configuration found for ${networkType}`,
        networkType,
        'NO_CONFIG'
      );
    }

    const adapter = AffiliateNetworkAdapterFactory.create(config);
    await adapter.authenticate(config.credentials);

    const operation: BulkOperation<AffiliateProduct> = {
      operation: 'create',
      data: products,
      batchSize: adapter.capabilities.maxBatchSize,
      continueOnError: true,
    };

    // Use adapter's bulk operation support if available
    if (adapter.capabilities.supportsBulkOperations) {
      // Implementation would depend on adapter's bulk operation method
      // For now, we'll process in batches
      const batches = batchArray(products, operation.batchSize || 100);
      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      for (const batch of batches) {
        try {
          // Process batch (implementation would call adapter's bulk method)
          successCount += batch.length;
        } catch (error) {
          errorCount += batch.length;
          errors.push({
            batch: batch.map(p => p.id),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        totalRecords: products.length,
        successCount,
        errorCount,
        errors,
        duration: 0, // Would be calculated from actual processing time
      };
    } else {
      throw new AffiliateNetworkError(
        `Bulk operations not supported for ${networkType}`,
        networkType,
        'BULK_NOT_SUPPORTED'
      );
    }
  }

  // =============================================================================
  // Monitoring and Status
  // =============================================================================

  /**
   * Get status of all networks
   */
  async getNetworkStatuses(): Promise<NetworkStatus[]> {
    const statuses: NetworkStatus[] = [];

    for (const config of this.configs.values()) {
      try {
        const adapter = AffiliateNetworkAdapterFactory.create(config);
        const networkStatus = await adapter.getNetworkStatus();
        const schedule = this.syncSchedules.get(`${config.networkType}-${config.tenantId}`);

        statuses.push({
          networkType: config.networkType,
          tenantId: config.tenantId,
          connected: networkStatus.connected,
          lastSync: schedule?.lastRun,
          nextSync: schedule?.nextRun,
          error: networkStatus.error,
          rateLimitInfo: networkStatus.rateLimitInfo,
          performanceMetrics: {
            avgResponseTime: 0, // Would be calculated from historical data
            successRate: 100, // Would be calculated from historical data
            totalRequests: 0, // Would be tracked
            errorCount: 0, // Would be tracked
          },
        });
      } catch (error) {
        statuses.push({
          networkType: config.networkType,
          tenantId: config.tenantId,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          performanceMetrics: {
            avgResponseTime: 0,
            successRate: 0,
            totalRequests: 0,
            errorCount: 1,
          },
        });
      }
    }

    return statuses;
  }

  /**
   * Get sync schedules
   */
  getSyncSchedules(): SyncSchedule[] {
    return Array.from(this.syncSchedules.values());
  }

  /**
   * Get active syncs
   */
  getActiveSyncs(): string[] {
    return Array.from(this.activeSyncs);
  }

  // =============================================================================
  // Webhook Management
  // =============================================================================

  /**
   * Get webhook handler
   */
  getWebhookHandler(): AffiliateWebhookHandler {
    return this.webhookHandler;
  }

  /**
   * Update webhook handler with current configurations
   */
  private updateWebhookHandler(): void {
    const configs = Array.from(this.configs.values());
    this.webhookHandler.updateConfigs(configs);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Check for scheduled syncs every minute
    this.monitoringInterval = setInterval(() => {
      this.runScheduledSyncs().catch(error => {
        console.error('Error running scheduled syncs:', error);
        this.emit('monitoringError', error);
      });
    }, 60 * 1000);

    // Emit status updates every 5 minutes
    setInterval(() => {
      this.emit('statusUpdate', {
        activeSyncs: this.getActiveSyncs(),
        schedules: this.getSyncSchedules(),
        timestamp: new Date(),
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopMonitoring();
    
    // Wait for active syncs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.activeSyncs.size > 0 && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clear all data
    this.configs.clear();
    this.syncSchedules.clear();
    this.activeSyncs.clear();
    AffiliateNetworkAdapterFactory.clearCache();
    
    this.emit('destroyed');
  }
}

/**
 * Singleton manager instance
 */
let managerInstance: AffiliateNetworkManager | null = null;

export function createAffiliateNetworkManager(config: ManagerConfig): AffiliateNetworkManager {
  if (managerInstance) {
    throw new Error('Affiliate network manager already initialized');
  }
  
  managerInstance = new AffiliateNetworkManager(config);
  return managerInstance;
}

export function getAffiliateNetworkManager(): AffiliateNetworkManager {
  if (!managerInstance) {
    throw new Error('Affiliate network manager not initialized');
  }
  
  return managerInstance;
}

export async function destroyAffiliateNetworkManager(): Promise<void> {
  if (managerInstance) {
    await managerInstance.destroy();
    managerInstance = null;
  }
}