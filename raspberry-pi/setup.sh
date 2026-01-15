#!/bin/bash

# ===========================================
# KSP Affiliate System - Raspberry Pi Setup
# ===========================================

set -e

echo "🍓 KSP Affiliate System - Raspberry Pi Setup"
echo "============================================="

# Check if running on Raspberry Pi
if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "📦 Updating system..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "⚠️  Please log out and back in for Docker permissions to take effect"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
fi

# Create .env file if not exists
if [[ ! -f .env ]]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# PostgreSQL
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

# pgAdmin
PGADMIN_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)

# Cloudflare Tunnel Token (get from Cloudflare Zero Trust dashboard)
# https://one.dash.cloudflare.com/ -> Access -> Tunnels -> Create tunnel
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here
EOF
    echo "✅ Created .env file with random passwords"
    echo "⚠️  Please edit .env and add your Cloudflare Tunnel token"
fi

# Show .env contents (masked)
echo ""
echo "📋 Current configuration:"
echo "   POSTGRES_PASSWORD: ****"
echo "   PGADMIN_PASSWORD: ****"
grep -q "your_tunnel_token_here" .env && echo "   CLOUDFLARE_TUNNEL_TOKEN: ❌ NOT SET" || echo "   CLOUDFLARE_TUNNEL_TOKEN: ✅ Set"

# Instructions
echo ""
echo "============================================="
echo "🚀 Setup Complete! Next steps:"
echo "============================================="
echo ""
echo "1. Set up Cloudflare Tunnel:"
echo "   - Go to: https://one.dash.cloudflare.com/"
echo "   - Navigate to: Access -> Tunnels"
echo "   - Create a new tunnel named 'ksp-db'"
echo "   - Copy the tunnel token to .env file"
echo "   - Add a public hostname for TCP port 5432"
echo ""
echo "2. Start the services:"
echo "   docker-compose up -d"
echo ""
echo "3. Check status:"
echo "   docker-compose ps"
echo "   docker-compose logs -f"
echo ""
echo "4. Access pgAdmin:"
echo "   http://$(hostname -I | awk '{print $1}'):5050"
echo ""
echo "5. Database connection string for Railway/Vercel:"
echo "   postgresql://ksp:PASSWORD@YOUR_TUNNEL_HOSTNAME:5432/ksp_affiliate"
echo ""
