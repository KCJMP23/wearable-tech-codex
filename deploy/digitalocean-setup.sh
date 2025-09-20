#!/bin/bash

# DigitalOcean Droplet Setup Script for AffiliateOS
# Recommended: Ubuntu 22.04 LTS, 4GB RAM minimum (8GB for production)

set -e

echo "🚀 Starting AffiliateOS DigitalOcean Setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Install Node.js (for build process)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
echo "📦 Installing pnpm..."
npm install -g pnpm@8.15.0

# Install Nginx (if not using containerized version)
echo "🌐 Installing Nginx..."
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/affiliateos
sudo chown -R $USER:$USER /var/www/affiliateos

# Setup swap (recommended for smaller droplets)
echo "💾 Setting up swap space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
    echo "Swap already configured"
fi

# Install monitoring tools
echo "📊 Installing monitoring tools..."
sudo apt-get install -y htop nethogs iotop

# Setup log rotation
echo "📝 Configuring log rotation..."
cat << 'EOF' | sudo tee /etc/logrotate.d/affiliateos
/var/www/affiliateos/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose -f /var/www/affiliateos/docker-compose.yml kill -s USR1 nginx
    endscript
}
EOF

# Create systemd service
echo "⚙️ Creating systemd service..."
cat << 'EOF' | sudo tee /etc/systemd/system/affiliateos.service
[Unit]
Description=AffiliateOS Platform
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
WorkingDirectory=/var/www/affiliateos
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable affiliateos

# Setup automatic backups (using DigitalOcean Spaces)
echo "💾 Setting up backup script..."
cat << 'EOF' | sudo tee /usr/local/bin/backup-affiliateos.sh
#!/bin/bash
# Backup script for AffiliateOS
BACKUP_DIR="/tmp/affiliateos-backup-$(date +%Y%m%d-%H%M%S)"
SPACES_BUCKET="your-spaces-bucket"
SPACES_REGION="nyc3"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database (if using local PostgreSQL)
# docker exec affiliateos-db pg_dump -U postgres affiliateos > $BACKUP_DIR/database.sql

# Backup uploads
cp -r /var/www/affiliateos/uploads $BACKUP_DIR/

# Compress backup
tar -czf $BACKUP_DIR.tar.gz -C /tmp $(basename $BACKUP_DIR)

# Upload to DigitalOcean Spaces (requires s3cmd configured)
# s3cmd put $BACKUP_DIR.tar.gz s3://$SPACES_BUCKET/backups/

# Clean up
rm -rf $BACKUP_DIR $BACKUP_DIR.tar.gz
EOF

sudo chmod +x /usr/local/bin/backup-affiliateos.sh

# Setup cron for automatic backups
echo "⏰ Setting up cron jobs..."
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-affiliateos.sh") | crontab -

echo "✅ DigitalOcean setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository: git clone <your-repo> /var/www/affiliateos"
echo "2. Copy your .env file: cp .env.example /var/www/affiliateos/.env"
echo "3. Edit environment variables: nano /var/www/affiliateos/.env"
echo "4. Build and start: cd /var/www/affiliateos && docker-compose up -d"
echo "5. Setup SSL: sudo certbot --nginx -d yourdomain.com"
echo ""
echo "🎉 Your AffiliateOS platform is ready for deployment!"