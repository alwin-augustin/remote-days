#!/bin/bash
set -e

# Define directories
DEPLOY_DIR="deploy/tracker-api"
DIST_DIR="apps/api/dist"

echo "Cleanup previous build..."
rm -rf deploy

echo "Building API..."
npm run build --workspace=apps/api

echo "Preparing deployment artifacts..."
mkdir -p $DEPLOY_DIR

# Copy build artifacts
cp $DIST_DIR/server.js $DEPLOY_DIR/

# Copy package.json and clean it (remove devDependencies and scripts)
# This prevents npm from trying to resolve workspace packages like @tracker/types
node -e "
  const fs = require('fs');
  const pkg = require('./apps/api/package.json');
  delete pkg.devDependencies;
  // pkg.dependencies['@types/csv-parse'] = undefined; // Cleanup mixed types if needed
  fs.writeFileSync('$DEPLOY_DIR/package.json', JSON.stringify(pkg, null, 2));
"

# Create a temporary .env if needed, or rely on passing env vars
# cp .env.example $DEPLOY_DIR/.env

echo "Deployment artifacts ready in $DEPLOY_DIR"
echo "Contents:"
ls -F $DEPLOY_DIR

echo "To simulate EC2, run:"
echo "docker build -f apps/api/Dockerfile.simulation -t tracker-sim ."
echo "docker run --rm -it -p 3000:3000 tracker-sim"
