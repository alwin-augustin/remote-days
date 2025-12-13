#!/bin/bash
set -e

# Configuration
EC2_HOST="56.228.9.58"
EC2_USER="ec2-user"
REMOTE_ROOT="/home/ec2-user/tracker"
REMOTE_APP_DIR="$REMOTE_ROOT/api-standalone"
LOCAL_DEPLOY_DIR="deploy/tracker-api"

echo "🚀 Starting Deployment to $EC2_HOST..."

# 1. Prepare Artifacts
echo "📦 Preparing artifacts..."
bash scripts/prepare-ec2.sh

# 2. Check Connection
echo "📡 Checking SSH connection..."
ssh -q -o BatchMode=yes -o ConnectTimeout=5 $EC2_USER@$EC2_HOST exit
if [ $? -ne 0 ]; then
    echo "❌ SSH connection failed. Check your keys/VPN."
    exit 1
fi

# 3. Create Remote Directories
echo "📂 Creating remote directories..."
ssh $EC2_USER@$EC2_HOST "mkdir -p $REMOTE_APP_DIR"

# 4. Transfer Files
echo "📤 Uploading application files..."
# Upload ecosystem config to root
scp ecosystem.config.js $EC2_USER@$EC2_HOST:$REMOTE_ROOT/
# Upload standalone app contents (server.js, package.json)
scp $LOCAL_DEPLOY_DIR/* $EC2_USER@$EC2_HOST:$REMOTE_APP_DIR/

# 5. Remote Installation & Restart
echo "🔄 Installing dependencies and restarting..."
ssh $EC2_USER@$EC2_HOST << EOF
    set -e
    cd $REMOTE_APP_DIR
    
    echo "   Running npm install --production..."
    npm install --production --no-progress --quiet
    
    cd $REMOTE_ROOT
    echo "   Restarting PM2..."
    pm2 startOrRestart ecosystem.config.js
    
    echo "   Saving PM2 list..."
    pm2 save
EOF

echo "✅ Deployment Complete!"
