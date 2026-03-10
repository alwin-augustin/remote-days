#!/bin/bash
# Test script to mimic GitHub Actions Vercel build environment
# This helps debug deployment issues locally

set -e

echo "=== Testing Vercel Build Process ==="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel@latest
fi

echo "Vercel CLI version: $(vercel --version)"
echo ""

# Navigate to web app directory
cd "$(dirname "$0")/../apps/web"
echo "Working directory: $(pwd)"
echo ""

# Check for .vercel directory
if [ -d ".vercel" ]; then
    echo "Found existing .vercel directory"
    if [ -f ".vercel/project.json" ]; then
        echo "Project settings:"
        cat .vercel/project.json
        echo ""
    fi
else
    echo "No .vercel directory found - you may need to run 'vercel link' first"
fi

# Build the web app first (mimics GitHub Actions)
echo ""
echo "=== Step 1: Building web app with npm ==="
cd ../..
VITE_API_URL=https://api.remotedays.app npm run build --workspace=@remotedays/web
cd apps/web

echo ""
echo "=== Step 2: Vercel pull (download project settings) ==="
echo "Run: vercel pull --yes --environment=production"
echo "(Skipping in local test - requires token)"

echo ""
echo "=== Step 3: Vercel build ==="
echo "This creates .vercel/output directory"
vercel build --prod 2>&1 || {
    echo ""
    echo "Note: vercel build may fail locally without proper authentication"
    echo "The important thing is to check .vercel/project.json settings"
}

echo ""
echo "=== Step 4: Check .vercel directory structure ==="
if [ -d ".vercel" ]; then
    echo "Contents of .vercel:"
    ls -la .vercel/

    if [ -f ".vercel/project.json" ]; then
        echo ""
        echo "Project settings (project.json):"
        cat .vercel/project.json
    fi
fi

echo ""
echo "=== Diagnosis ==="
echo ""
echo "If you see 'rootDirectory' in project.json, that's the culprit!"
echo ""
echo "FIX: Go to Vercel Dashboard -> Project Settings -> Root Directory"
echo "     Set it to EMPTY (blank) since GitHub Actions already runs from apps/web"
echo ""
echo "URL: https://vercel.com/remotedays/frontend/settings"
