# 🚂 Railway Deployment Guide

## Quick Start

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Create New Project
```bash
railway init
# Select "Empty Project"
# Name it: affiliateos-production
```

### 4. Link GitHub Repository
```bash
railway link
# Follow prompts to connect your GitHub repo
```

### 5. Configure Environment Variables
```bash
# Add these in Railway Dashboard or via CLI
railway variables set NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
railway variables set DATABASE_URL=your_database_url
railway variables set NEXTAUTH_URL=https://your-app.railway.app
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### 6. Add PostgreSQL Database
```bash
railway add
# Select PostgreSQL
# Railway will automatically set DATABASE_URL
```

### 7. Add Redis (Optional)
```bash
railway add
# Select Redis
# For caching and sessions
```

### 8. Deploy
```bash
railway up
# Or push to main branch for automatic deployment
```

---

## Environment Configuration

### Required Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Railway provides automatically)
DATABASE_URL=postgresql://user:pass@host:5432/railway

# Next.js
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-secret-key

# Optional
REDIS_URL=redis://default:password@host:6379
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

---

## Railway Configuration Files

### `railway.json` ✅ (Created)
- Build and deployment configuration
- Health check settings
- Restart policies
- Environment-specific configs

### `nixpacks.toml` ✅ (Created)
- Node.js 20 and pnpm 9 setup
- Build commands
- Start command

### `railway.toml` ✅ (Created)
- Alternative configuration format
- Service dependencies
- Scaling settings

---

## Deployment Commands

### Deploy to Production
```bash
railway up --environment production
```

### Deploy to Staging
```bash
railway up --environment staging
```

### View Logs
```bash
railway logs
```

### Open App
```bash
railway open
```

### Run Database Migrations
```bash
railway run pnpm db:migrate
```

---

## Custom Domain Setup

1. Go to Railway Dashboard
2. Select your project
3. Go to Settings → Domains
4. Add custom domain
5. Update DNS records:
   ```
   Type: CNAME
   Name: @ or www
   Value: your-app.railway.app
   ```

---

## Monitoring & Scaling

### View Metrics
```bash
railway status
```

### Scale Replicas
```bash
# Update railway.json numReplicas
# Then redeploy
railway up
```

### Set Resource Limits
In Railway Dashboard:
- CPU: 1-4 vCPU
- Memory: 512MB - 8GB
- Disk: 1GB - 100GB

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: "affiliateos"
```

### Get Railway Token
```bash
railway tokens create
# Add to GitHub Secrets as RAILWAY_TOKEN
```

---

## Database Management

### Connect to Database
```bash
railway connect postgres
```

### Run Migrations
```bash
railway run --service postgres "pnpm db:push"
```

### Backup Database
```bash
railway run --service postgres "pg_dump $DATABASE_URL > backup.sql"
```

---

## Troubleshooting

### Build Failures
```bash
# Check build logs
railway logs --service build

# Clear cache and rebuild
railway up --no-cache
```

### Connection Issues
```bash
# Check service status
railway status

# Restart service
railway restart
```

### Environment Variables
```bash
# List all variables
railway variables

# Update variable
railway variables set KEY=value
```

---

## Cost Optimization

### Free Tier Limits
- 500 hours/month
- 100GB bandwidth
- 1GB memory
- 1 vCPU

### Pro Tier ($20/month)
- Unlimited hours
- 100GB bandwidth included
- Custom domains
- Horizontal scaling

### Usage Monitoring
```bash
railway usage
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Health check endpoint working
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Scaling rules set
- [ ] Error tracking enabled
- [ ] CI/CD pipeline active

---

## Support Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)
- [Railway Blog](https://blog.railway.app)

---

*Deployment ready! Your platform will auto-scale on Railway.* 🚀