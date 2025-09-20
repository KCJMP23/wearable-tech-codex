/**
 * Basic usage examples for AffiliateOS affiliate network integrations
 * 
 * This file demonstrates how to:
 * 1. Set up and configure affiliate networks
 * 2. Sync products from networks
 * 3. Handle webhooks
 * 4. Generate affiliate links
 * 5. Track conversions
 */

import {
  AffiliateNetworkManager,
  createAffiliateNetworkManager,
  AffiliateNetworkAdapterFactory,
  AffiliateWebhookHandler,
  AffiliateNetworkConfig,
  ShareASaleAdapter,
  CJAffiliateAdapter,
  ImpactRadiusAdapter,
  RakutenAdvertisingAdapter,
  type ManagerConfig,
  type WebhookRequest,
} from '@affiliate-factory/integrations';

// =============================================================================
// 1. Setting up the Affiliate Network Manager
// =============================================================================

async function setupAffiliateNetworkManager() {
  // Configure the manager
  const managerConfig: ManagerConfig = {
    encryptionKey: process.env.ENCRYPTION_KEY!,
    webhookBaseUrl: 'https://your-domain.com',
    maxConcurrentSyncs: 3,
    defaultSyncInterval: 60, // minutes
    enableMonitoring: true,
    retryAttempts: 3,
  };

  // Create the manager instance
  const manager = createAffiliateNetworkManager(managerConfig);

  // Listen to events
  manager.on('networkConfigAdded', (event) => {
    console.log(`Network added: ${event.networkType} for tenant ${event.tenantId}`);
  });

  manager.on('syncCompleted', (event) => {
    console.log(`Sync completed for ${event.networkType}: ${event.operation.recordsSucceeded} products synced`);
  });

  manager.on('syncError', (event) => {
    console.error(`Sync error for ${event.networkType}: ${event.error}`);
  });

  return manager;
}

// =============================================================================
// 2. Configuring Individual Networks
// =============================================================================

