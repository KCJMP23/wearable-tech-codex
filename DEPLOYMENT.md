# Affiliate Factory Platform - Deployment Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start Guide](#quick-start-guide)
5. [Detailed Setup Instructions](#detailed-setup-instructions)
6. [CLI Commands Reference](#cli-commands-reference)
7. [Development Workflow](#development-workflow)
8. [Testing Instructions](#testing-instructions)
9. [Sample Data and Demo](#sample-data-and-demo)
10. [Production Deployment Checklist](#production-deployment-checklist)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Project Overview

**Affiliate Factory** is a multi-tenant, AI-powered affiliate marketing platform specializing in wearable technology. Built as a monorepo with Next.js 14, Supabase, and OpenAI, it provides automated content generation, product curation, and multi-channel marketing capabilities.

### Key Features
- **Multi-tenant Architecture**: Subdomain-based tenant isolation with custom theming
- **AI-Powered Content**: Automated product reviews, editorial content, and newsletters
- **Agent System**: Autonomous workers for content generation, trends analysis, and personalization
- **Affiliate Integration**: Amazon PA-API v5 with support for multiple affiliate programs
- **Vector Search**: Semantic product discovery using pgvector embeddings
- **Real-time Analytics**: Comprehensive insights tracking with custom dashboards

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI/ML**: OpenAI GPT-4, text-embedding-3-small, pgvector
- **Infrastructure**: Vercel (hosting), pnpm workspaces (monorepo)
- **Testing**: Vitest (unit), Playwright (e2e)

---

## System Architecture

```
affiliate-factory/
├── apps/
│   ├── web/              # Next.js 14 application
│   │   ├── app/
│   │   │   ├── (site)/   # Public storefront routes
│   │   │   └── (admin)/  # Admin dashboard routes
│   │   └── middleware.ts # Multi-tenant routing
│   └── worker/           # Agent runner service
│       └── agents/       # AI agent implementations
├── packages/
│   ├── sdk/              # Core SDK and utilities
│   ├── ui/               # Shared React components
│   └── content/          # Content generation templates
├── infra/
│   ├── supabase/
│   │   ├── sql/          # Database migrations
│   │   └── functions/    # Edge Functions
│   └── vercel/           # Deployment configuration
└── bin/
    └── site.mjs          # CLI management tool
```

### Database Schema Overview
- **Multi-tenant**: `tenants` table with RLS policies
- **Hierarchical Taxonomy**: PostgreSQL ltree for categories
- **Vector Embeddings**: pgvector for semantic search
- **Agent Tasks**: Queue system for autonomous workers
- **Content Management**: Posts, products, reviews with full-text search

---

## Prerequisites

### Required Software
- **Node.js**: v18.17.0 or higher (LTS recommended)
- **pnpm**: v8.15.0 (`npm install -g pnpm@8.15.0`)
- **Git**: v2.38 or higher
- **PostgreSQL**: v15+ (handled by Supabase)

### Required Accounts
1. **Supabase Account**: [supabase.com](https://supabase.com)
2. **Vercel Account**: [vercel.com](https://vercel.com)
3. **OpenAI API**: [platform.openai.com](https://platform.openai.com)
4. **Amazon Associates**: [affiliate-program.amazon.com](https://affiliate-program.amazon.com)
5. **Domain Provider**: For custom domains

### Optional Services
- **Resend**: Email service for newsletters
- **Tavily/SerpAPI**: Web search for research
- **Upstash Redis**: Queue management (production)
- **Sentry**: Error tracking

---

## Quick Start Guide

```bash
# 1. Clone the repository
git clone https://github.com/your-org/affiliate-factory.git
cd affiliate-factory

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Set up Supabase (local development)
npx supabase init
npx supabase start

# 5. Run database migrations
npx supabase db push

# 6. Seed initial data
pnpm exec site init-tenant

# 7. Start development server
pnpm dev

# Visit http://localhost:3000
```

---

## Detailed Setup Instructions

### 1. Environment Configuration

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

#### Essential Variables

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-[YOUR_KEY]

# Amazon Associates (required for products)
AMAZON_PA_API_ACCESS_KEY=[ACCESS_KEY]
AMAZON_PA_API_SECRET_KEY=[SECRET_KEY]
AMAZON_PA_API_PARTNER_TAG=jmpkc01-20

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DEFAULT_TENANT_SLUG=nectarheat
```

### 2. Supabase Setup

#### Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Create new project
3. Note your project URL and keys from Settings > API

#### Database Setup

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref [PROJECT_REF]

# Push migrations
supabase db push

# Or run SQL files directly
supabase db execute -f infra/supabase/sql/01-extensions.sql
supabase db execute -f infra/supabase/sql/02-schema.sql
supabase db execute -f infra/supabase/sql/03-rls.sql
supabase db execute -f infra/supabase/sql/04-indexes.sql
```

#### Enable Required Extensions

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

#### Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy

# Or deploy individually
supabase functions deploy ingest-products
supabase functions deploy execute-agent
supabase functions deploy verify-links
```

### 3. Vercel Deployment

#### Initial Setup

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### Configure Project

1. **Framework Preset**: Next.js
2. **Build Command**: `pnpm build`
3. **Output Directory**: `apps/web/.next`
4. **Install Command**: `pnpm install`

#### Environment Variables

Add all variables from `.env.local` to Vercel:

```bash
# Add variables via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add all required variables
```

#### Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 4. API Integrations

#### Amazon Product Advertising API

1. **Register for Amazon Associates**
   - Go to [affiliate-program.amazon.com](https://affiliate-program.amazon.com)
   - Complete registration
   - Get your Partner Tag (e.g., `jmpkc01-20`)

2. **Request PA-API Access**
   - Generate 3 qualifying sales
   - Request API access from Associates Central
   - Save Access Key and Secret Key

3. **Configure in `.env.local`**
   ```env
   AMAZON_PA_API_ACCESS_KEY=your-access-key
   AMAZON_PA_API_SECRET_KEY=your-secret-key
   AMAZON_PA_API_PARTNER_TAG=jmpkc01-20
   AMAZON_PA_API_LOCALE=US
   ```

#### OpenAI API

1. **Get API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create API key in API Keys section
   - Set usage limits for safety

2. **Configure Models**
   ```env
   OPENAI_API_KEY=sk-your-key
   EMBEDDINGS_MODEL=text-embedding-3-small
   ```

#### Email Service (Resend)

1. **Create Resend Account**
   - Sign up at [resend.com](https://resend.com)
   - Verify domain
   - Get API key

2. **Configure**
   ```env
   RESEND_API_KEY=re_your-key
   EMAIL_FROM=noreply@yourdomain.com
   ```

### 5. Domain Configuration

#### Vercel Domain Setup

```bash
# Add custom domain
vercel domains add yourdomain.com

# Configure DNS at your provider:
# A record: @ → 76.76.21.21
# CNAME record: www → cname.vercel-dns.com
```

#### Multi-tenant Subdomains

```bash
# Add wildcard domain for tenants
vercel domains add *.yourdomain.com

# DNS configuration:
# CNAME record: * → cname.vercel-dns.com
```

---

## CLI Commands Reference

The platform includes a comprehensive CLI tool (`pnpm exec site`) for management:

### Tenant Management

```bash
# Initialize new tenant
pnpm exec site init-tenant
# Follow prompts for name, domain, theme

# Onboard tenant (complete setup)
pnpm exec site onboard [tenant-slug]

# List all tenants
pnpm exec site list-tenants
```

### Content Management

```bash
# Seed sample posts
pnpm exec site seed [tenant-slug]

# Import products from ASIN file
pnpm exec site import-products [file.txt] [tenant-slug]

# Generate content batch
pnpm exec site generate-content [tenant-slug] --type=review --count=10
```

### Agent Operations

```bash
# Run specific agent
pnpm exec site run-agent OrchestratorAgent [tenant-slug]

# Available agents:
# - OrchestratorAgent: Coordinates all other agents
# - ProductAgent: Fetches and imports products
# - EditorialAgent: Generates editorial content
# - ReviewAgent: Creates product reviews
# - NewsletterAgent: Compiles newsletters
# - PersonalizationAgent: User personalization
# - SeasonalAgent: Seasonal campaigns
# - TrendsAgent: Trend analysis
# - SocialAgent: Social media content
# - LinkVerifierAgent: Verify affiliate links

# Schedule agent task
pnpm exec site schedule-agent [agent-name] [tenant-slug] --cron="0 */6 * * *"
```

### Link Management

```bash
# Verify all affiliate links
pnpm exec site verify-links [tenant-slug]

# Update broken links
pnpm exec site fix-links [tenant-slug]

# Generate link report
pnpm exec site link-report [tenant-slug]
```

### Database Operations

```bash
# Reset database (development only)
pnpm exec site db:reset

# Run migrations
pnpm exec site db:migrate

# Backup data
pnpm exec site db:backup [tenant-slug]
```

---

## Development Workflow

### Local Development Setup

```bash
# 1. Start Supabase locally
supabase start

# 2. Start development server
pnpm dev

# 3. Start worker (in separate terminal)
pnpm --filter @affiliate-factory/worker start

# Access at:
# - Web app: http://localhost:3000
# - Supabase Studio: http://localhost:54323
```

### Code Organization

#### Adding New Features

1. **Components**: Add to `packages/ui/components/`
2. **API Routes**: Create in `apps/web/app/api/`
3. **Database**: Add migration to `infra/supabase/sql/`
4. **Agents**: Implement in `apps/worker/agents/`

#### Git Workflow

```bash
# Feature branch
git checkout -b feature/your-feature

# Commit with conventional commits
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue"
git commit -m "docs: update readme"

# Push and create PR
git push origin feature/your-feature
```

### Environment-specific Configurations

```typescript
// apps/web/lib/config.ts
export const config = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  features: {
    aiContent: !!process.env.OPENAI_API_KEY,
    emailMarketing: !!process.env.RESEND_API_KEY,
    webSearch: !!process.env.TAVILY_API_KEY,
  }
};
```

---

## Testing Instructions

### Unit Testing (Vitest)

```bash
# Run all unit tests
pnpm test:unit

# Run with coverage
pnpm test:unit --coverage

# Watch mode
pnpm test:unit --watch

# Test specific package
pnpm --filter @affiliate-factory/sdk test
```

#### Example Unit Test

```typescript
// packages/sdk/lib/products.test.ts
import { describe, it, expect } from 'vitest';
import { fetchProduct } from './products';

describe('Product API', () => {
  it('fetches product by ASIN', async () => {
    const product = await fetchProduct('B08N5WRWNW');
    expect(product).toHaveProperty('title');
    expect(product.asin).toBe('B08N5WRWNW');
  });
});
```

### E2E Testing (Playwright)

```bash
# Install Playwright browsers
pnpm exec playwright install

# Run all e2e tests
pnpm test:e2e

# Run in headed mode
pnpm test:e2e --headed

# Run specific test
pnpm test:e2e tests/homepage.spec.ts

# Generate test report
pnpm exec playwright show-report
```

#### Example E2E Test

```typescript
// tests/tenant-routing.spec.ts
import { test, expect } from '@playwright/test';

test('tenant subdomain routing', async ({ page }) => {
  await page.goto('http://nectarheat.localhost:3000');
  await expect(page).toHaveTitle(/NectarHeat/);
  
  const logo = page.locator('[data-testid="tenant-logo"]');
  await expect(logo).toBeVisible();
});
```

### Integration Testing

```bash
# Test Supabase connection
pnpm exec site test:db

# Test Amazon API
pnpm exec site test:amazon

# Test OpenAI integration
pnpm exec site test:ai

# Full integration test suite
pnpm exec site test:integration
```

---

## Sample Data and Demo

### Quick Demo Setup

```bash
# 1. Initialize demo tenant
pnpm exec site init-tenant \
  --name="WearTech Pro" \
  --domain="weartech.local" \
  --theme="modern"

# 2. Import sample products
pnpm exec site import-products samples/products.txt weartech

# 3. Generate sample content
pnpm exec site seed weartech --posts=10 --reviews=5

# 4. Run orchestrator for full demo
pnpm exec site run-agent OrchestratorAgent weartech
```

### Sample Product ASINs

Create `samples/products.txt`:
```
B0CHX1W1R3  # Apple Watch Series 9
B0CSTJ2Y7M  # Samsung Galaxy Watch 6
B0C9S7NWFR  # Garmin Forerunner 265
B0B3JQXQ8D  # Fitbit Charge 6
B0CW1KSTJM  # Whoop 4.0 Band
B0C7GB5RF2  # Oura Ring Gen 3
B0CHX6F67M  # Apple AirPods Pro 2
B0C4PFRKN4  # Bose QuietComfort Ultra
```

### Demo Scenarios

#### Scenario 1: Content Generation Pipeline
```bash
# Generate product review
pnpm exec site run-agent ReviewAgent weartech --asin=B0CHX1W1R3

# Generate comparison post
pnpm exec site run-agent EditorialAgent weartech \
  --type=comparison \
  --products="B0CHX1W1R3,B0CSTJ2Y7M"

# Generate buying guide
pnpm exec site run-agent EditorialAgent weartech \
  --type=guide \
  --category="smartwatches"
```

#### Scenario 2: Newsletter Campaign
```bash
# Generate weekly newsletter
pnpm exec site run-agent NewsletterAgent weartech --type=weekly

# Send test newsletter
pnpm exec site send-newsletter weartech --test --email=test@example.com
```

---

## Production Deployment Checklist

### Pre-deployment

- [ ] **Environment Variables**
  - [ ] All API keys configured in Vercel
  - [ ] Production database credentials set
  - [ ] Domain variables updated
  - [ ] Email service configured

- [ ] **Database**
  - [ ] All migrations applied
  - [ ] RLS policies enabled
  - [ ] Indexes created
  - [ ] Backup configured

- [ ] **Security**
  - [ ] API rate limiting enabled
  - [ ] CORS configured correctly
  - [ ] CSP headers set
  - [ ] Secrets rotated

- [ ] **Testing**
  - [ ] All tests passing
  - [ ] E2E tests on staging
  - [ ] Performance benchmarks met
  - [ ] Accessibility audit passed

### Deployment Steps

```bash
# 1. Final checks
pnpm build
pnpm test
pnpm lint

# 2. Database migrations
supabase db push --prod

# 3. Deploy edge functions
supabase functions deploy --prod

# 4. Deploy to Vercel
vercel --prod

# 5. Verify deployment
curl https://yourdomain.com/api/health
```

### Post-deployment

- [ ] **Monitoring**
  - [ ] Error tracking active (Sentry)
  - [ ] Analytics configured
  - [ ] Uptime monitoring set
  - [ ] Log aggregation working

- [ ] **Performance**
  - [ ] CDN configured
  - [ ] Image optimization enabled
  - [ ] Database connection pooling
  - [ ] Cache headers correct

- [ ] **SEO**
  - [ ] Robots.txt configured
  - [ ] Sitemap generated
  - [ ] Meta tags present
  - [ ] Structured data valid

### Rollback Plan

```bash
# Quick rollback to previous version
vercel rollback

# Database rollback (if needed)
supabase db reset --prod
supabase db push --prod --version=[previous-version]

# Clear cache
vercel cache clear
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Database Connection Errors

**Problem**: `ECONNREFUSED` or connection timeout

**Solution**:
```bash
# Check Supabase status
supabase status

# Restart local Supabase
supabase stop
supabase start

# Verify connection string
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### 2. Multi-tenant Routing Issues

**Problem**: Tenant not loading on subdomain

**Solution**:
```bash
# Add to /etc/hosts for local testing
127.0.0.1 tenant.localhost

# Check middleware.ts
# Ensure tenant slug is in database
pnpm exec site list-tenants
```

#### 3. Agent Task Failures

**Problem**: Agents not executing or failing

**Solution**:
```sql
-- Check task queue
SELECT * FROM agent_tasks 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Reset failed tasks
UPDATE agent_tasks 
SET status = 'pending', attempts = 0 
WHERE status = 'failed';
```

#### 4. Amazon API Rate Limits

**Problem**: `429 Too Many Requests`

**Solution**:
```typescript
// Implement exponential backoff
// packages/sdk/lib/amazon.ts
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
await new Promise(resolve => setTimeout(resolve, delay));
```

#### 5. OpenAI Token Limits

**Problem**: Token limit exceeded

**Solution**:
```env
# Use smaller model for embeddings
EMBEDDINGS_MODEL=text-embedding-3-small

# Reduce content generation length
MAX_TOKENS=2000
```

### Debug Mode

Enable detailed logging:

```env
# .env.local
DEBUG=true
LOG_LEVEL=debug
VERBOSE_LOGGING=true
```

```typescript
// Enable in code
import { logger } from '@affiliate-factory/sdk';
logger.setLevel('debug');
```

### Health Checks

```bash
# API health check
curl http://localhost:3000/api/health

# Database health
pnpm exec site test:db

# External services
pnpm exec site test:services
```

---

## Monitoring and Maintenance

### Daily Tasks

```bash
# Check agent task queue
pnpm exec site queue:status

# Verify links
pnpm exec site verify-links --all

# Clear old logs
pnpm exec site logs:cleanup --days=7
```

### Weekly Tasks

```bash
# Database optimization
pnpm exec site db:optimize

# Generate analytics report
pnpm exec site analytics:report --week

# Update product prices
pnpm exec site products:update-prices
```

### Monthly Tasks

```bash
# Full backup
pnpm exec site backup:full

# Security audit
pnpm audit
pnpm exec site security:audit

# Performance review
pnpm exec site perf:analyze
```

### Monitoring Setup

#### Uptime Monitoring
```javascript
// apps/web/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
  };
  
  const status = Object.values(checks).every(c => c) ? 200 : 503;
  return Response.json({ status: status === 200 ? 'healthy' : 'degraded', checks }, { status });
}
```

#### Error Tracking (Sentry)
```typescript
// apps/web/app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Analytics Dashboard
```sql
-- Key metrics query
SELECT 
  DATE(created_at) as date,
  COUNT(*) as page_views,
  COUNT(DISTINCT session_id) as sessions,
  AVG(duration_ms) as avg_duration
FROM insights
WHERE type = 'page_view'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Support and Resources

### Documentation
- **Architecture Guide**: `/docs/architecture.md`
- **API Reference**: `/docs/api.md`
- **Agent Documentation**: `/docs/agents.md`

### Community
- **Discord**: [discord.gg/affiliate-factory](https://discord.gg/affiliate-factory)
- **GitHub Issues**: [github.com/your-org/affiliate-factory/issues](https://github.com/your-org/affiliate-factory/issues)

### Professional Support
- **Email**: support@affiliate-factory.com
- **Enterprise**: enterprise@affiliate-factory.com

---

## License and Credits

Copyright 2024 Affiliate Factory. All rights reserved.

Built with:
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Vercel](https://vercel.com)
- [OpenAI](https://openai.com)
- [Tailwind CSS](https://tailwindcss.com)

---

Last Updated: September 2024
Version: 1.0.0