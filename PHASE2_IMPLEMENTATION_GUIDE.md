# Phase 2 Database Schema & TypeScript Implementation Guide

This document provides a comprehensive guide to the Phase 2 database schema and TypeScript implementation for the Wearable Tech Codex platform, covering:

1. **Proprietary Affiliate Network** - Direct brand partnerships and private marketplace
2. **Mobile Ecosystem** - Push notifications, device management, and mobile analytics  
3. **API Economy** - Developer marketplace, app installations, and webhook system

## 📁 File Structure

```
packages/sdk/src/
├── database.types.ts           # Supabase-compatible database types
├── types.ts                   # Enhanced TypeScript interfaces
├── supabase.ts                # Typed Supabase client
└── services/
    └── phase2.ts              # API service implementations

supabase/migrations/
├── 001_initial_schema.sql     # Original schema (existing)
└── 005_phase2_comprehensive_schema.sql  # Phase 2 enhancement
```

## 🗄️ Database Schema Overview

### Core Enhancements

The Phase 2 schema builds upon the existing foundation with:

- **19 new tables** for advanced functionality
- **Comprehensive indexing** for performance at scale
- **Row-level security (RLS)** for tenant isolation
- **Materialized views** for analytics performance
- **Trigger functions** for automated updates

### Key Table Categories

#### 1. Proprietary Affiliate Network
```sql
-- Brand management and partnerships
brands                    -- Direct brand relationships
brand_partnerships        -- Tenant-specific brand deals
private_marketplace       -- Exclusive product catalog
blockchain_transactions   -- Web3 attribution tracking
user_rewards             -- Loyalty and rewards system
```

#### 2. Mobile Ecosystem
```sql
-- Mobile app and notification system
mobile_devices           -- Device registration for push notifications
notification_campaigns   -- Marketing campaign management
notification_logs        -- Delivery tracking and analytics
mobile_analytics         -- App usage and behavior tracking
tenant_settings          -- Mobile app configuration
```

#### 3. API Economy
```sql
-- Developer marketplace and integrations
developer_profiles       -- Third-party developer accounts
developer_apps           -- Marketplace applications
app_installations        -- Tenant app installations
api_usage_logs          -- API request tracking
api_rate_limits         -- Throttling configuration
api_keys                -- Multiple API key management
app_reviews             -- Marketplace review system
webhooks                -- Event notification system
webhook_deliveries      -- Delivery attempt tracking
```

#### 4. Enhanced Analytics
```sql
-- Advanced tracking and optimization
conversion_events        -- Detailed attribution tracking
ab_test_experiments     -- A/B testing framework
ab_test_participations  -- User test assignments
affiliate_networks      -- Multi-network management
tenant_network_connections -- Network credentials
product_variants        -- Cross-network product variations
product_price_history   -- Price tracking and alerts
```

## 🔧 TypeScript Implementation

### Database Types

The schema includes comprehensive TypeScript definitions compatible with Supabase:

```typescript
// Auto-generated and manually maintained types
import type { Database, Tables, TablesInsert, TablesUpdate } from '@affiliate-factory/sdk';

// Typed Supabase client
import { getSupabaseClient, TypedSupabaseClient } from '@affiliate-factory/sdk';

const client: TypedSupabaseClient = getSupabaseClient('service');
```

### Service Layer Architecture

Phase 2 includes service classes following Next.js 14 App Router patterns:

```typescript
import { createPhase2Services } from '@affiliate-factory/sdk/services/phase2';

const services = createPhase2Services();

// Brand management
const brand = await services.brands.createBrand({
  name: "TechCorp",
  commissionRate: 15.0,
  tier: "premium"
});

// Mobile notifications
const campaign = await services.mobile.createNotificationCampaign(tenantId, {
  name: "Black Friday Sale",
  type: "push",
  title: "50% Off Wearables!",
  body: "Limited time offer on all smartwatches"
});

// Developer apps
const app = await services.developer.createApp(developerId, {
  name: "Analytics Pro",
  category: "analytics",
  permissions: ["read:analytics", "read:products"]
});

// Conversion tracking
await services.analytics.trackConversion({
  tenantId,
  eventType: "purchase",
  conversionValue: 299.99,
  commissionEarned: 44.99
});
```

## 🚀 Getting Started

### 1. Run the Migration

Apply the Phase 2 schema to your Supabase instance:

```bash
# Using Supabase CLI
supabase db reset
supabase db push

# Or apply the specific migration
psql -h your-db-host -d your-db -f supabase/migrations/005_phase2_comprehensive_schema.sql
```

### 2. Update Dependencies

Ensure your project uses the latest SDK:

```bash
pnpm install @affiliate-factory/sdk@latest
```

### 3. Configure Environment