async function configureShareASale(manager: AffiliateNetworkManager, tenantId: string) {
  const shareaSaleConfig: AffiliateNetworkConfig = {
    id: 'shareasale-config-1',
    tenantId,
    networkType: 'shareasale',
    name: 'ShareASale Integration',
    authenticationType: 'api_key',
    credentials: {
      affiliateId: process.env.SHAREASALE_AFFILIATE_ID!,
      token: process.env.SHAREASALE_TOKEN!,
      secretKey: process.env.SHAREASALE_SECRET_KEY!,
      version: '2.8',
    },
    settings: {
      autoSync: true,
      syncInterval: 120, // 2 hours
      enableWebhooks: true,
      webhookUrl: 'https://your-domain.com/api/webhooks/affiliates/shareasale',
      productFilters: {
        categories: ['Electronics', 'Health & Fitness'],
        minCommissionRate: 3.0,
        maxCommissionRate: 20.0,
      },
    },
    status: 'active',
    lastSyncAt: null,
    nextSyncAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await manager.addNetworkConfig(shareaSaleConfig);
  console.log('ShareASale configured successfully');
}

async function configureCJAffiliate(manager: AffiliateNetworkManager, tenantId: string) {
  const cjConfig: AffiliateNetworkConfig = {
    id: 'cj-config-1',
    tenantId,
    networkType: 'cj',
    name: 'CJ Affiliate Integration',
    authenticationType: 'token',
    credentials: {
      developerId: process.env.CJ_DEVELOPER_ID!,
      websiteId: process.env.CJ_WEBSITE_ID!,
      personalAccessToken: process.env.CJ_ACCESS_TOKEN!,
    },
    settings: {
      autoSync: true,
      syncInterval: 180, // 3 hours
      enableWebhooks: true,
      webhookUrl: 'https://your-domain.com/api/webhooks/affiliates/cj',
      productFilters: {
        categories: ['Technology'],
        brands: ['Apple', 'Samsung', 'Garmin'],
      },
    },
    status: 'active',
    lastSyncAt: null,
    nextSyncAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await manager.addNetworkConfig(cjConfig);
  console.log('CJ Affiliate configured successfully');
}

async function configureImpactRadius(manager: AffiliateNetworkManager, tenantId: string) {
  const impactConfig: AffiliateNetworkConfig = {
    id: 'impact-config-1',
    tenantId,
    networkType: 'impact',
    name: 'Impact Radius Integration',
    authenticationType: 'credentials',
    credentials: {
      accountSid: process.env.IMPACT_ACCOUNT_SID!,
      authToken: process.env.IMPACT_AUTH_TOKEN!,
      partnerId: process.env.IMPACT_PARTNER_ID!,
    },
    settings: {
      autoSync: true,
      syncInterval: 240, // 4 hours
      enableWebhooks: true,
      webhookUrl: 'https://your-domain.com/api/webhooks/affiliates/impact',
    },
    status: 'active',
    lastSyncAt: null,
    nextSyncAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await manager.addNetworkConfig(impactConfig);
  console.log('Impact Radius configured successfully');
}

async function configureRakutenAdvertising(manager: AffiliateNetworkManager, tenantId: string) {
  const rakutenConfig: AffiliateNetworkConfig = {
    id: 'rakuten-config-1',
    tenantId,
    networkType: 'rakuten',
    name: 'Rakuten Advertising Integration',
    authenticationType: 'api_key',
    credentials: {
      publisherId: process.env.RAKUTEN_PUBLISHER_ID!,
      apiKey: process.env.RAKUTEN_API_KEY!,
      secretKey: process.env.RAKUTEN_SECRET_KEY!,
    },
    settings: {
      autoSync: true,
      syncInterval: 300, // 5 hours
      enableWebhooks: true,
      webhookUrl: 'https://your-domain.com/api/webhooks/affiliates/rakuten',
      productFilters: {
        categories: ['Electronics', 'Sports & Outdoors'],
        priceRange: { min: 50, max: 1000 },
      },
    },
    status: 'active',
    lastSyncAt: null,
    nextSyncAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await manager.addNetworkConfig(rakutenConfig);
  console.log('Rakuten Advertising configured successfully');
}

// =============================================================================
// 3. Manual Product Sync
// =============================================================================

async function manualProductSync(manager: AffiliateNetworkManager, tenantId: string) {
  try {
    // Sync ShareASale products
    const shareaSaleSync = await manager.syncNetwork('shareasale', tenantId, {
      fullSync: false, // Incremental sync
    });
    console.log(`ShareASale sync completed: ${shareaSaleSync.recordsSucceeded} products`);

    // Sync CJ products with full sync
    const cjSync = await manager.syncNetwork('cj', tenantId, {
      fullSync: true,
    });
    console.log(`CJ sync completed: ${cjSync.recordsSucceeded} products`);

  } catch (error) {
    console.error('Sync error:', error);
  }
}

// =============================================================================
// 4. Direct Adapter Usage (for advanced use cases)
// =============================================================================

async function directAdapterUsage() {
  // Create ShareASale adapter directly
  const shareaSaleConfig: AffiliateNetworkConfig = {
    id: 'direct-shareasale',
    tenantId: 'tenant-123',
    networkType: 'shareasale',
    name: 'Direct ShareASale',
    authenticationType: 'api_key',
    credentials: {
      affiliateId: process.env.SHAREASALE_AFFILIATE_ID!,
      token: process.env.SHAREASALE_TOKEN!,
      secretKey: process.env.SHAREASALE_SECRET_KEY!,
    },
    settings: { autoSync: false, syncInterval: 60, enableWebhooks: false },
    status: 'active',
    lastSyncAt: null,
    nextSyncAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const adapter = new ShareASaleAdapter(shareaSaleConfig);
  
  // Authenticate
  await adapter.authenticate(shareaSaleConfig.credentials);
  
  // Test connection
  const isConnected = await adapter.testConnection();
  console.log('ShareASale connected:', isConnected);
  
  // Get products with pagination
  const productsResponse = await adapter.getProducts({
    page: 1,
    limit: 20,
    filters: {
      category: 'Electronics',
      keyword: 'smartwatch',
    },
  });
  
  if (productsResponse.success && productsResponse.data) {
    console.log(`Found ${productsResponse.data.length} products`);
    
    // Generate affiliate link for first product
    if (productsResponse.data.length > 0) {
      const product = productsResponse.data[0];
      const affiliateLink = await adapter.generateAffiliateLink(
        product.networkProductId,
        {
          merchantId: product.merchantId,
          subId: 'custom-tracking-id',
        }
      );
      console.log('Affiliate link:', affiliateLink);
    }
  }
  
  // Get conversions
  const conversionsResponse = await adapter.getConversions(
    '2024-01-01', // from date
    '2024-12-31'  // to date
  );
  
  if (conversionsResponse.success && conversionsResponse.data) {
    console.log(`Found ${conversionsResponse.data.length} conversions`);
  }
}

// =============================================================================
// 5. Webhook Handling
// =============================================================================

async function setupWebhookHandling(manager: AffiliateNetworkManager) {
  const webhookHandler = manager.getWebhookHandler();
  
  // Example Express.js webhook endpoint
  // app.post('/api/webhooks/affiliates/:networkType', async (req, res) => {
  //   try {
  //     const networkType = req.params.networkType as AffiliateNetworkType;
  //     const webhookRequest: WebhookRequest = {
  //       headers: req.headers,
  //       body: req.body,
  //       rawBody: req.rawBody || Buffer.from(req.body),
  //       query: req.query,
  //     };
  
  //     const result = await webhookHandler.handleWebhook(networkType, webhookRequest);
  
  //     if (result.success) {
  //       res.status(200).json({ success: true, eventType: result.eventType });
  //     } else {
  //       const statusCode = result.shouldRetry ? 500 : 400;
  //       res.status(statusCode).json({
  //         success: false,
  //         error: result.error,
  //         shouldRetry: result.shouldRetry,
  //       });
  //     }
  //   } catch (error) {
  //     res.status(500).json({
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error',
  //       shouldRetry: true,
  //     });
  //   }
  // });

  console.log('Webhook handling configured');
}

// =============================================================================
// 6. Monitoring and Status
// =============================================================================

async function monitorNetworks(manager: AffiliateNetworkManager) {
  // Get status of all networks
  const statuses = await manager.getNetworkStatuses();
  console.log('Network statuses:', statuses);
  
  // Get sync schedules
  const schedules = manager.getSyncSchedules();
  console.log('Sync schedules:', schedules);
  
  // Get active syncs
  const activeSyncs = manager.getActiveSyncs();
  console.log('Active syncs:', activeSyncs);
  
  // Set up periodic monitoring
  setInterval(async () => {
    const currentStatuses = await manager.getNetworkStatuses();
    const disconnectedNetworks = currentStatuses.filter(status => !status.connected);
    
    if (disconnectedNetworks.length > 0) {
      console.warn('Disconnected networks:', disconnectedNetworks);
      // Send alerts, retry connections, etc.
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

// =============================================================================
// 7. Complete Setup Example
// =============================================================================

async function completeSetupExample() {
  const tenantId = 'tenant-123';
  
  try {
    // 1. Setup manager
    const manager = await setupAffiliateNetworkManager();
    
    // 2. Configure all networks
    await configureShareASale(manager, tenantId);
    await configureCJAffiliate(manager, tenantId);
    await configureImpactRadius(manager, tenantId);
    await configureRakutenAdvertising(manager, tenantId);
    
    // 3. Setup webhook handling
    await setupWebhookHandling(manager);
    
    // 4. Start monitoring
    await monitorNetworks(manager);
    
    // 5. Run initial sync
    await manualProductSync(manager, tenantId);
    
    console.log('Affiliate network integration setup complete!');
    
    // The manager will now automatically:
    // - Sync products according to schedules
    // - Handle incoming webhooks
    // - Monitor network health
    // - Retry failed operations
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// =============================================================================
// 8. Utility Functions
// =============================================================================

async function utilityExamples() {
  // Test network capabilities
  const shareaSaleCapabilities = AffiliateNetworkAdapterFactory.getNetworkCapabilities('shareasale');
  console.log('ShareASale capabilities:', shareaSaleCapabilities);
  
  // Validate configuration
  const testConfig: AffiliateNetworkConfig = {
    id: 'test',
    tenantId: 'test',
    networkType: 'shareasale',
    name: 'Test Config',
    authenticationType: 'api_key',
    credentials: { affiliateId: '123', token: 'abc', secretKey: 'secret' },
    settings: { autoSync: false, syncInterval: 60, enableWebhooks: false },
    status: 'inactive',
    lastSyncAt: null,
    nextSyncAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const validation = AffiliateNetworkAdapterFactory.validateConfig(testConfig);
  console.log('Config validation:', validation);
  
  // Test connection
  if (validation.valid) {
    const connectionTest = await AffiliateNetworkAdapterFactory.testConnection(testConfig);
    console.log('Connection test:', connectionTest);
  }
}

// Run examples
if (require.main === module) {
  completeSetupExample().catch(console.error);
}