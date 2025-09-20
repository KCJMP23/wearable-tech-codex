# AffiliateOS Network Integrations

Comprehensive affiliate network integrations for AffiliateOS, supporting major networks including ShareASale, CJ Affiliate (Commission Junction), Impact Radius, and Rakuten Advertising.

## Features

- **Multiple Network Support**: ShareASale, CJ Affiliate, Impact Radius, Rakuten Advertising
- **Unified API**: Consistent interface across all networks
- **Automatic Sync**: Scheduled product and commission syncing
- **Webhook Support**: Real-time updates from affiliate networks
- **Rate Limiting**: Built-in rate limiting and retry logic
- **Bulk Operations**: Efficient batch processing
- **Error Handling**: Comprehensive error handling and monitoring
- **TypeScript**: Full TypeScript support with comprehensive types

## Installation

```bash
npm install @affiliate-factory/integrations
```

## Quick Start

```typescript
import {
  createAffiliateNetworkManager,
  AffiliateNetworkConfig,
  type ManagerConfig,
} from '@affiliate-factory/integrations';

// Configure the manager
const managerConfig: ManagerConfig = {
  encryptionKey: process.env.ENCRYPTION_KEY!,
  webhookBaseUrl: 'https://your-domain.com',
  maxConcurrentSyncs: 3,
  defaultSyncInterval: 60,
  enableMonitoring: true,
  retryAttempts: 3,
};

// Create manager
const manager = createAffiliateNetworkManager(managerConfig);

// Configure ShareASale
const shareaSaleConfig: AffiliateNetworkConfig = {
  id: 'shareasale-1',
  tenantId: 'your-tenant-id',
  networkType: 'shareasale',
  name: 'ShareASale Integration',
  authenticationType: 'api_key',
  credentials: {
    affiliateId: 'YOUR_AFFILIATE_ID',
    token: 'YOUR_TOKEN',
    secretKey: 'YOUR_SECRET_KEY',
  },
  settings: {
    autoSync: true,
    syncInterval: 120, // 2 hours
    enableWebhooks: true,
  },
  status: 'active',
  // ... other required fields
};

await manager.addNetworkConfig(shareaSaleConfig);
```

## Supported Networks

### ShareASale
- **Authentication**: API Key + Secret
- **Features**: Product sync, commission tracking, webhooks
- **Rate Limits**: 30 req/min, 1800 req/hour
- **Webhooks**: Supported with signature validation

### CJ Affiliate (Commission Junction)
- **Authentication**: Personal Access Token
- **Features**: Product catalog, commission tracking, advanced reporting
- **Rate Limits**: 100 req/min, 6000 req/hour
- **Webhooks**: Supported

### Impact Radius
- **Authentication**: Basic Auth (Account SID + Auth Token)
- **Features**: Campaign management, conversion tracking, payout reports
- **Rate Limits**: 120 req/min, 7200 req/hour
- **Webhooks**: Supported with signature validation

### Rakuten Advertising (LinkShare)
- **Authentication**: API Key
- **Features**: Product feeds, coupons/deals, analytics
- **Rate Limits**: 60 req/min, 3600 req/hour
- **Webhooks**: Supported

## Core Concepts

### Network Adapters

Each network has a dedicated adapter implementing the `AffiliateNetworkAdapter` interface:

```typescript
import { ShareASaleAdapter, CJAffiliateAdapter } from '@affiliate-factory/integrations';

// Direct adapter usage
const adapter = new ShareASaleAdapter(config);
await adapter.authenticate(credentials);
const products = await adapter.getProducts({ page: 1, limit: 20 });
```

### Manager Pattern

The `AffiliateNetworkManager` provides centralized management:

```typescript
// Add network configurations
await manager.addNetworkConfig(shareaSaleConfig);
await manager.addNetworkConfig(cjConfig);

// Manual sync
const syncResult = await manager.syncNetwork('shareasale', 'tenant-id');

// Monitor status
const statuses = await manager.getNetworkStatuses();
```

### Webhook Handling

Unified webhook handling across all networks:

```typescript
const webhookHandler = manager.getWebhookHandler();

// Express.js example
app.post('/webhooks/affiliates/:networkType', async (req, res) => {
  const result = await webhookHandler.handleWebhook(
    req.params.networkType,
    {
      headers: req.headers,
      body: req.body,
      rawBody: req.rawBody,
    }
  );
  
  res.status(result.success ? 200 : 400).json(result);
});
```

## API Reference

### Types

```typescript
type AffiliateNetworkType = 'shareasale' | 'cj' | 'impact' | 'rakuten';

interface AffiliateProduct {
  id: string;
  networkType: AffiliateNetworkType;
  networkProductId: string;
  merchantId: string;
  title: string;
  price: ProductPrice;
  commissionRate: number;
  affiliateUrl: string;
  // ... more fields
}

interface Conversion {
  id: string;
  networkType: AffiliateNetworkType;
  orderId: string;
  orderValue: number;
  commissionAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'reversed';
  // ... more fields
}
```

### Methods

#### AffiliateNetworkAdapter