Add any new environment variables:

```env
# Existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Phase 2 additions (optional)
WEBHOOK_SECRET=your-webhook-secret
MOBILE_PUSH_KEY=your-fcm-server-key
BLOCKCHAIN_RPC_URL=your-ethereum-rpc-url
```

### 4. Implement in Next.js App Router

Create API routes using the new services:

```typescript
// app/api/brands/route.ts
import { createPhase2Services } from '@affiliate-factory/sdk/services/phase2';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const services = createPhase2Services();
  const body = await request.json();
  
  const result = await services.brands.createBrand(body);
  
  if (!result.success) {
    return NextResponse.json(result.error, { status: 400 });
  }
  
  return NextResponse.json(result.data);
}

export async function GET(request: NextRequest) {
  const services = createPhase2Services();
  const { searchParams } = new URL(request.url);
  
  const result = await services.brands.getBrands({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    status: searchParams.get('status') || undefined,
  });
  
  return NextResponse.json(result);
}
```

## 📱 Mobile Integration Examples

### Push Notification Setup

```typescript
// Register device for notifications
const device = await services.mobile.registerDevice(tenantId, {
  userIdentifier: 'user@example.com',
  deviceType: 'ios',
  deviceToken: 'fcm-token-here',
  appVersion: '1.0.0',
  timezone: 'America/New_York'
});

// Create targeted campaign
const campaign = await services.mobile.createNotificationCampaign(tenantId, {
  name: 'Product Launch',
  type: 'push',
  title: 'New Apple Watch Ultra 3!',
  body: 'Be the first to review the latest wearable tech',
  targetAudience: {
    interests: ['apple', 'smartwatch'],
    location: 'US'
  },
  scheduledAt: '2024-12-01T09:00:00Z'
});
```

### Mobile Analytics Tracking

```typescript
// Track mobile app events
const events = [
  {
    eventType: 'app_open',
    eventData: { source: 'notification', campaign_id: 'camp_123' }
  },
  {
    eventType: 'product_view',
    eventData: { product_id: 'prod_456', category: 'smartwatch' }
  },
  {
    eventType: 'affiliate_click',
    eventData: { url: 'https://amazon.com/...', commission_rate: 5.5 }
  }
];

// Batch insert for performance
await client
  .from('mobile_analytics')
  .insert(events.map(event => ({
    tenant_id: tenantId,
    device_id: deviceId,
    user_identifier: userId,
    event_type: event.eventType,
    event_data: event.eventData,
    timestamp: new Date().toISOString()
  })));
```

## 🔌 API Economy Implementation

### Developer App Creation

```typescript
// Create developer profile
const developer = await client
  .from('developer_profiles')
  .insert([{
    name: 'John Doe',
    email: 'john@techstartup.com',
    company: 'Tech Startup Inc',
    tier: 'pro'
  }])
  .select()
  .single();

// Create marketplace app
const app = await services.developer.createApp(developer.data.id, {
  name: 'Content Optimizer',
  description: 'AI-powered content optimization for affiliate sites',
  category: 'content',
  permissions: ['read:content', 'write:content', 'read:analytics'],
  pricingModel: 'subscription',
  pricingDetails: {
    monthlyPrice: 29.99,
    trialDays: 14
  }
});

// The response includes the secret key (one-time only)
console.log('API Key:', app.data.apiKey);
console.log('Secret Key:', app.data.secretKey); // Save this securely!
```

### Webhook System

```typescript
// Create webhook for real-time notifications
const webhook = await client
  .from('webhooks')
  .insert([{
    tenant_id: tenantId,
    name: 'Content Published Hook',
    url: 'https://myapp.com/webhooks/content',
    events: ['content.published', 'content.updated'],
    secret: 'webhook_secret_key',
    headers: {
      'Authorization': 'Bearer my-app-token'
    }
  }]);

// Track webhook deliveries
const delivery = await client
  .from('webhook_deliveries')
  .insert([{
    webhook_id: webhookId,
    event_type: 'content.published',
    payload: {
      post_id: 'post_123',
      title: 'Best Fitness Trackers 2024',
      published_at: new Date().toISOString()
    },
    attempt: 1,
    status_code: 200,
    delivered_at: new Date().toISOString()
  }]);
```

## 📊 Analytics & Reporting

### Conversion Tracking

```typescript
// Track detailed conversion events
const conversion = await services.analytics.trackConversion({
  tenantId,
  userIdentifier: 'user_12345',
  sessionId: 'sess_abcdef',
  eventType: 'purchase',
  productId: 'prod_789',
  brandId: 'brand_apple',
  affiliateUrl: 'https://amazon.com/dp/B08...',
  referrer: 'https://google.com',
  userAgent: request.headers['user-agent'],
  ipAddress: '192.168.1.1',
  country: 'US',
  deviceType: 'mobile',
  conversionValue: 299.99,
  currency: 'USD',
  commissionEarned: 14.99,
  metadata: {
    campaign: 'black_friday_2024',
    discount_code: 'BF2024'
  }
});
```

