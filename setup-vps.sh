#!/bin/bash
# Master Setup Script for Cafe Management (Nginx + Systemd) - ROOT EDITION
# This script is designed to be run as ROOT on the VPS.

echo "--- Starting Root Setup ---"

# 1. Kill any existing PM2/Node processes to free ports
echo "Purging existing Node/PM2 processes..."
pm2 kill || true
killall -9 node next-server pnpm || true

# 2. Copy Service Files
echo "Installing Systemd service files..."
cp vps-configs/*.service /etc/systemd/system/
systemctl daemon-reload

# 3. Enable Services
echo "Enabling services..."
systemctl enable cafe-frontend-uat cafe-backend-uat cafe-frontend-prod cafe-backend-prod

# 4. Configure Nginx
echo "Configuring Nginx..."
cp vps-configs/nginx-cafe-uat.conf /etc/nginx/sites-available/cafe-management-uat
cp vps-configs/nginx-cafe-prod.conf /etc/nginx/sites-available/cafe-management-prod

ln -sf /etc/nginx/sites-available/cafe-management-uat /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/cafe-management-prod /etc/nginx/sites-enabled/

# Remove default if it conflicts
rm -f /etc/nginx/sites-enabled/default

# Test and Restart Nginx
nginx -t && systemctl restart nginx

# 5. Ensure Directories exist and are owned by astroagent
echo "Fixing directory ownership for deployment..."
mkdir -p /var/www/cafe-management/frontend
mkdir -p /var/www/cafe-management/backend
mkdir -p /var/www/cafe-management-uat/frontend
mkdir -p /var/www/cafe-management-uat/backend
chown -R astroagent:astroagent /var/www/cafe-management*

# 6. Setup permissions for astroagent in sudoers
echo "Configuring sudoers for astroagent..."
SUDO_ENTRY="astroagent ALL=(ALL) NOPASSWD: /usr/bin/systemctl"

# Clean up any old duplicate entries and add the new one
sed -i '/astroagent ALL=(ALL) NOPASSWD/d' /etc/sudoers
echo "$SUDO_ENTRY" >> /etc/sudoers

echo "--- Root Setup Complete! ---"
echo "You can now push to your branches and let the Azure pipelines deploy."
