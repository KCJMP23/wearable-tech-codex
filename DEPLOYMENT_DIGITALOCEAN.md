# DigitalOcean Deployment Guide for AffiliateOS

## Prerequisites

- DigitalOcean account with billing setup
- Domain name (recommended) or use DigitalOcean's provided IP
- Basic knowledge of SSH and Linux commands

## Step 1: Create Droplet

### Recommended Specifications

**Development/Testing:**
- 2 vCPUs
- 4GB RAM
- 80GB SSD
- $24/month

**Production:**
- 4 vCPUs  
- 8GB RAM
- 160GB SSD
- $48/month

### Create Droplet via DigitalOcean Console

1. Log into DigitalOcean Dashboard
2. Click "Create" → "Droplets"
3. Choose image: **Ubuntu 22.04 LTS**
4. Select datacenter region closest to your users
5. Choose droplet size based on specifications above
6. Add SSH keys (recommended) or use password
7. Enable backups (optional but recommended for production)
8. Add tags: `affiliateos`, `production` (or `development`)
9. Click "Create Droplet"

## Step 2: Initial Server Setup

SSH into your new droplet:

```bash
ssh root@your-droplet-ip
```

Run the automated setup script:

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/your-repo/main/deploy/digitalocean-setup.sh
chmod +x digitalocean-setup.sh
./digitalocean-setup.sh
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Install Node.js and pnpm
- Setup Nginx and SSL certificates
- Configure firewall rules
- Create swap space
- Setup monitoring tools
- Configure log rotation
- Create systemd service

## Step 3: Clone Repository

```bash
# Navigate to app directory
cd /var/www/affiliateos

# Clone your repository
git clone https://github.com/your-username/affiliateos.git .

# If using private repo, setup GitHub deploy key first
```

## Step 4: Configure Environment

```bash
# Copy production environment template
cp .env.production .env

# Edit environment variables
nano .env
```

### Required Environment Variables

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_SITE_NAME=AffiliateOS
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (Required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key

# Security (Generate new secrets!)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

## Step 5: Build and Deploy

### Option A: Docker Compose (Recommended)

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Option B: Manual Build

```bash
# Install dependencies
pnpm install

# Build application
pnpm run build

# Start with PM2 (install first: npm install -g pm2)
pm2 start npm --name "affiliateos" -- run start
pm2 save
pm2 startup
```

## Step 6: Configure Domain and SSL

### Point Domain to Droplet

1. Go to your domain registrar
2. Add A record:
   - Type: A
   - Host: @ (or subdomain)
   - Points to: your-droplet-ip
   - TTL: 3600

### Setup SSL with Let's Encrypt

```bash
# Replace your-domain.com with actual domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renew SSL (already setup by script)
sudo certbot renew --dry-run
```

## Step 7: Configure Nginx

The nginx.conf is already configured, but update the domain:

```bash
# Edit nginx configuration
sudo nano /var/www/affiliateos/nginx.conf

# Replace 'localhost' with your domain
server_name your-domain.com www.your-domain.com;

# Restart nginx container
docker-compose restart nginx
```

## Step 8: Setup Monitoring

### DigitalOcean Monitoring

1. In DigitalOcean dashboard, go to your droplet
2. Click "Monitoring" tab
3. Install monitoring agent:

```bash
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
```

### Application Health Checks

```bash
# Check application health
curl http://localhost:3000/api/health

# Check all services
docker-compose ps

# View resource usage
htop
```

## Step 9: Setup Backups

### DigitalOcean Backups

Enable in droplet settings (recommended for production)

### Manual Backup Script

Configure the backup script with your DigitalOcean Spaces:

```bash
# Edit backup script
sudo nano /usr/local/bin/backup-affiliateos.sh

# Update Spaces configuration
SPACES_BUCKET="your-spaces-bucket"
SPACES_REGION="nyc3"

# Install s3cmd for Spaces
sudo apt-get install -y s3cmd
s3cmd --configure

# Test backup
sudo /usr/local/bin/backup-affiliateos.sh
```

### Automated Backups

Already configured via cron to run daily at 3 AM.

## Step 10: Production Optimizations

### Enable Caching

```bash
# Redis is already running via Docker
# Verify Redis connection
docker exec -it affiliateos-redis redis-cli ping
```

### Configure CDN (Optional)

1. Enable DigitalOcean CDN or use Cloudflare
2. Update NEXT_PUBLIC_BASE_URL in .env
3. Configure cache headers in nginx.conf

### Database Optimization

If using external PostgreSQL:

```bash
# Connect to database
psql -h your-db-host -U your-db-user -d your-db-name

# Run optimization
VACUUM ANALYZE;
```

## Maintenance

### Update Application

```bash
cd /var/www/affiliateos
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f nginx
docker-compose logs -f redis

# System logs
sudo journalctl -u affiliateos -f
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart web

# Using systemd
sudo systemctl restart affiliateos
```

### Scale Services

```bash
# Scale web service (requires load balancer)
docker-compose up -d --scale web=3
```

## Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

**Docker permission denied:**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Out of memory:**
```bash
# Check memory
free -h

# Increase swap
sudo fallocate -l 4G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**SSL renewal failed:**
```bash
# Manual renewal
sudo certbot renew --force-renewal

# Check nginx config
sudo nginx -t
```

### Health Check Endpoints

- Application: `http://your-domain.com/api/health`
- Nginx: `http://your-domain.com/health`
- Redis: `docker exec affiliateos-redis redis-cli ping`

### Performance Monitoring

```bash
# CPU and Memory
htop

# Network
nethogs

# Disk I/O
iotop

# Docker stats
docker stats
```

## Security Checklist

- [ ] Changed default passwords
- [ ] Configured firewall (ufw)
- [ ] Enabled automatic security updates
- [ ] Setup SSH key authentication
- [ ] Disabled root login
- [ ] Configured fail2ban
- [ ] Regular backups enabled
- [ ] SSL certificates installed
- [ ] Environment variables secured
- [ ] Rate limiting configured

## Support Resources

- [DigitalOcean Documentation](https://docs.digitalocean.com)
- [Docker Documentation](https://docs.docker.com)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)

## Cost Estimation

### Monthly Costs (Production)

- Droplet (4GB): $48/month
- Backups: $9.60/month (20% of droplet cost)
- Spaces (100GB): $5/month
- Domain: ~$1/month (annual)
- **Total: ~$64/month**

### Cost Optimization Tips

1. Use reserved droplets for 10% discount
2. Enable auto-scaling during peak times only
3. Use DigitalOcean CDN ($10/month) instead of external
4. Optimize images and assets
5. Implement aggressive caching

## Next Steps

1. Setup monitoring dashboards
2. Configure alerts for downtime
3. Implement CI/CD pipeline
4. Setup staging environment
5. Configure database replication
6. Implement load balancing for scale

---

**Note:** This deployment is production-ready but always test thoroughly in a staging environment first. Keep your environment variables secure and never commit them to version control.