```typescript
class AffiliateNetworkAdapter {
  // Authentication
  abstract authenticate(credentials: AuthenticationCredentials): Promise<boolean>;
  abstract testConnection(): Promise<boolean>;
  
  // Product operations
  abstract getProducts(request: PaginatedRequest): Promise<NetworkApiResponse<AffiliateProduct[]>>;
  abstract getProduct(networkProductId: string): Promise<NetworkApiResponse<AffiliateProduct>>;
  abstract syncProducts(options?: ProductSyncOptions): Promise<SyncOperation>;
  
  // Link generation
  abstract generateAffiliateLink(productId: string, params?: Record<string, string>): Promise<string>;
  
  // Conversion tracking
  abstract getConversions(dateFrom?: string, dateTo?: string): Promise<NetworkApiResponse<Conversion[]>>;
  
  // Webhooks
  abstract handleWebhook(payload: WebhookPayload): Promise<void>;
  abstract validateWebhookSignature(payload: string, signature: string): boolean;
}
```

#### AffiliateNetworkManager

```typescript
class AffiliateNetworkManager {
  // Configuration
  async addNetworkConfig(config: AffiliateNetworkConfig): Promise<void>;
  removeNetworkConfig(networkType: AffiliateNetworkType, tenantId: string): void;
  
  // Sync operations
  async syncNetwork(networkType: AffiliateNetworkType, tenantId: string, options?: SyncOptions): Promise<SyncOperation>;
  async runScheduledSyncs(): Promise<void>;
  
  // Monitoring
  async getNetworkStatuses(): Promise<NetworkStatus[]>;
  getSyncSchedules(): SyncSchedule[];
  getActiveSyncs(): string[];
  
  // Bulk operations
  async bulkImportProducts(networkType: AffiliateNetworkType, tenantId: string, products: AffiliateProduct[]): Promise<BulkOperationResult>;
}
```

## Configuration

### Environment Variables

```bash
# ShareASale
SHAREASALE_AFFILIATE_ID=your_affiliate_id
SHAREASALE_TOKEN=your_token
SHAREASALE_SECRET_KEY=your_secret_key

# CJ Affiliate
CJ_DEVELOPER_ID=your_developer_id
CJ_WEBSITE_ID=your_website_id
CJ_ACCESS_TOKEN=your_access_token

# Impact Radius
IMPACT_ACCOUNT_SID=your_account_sid
IMPACT_AUTH_TOKEN=your_auth_token
IMPACT_PARTNER_ID=your_partner_id

# Rakuten Advertising
RAKUTEN_PUBLISHER_ID=your_publisher_id
RAKUTEN_API_KEY=your_api_key
RAKUTEN_SECRET_KEY=your_secret_key

# General
ENCRYPTION_KEY=your_encryption_key_for_credentials
```

### Network Configuration

```typescript
const networkConfig: AffiliateNetworkConfig = {
  id: 'unique-config-id',
  tenantId: 'your-tenant-id',
  networkType: 'shareasale',
  name: 'My ShareASale Integration',
  authenticationType: 'api_key',
  credentials: {
    affiliateId: process.env.SHAREASALE_AFFILIATE_ID!,
    token: process.env.SHAREASALE_TOKEN!,
    secretKey: process.env.SHAREASALE_SECRET_KEY!,
  },
  settings: {
    autoSync: true,
    syncInterval: 120, // minutes
    enableWebhooks: true,
    webhookUrl: 'https://your-domain.com/webhooks/shareasale',
    productFilters: {
      categories: ['Electronics', 'Health & Fitness'],
      minCommissionRate: 3.0,
      brands: ['Apple', 'Samsung'],
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
```

## Database Schema

The package includes SQL migrations for Supabase/PostgreSQL:

```sql
-- Core tables
affiliate_network_configs     -- Network configurations
affiliate_products           -- Synced products
affiliate_clicks            -- Click tracking
affiliate_conversions       -- Conversion tracking
affiliate_sync_operations   -- Sync history
commission_structures       -- Commission rates
```

Run the migration:

```bash
npx supabase migration up --file 20250119_affiliate_networks.sql
```

## Error Handling

The package provides comprehensive error handling:

```typescript
import { AffiliateNetworkError, RateLimitError, AuthenticationError } from '@affiliate-factory/integrations';

try {
  await adapter.syncProducts();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed. Check credentials.');
  } else if (error instanceof AffiliateNetworkError) {
    console.log(`Network error: ${error.message}`);
    if (error.retryable) {
      // Retry the operation
    }
  }
}
```

## Monitoring and Logging

```typescript
// Listen to manager events
manager.on('syncCompleted', (event) => {
  console.log(`Sync completed: ${event.recordsSucceeded} products`);
});

manager.on('syncError', (event) => {
  console.error(`Sync failed: ${event.error}`);
});

manager.on('networkConfigAdded', (event) => {
  console.log(`Network ${event.networkType} added`);
});

// Monitor network health
setInterval(async () => {
  const statuses = await manager.getNetworkStatuses();
  const unhealthy = statuses.filter(s => !s.connected);
  if (unhealthy.length > 0) {
    console.warn('Unhealthy networks:', unhealthy);
  }
}, 5 * 60 * 1000);
```

## Best Practices

1. **Rate Limiting**: Always respect network rate limits. The adapters handle this automatically.

2. **Error Handling**: Implement proper error handling and retry logic for transient failures.

3. **Webhook Security**: Always validate webhook signatures when available.

4. **Credentials Security**: Store credentials encrypted and use environment variables.

5. **Monitoring**: Monitor sync operations and network health regularly.

6. **Filtering**: Use product filters to sync only relevant products.

7. **Batch Processing**: Use bulk operations for large datasets.

## Examples

See the `examples/` directory for complete usage examples:

- `basic-usage.ts` - Complete setup and usage example
- `webhook-server.ts` - Express.js webhook server
- `bulk-operations.ts` - Bulk import/export examples
- `monitoring.ts` - Health monitoring setup

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please create an issue on the GitHub repository or contact the AffiliateOS team.