### A/B Testing Framework

```typescript
// Create A/B test experiment
const experiment = await client
  .from('ab_test_experiments')
  .insert([{
    tenant_id: tenantId,
    name: 'Product Card Layout Test',
    description: 'Testing grid vs list layout for product displays',
    experiment_type: 'layout',
    traffic_allocation: 0.5, // 50% of users
    variants: [
      { id: 'control', name: 'Grid Layout', config: { layout: 'grid' } },
      { id: 'variant', name: 'List Layout', config: { layout: 'list' } }
    ],
    success_metrics: {
      primary: 'click_through_rate',
      secondary: ['time_on_page', 'conversion_rate']
    },
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  }]);

// Assign user to test variant
const participation = await client
  .from('ab_test_participations')
  .insert([{
    experiment_id: experimentId,
    user_identifier: userId,
    variant_id: Math.random() < 0.5 ? 'control' : 'variant',
    assigned_at: new Date().toISOString()
  }]);
```

## 🔐 Security & Performance

### Row Level Security (RLS)

All tables include tenant-based RLS policies:

```sql
-- Example policy for tenant isolation
CREATE POLICY "Tenants can manage their mobile devices" ON mobile_devices
  FOR ALL USING (tenant_id IN (
    SELECT id FROM tenants WHERE slug = current_setting('app.current_tenant', true)
  ));
```

### Performance Optimizations

- **Comprehensive indexing** on frequently queried columns
- **Materialized views** for expensive analytics queries
- **Composite indexes** for multi-column searches
- **Partial indexes** for filtered queries

### Rate Limiting

```typescript
// Configure API rate limits per app
await client
  .from('api_rate_limits')
  .insert([{
    app_id: appId,
    endpoint_pattern: '/api/v1/products/*',
    requests_per_minute: 100,
    requests_per_hour: 1000,
    requests_per_day: 10000,
    burst_limit: 20
  }]);
```

## 🛠️ Maintenance & Monitoring

### Materialized View Refresh

Set up automated refresh for analytics views:

```sql
-- Refresh every hour via cron job
REFRESH MATERIALIZED VIEW CONCURRENTLY app_installation_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_revenue_analytics;
```

### Monitoring Queries

```sql
-- Monitor API usage
SELECT 
  da.name,
  COUNT(*) as requests,
  AVG(aul.response_time_ms) as avg_response_time,
  COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) as errors
FROM api_usage_logs aul
JOIN developer_apps da ON aul.app_id = da.id
WHERE aul.created_at >= NOW() - INTERVAL '1 day'
GROUP BY da.name
ORDER BY requests DESC;

-- Monitor webhook delivery success
SELECT 
  w.name,
  COUNT(*) as deliveries,
  COUNT(CASE WHEN wd.status_code BETWEEN 200 AND 299 THEN 1 END) as successful,
  COUNT(CASE WHEN wd.status_code >= 400 THEN 1 END) as failed
FROM webhook_deliveries wd
JOIN webhooks w ON wd.webhook_id = w.id
WHERE wd.created_at >= NOW() - INTERVAL '1 day'
GROUP BY w.name;
```

## 🔄 Migration Path

### From Phase 1 to Phase 2

1. **Backup existing data**
2. **Run migration script** (`005_phase2_comprehensive_schema.sql`)
3. **Update application code** to use new types and services
4. **Test integrations** with sandbox data
5. **Deploy gradually** with feature flags

### Rollback Strategy

```sql
-- Emergency rollback (removes Phase 2 tables)
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
-- ... (continue for all Phase 2 tables)
```

## 📈 Next Steps

With Phase 2 implemented, the platform supports:

- ✅ **Multi-network affiliate management**
- ✅ **Mobile app ecosystem** 
- ✅ **Developer marketplace**
- ✅ **Advanced analytics & A/B testing**
- ✅ **Blockchain attribution tracking**
- ✅ **Enterprise webhook system**

Ready for **Phase 3**: International expansion, AI optimization, and white-label solutions.

## 🤝 Contributing

When extending the schema:

1. **Follow naming conventions** (snake_case for DB, camelCase for TS)
2. **Add comprehensive indexes** for new query patterns
3. **Include RLS policies** for security
4. **Update TypeScript types** in both files
5. **Add service methods** for new functionality
6. **Document changes** in migration comments

---

**Questions?** Check the existing codebase or create an issue for clarification on Phase 2 implementation details.