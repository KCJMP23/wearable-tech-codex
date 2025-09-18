# Production Deployment Guide

## Prerequisites

- [ ] Supabase Project created
- [ ] Vercel account with Pro plan (for team features)
- [ ] Domain name purchased and configured
- [ ] OpenAI API key with credits
- [ ] GitHub repository connected

## 1. Supabase Setup

### 1.1 Create Project
```bash
# Go to https://supabase.com/dashboard
# Create new project in your preferred region
```

### 1.2 Run Database Migrations
```sql
-- Run all SQL files in order
-- infra/supabase/sql/00_extensions.sql
-- infra/supabase/sql/01_schema.sql
-- infra/supabase/sql/02_indexes.sql
-- infra/supabase/sql/03_triggers.sql
-- infra/supabase/sql/04_rls_policies.sql
```

### 1.3 Deploy Edge Functions
```bash
supabase functions deploy --project-ref your-project-ref
```

### 1.4 Configure Storage Buckets
```bash
# Create buckets via Supabase dashboard:
- products (public)
- posts (public)
- media (public)
```

## 2. Environment Variables

### 2.1 Copy and Configure
```bash
cp .env.example .env.production
```

### 2.2 Required Variables
```env
# Supabase (from project settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-...

# Base URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=generated-secret
```

## 3. Vercel Deployment

### 3.1 Install Vercel CLI
```bash
npm i -g vercel
```

### 3.2 Link Project
```bash
vercel link
```

### 3.3 Configure Environment Variables
```bash
# Add each variable from .env.production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
# ... continue for all variables
```

### 3.4 Deploy
```bash
vercel --prod
```

## 4. Domain Configuration

### 4.1 Add Custom Domain in Vercel
```bash
vercel domains add yourdomain.com
```

### 4.2 Configure DNS Records
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### 4.3 Enable SSL
- Automatic via Vercel (Let's Encrypt)

## 5. Post-Deployment Setup

### 5.1 Create First Tenant
```bash
# Visit /onboarding
# OR use CLI:
pnpm exec site init-tenant
```

### 5.2 Import Initial Products
```bash
pnpm exec site import-products --tenant your-tenant --asins test-asins.txt
```

### 5.3 Generate Initial Content
```bash
pnpm exec site run-agent --agent OrchestratorAgent --tenant your-tenant
```

## 6. Monitoring Setup

### 6.1 Sentry Configuration
```javascript
// Install Sentry
pnpm add @sentry/nextjs

// Initialize in sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 6.2 Google Analytics
```html
<!-- Add to app/layout.tsx -->
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  `}
</Script>
```

### 6.3 Vercel Analytics
```bash
pnpm add @vercel/analytics
```

```tsx
// Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## 7. Performance Optimization

### 7.1 Enable ISR (Incremental Static Regeneration)
```typescript
// In product pages
export const revalidate = 3600; // Revalidate every hour
```

### 7.2 Configure CDN
```javascript
// next.config.mjs
module.exports = {
  images: {
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/your-cloud/',
  },
};
```

### 7.3 Enable Edge Runtime
```typescript
// In API routes
export const runtime = 'edge';
```

## 8. Security Checklist

- [ ] Environment variables secured in Vercel
- [ ] RLS policies enabled in Supabase
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] CSP headers configured
- [ ] Authentication required for admin routes
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (React default escaping)
- [ ] HTTPS enforced
- [ ] Secrets rotated regularly

## 9. Backup & Recovery

### 9.1 Database Backups
```bash
# Supabase automatic daily backups (Pro plan)
# Manual backup:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 9.2 Code Backups
```bash
# GitHub automatic
# Additional backup to S3:
aws s3 sync . s3://your-backup-bucket/code/
```

## 10. Scaling Considerations

### 10.1 Database
- Enable connection pooling (Supabase dashboard)
- Configure PgBouncer settings
- Monitor slow queries

### 10.2 Edge Functions
- Set appropriate timeouts
- Implement retry logic
- Use background jobs for heavy processing

### 10.3 CDN & Caching
- Cloudflare for global CDN
- Redis for session caching
- Browser caching headers

## 11. Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

#### Database Connection Issues
```bash
# Check connection string
psql $DATABASE_URL

# Test from Vercel function
vercel dev --debug
```

#### Performance Issues
```bash
# Analyze bundle size
pnpm analyze

# Check Core Web Vitals
lighthouse https://yourdomain.com
```

## 12. Rollback Procedure

### 12.1 Vercel Rollback
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### 12.2 Database Rollback
```bash
# Restore from backup
psql $DATABASE_URL < backup_20240101.sql
```

## Support Contacts

- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com
- Internal Team: dev@yourdomain.com

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Performance benchmarks met
- [ ] Security scan completed

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Check monitoring dashboards
- [ ] Verify SSL certificate
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify cron jobs running
- [ ] Confirm email delivery
- [ ] Update status page

---

## Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh - Production deployment script

echo "🚀 Starting production deployment..."

# Run tests
echo "Running tests..."
pnpm test

# Build
echo "Building application..."
pnpm build

# Deploy
echo "Deploying to Vercel..."
vercel --prod

# Run post-deployment checks
echo "Running health checks..."
curl -I https://yourdomain.com/api/health

echo "✅ Deployment complete!"
```

Save as `deploy.sh` and run with `bash deploy.sh`