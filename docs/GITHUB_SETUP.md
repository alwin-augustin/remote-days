# GitHub Actions Setup Guide

This document lists all required GitHub Secrets and Variables for the CI/CD pipelines.

## Quick Setup Checklist

- [ ] Add all required **Secrets** (sensitive values)
- [ ] Add all required **Variables** (non-sensitive configuration)
- [ ] Create GitHub Environment `production` with protection rules
- [ ] Configure Vercel projects (web + landing)
- [ ] Configure EAS/Expo project connection
- [ ] Clean up existing EC2 PM2 configuration

---

## GitHub Secrets (Repository Settings → Secrets and variables → Actions → Secrets)

### Backend Deployment (EC2)

| Secret Name | Description | Value |
|-------------|-------------|-------|
| `EC2_HOST` | EC2 instance public IP or hostname | Your EC2 IP or `api.remotedays.app` |
| `EC2_SSH_KEY` | Private SSH key for EC2 access | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

**Note:** Username is hardcoded as `ec2-user` in the workflow.

### Frontend Deployment (Vercel)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | [Vercel Dashboard](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | Vercel organization/team ID | Run `vercel link` locally, check `.vercel/project.json` |
| `VERCEL_PROJECT_ID_WEB` | Vercel project ID for **web app** | From `.vercel/project.json` in `apps/web` |
| `VERCEL_PROJECT_ID_LANDING` | Vercel project ID for **landing page** | From `.vercel/project.json` in `landing` |

### Mobile Build (Expo/EAS)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `EXPO_TOKEN` | Expo access token | [Expo Dashboard](https://expo.dev/settings/access-tokens) → Create Token |

---

## GitHub Variables (Repository Settings → Secrets and variables → Actions → Variables)

| Variable Name | Description | Production Value |
|---------------|-------------|------------------|
| `API_URL` | Backend API URL (used by both web & mobile) | `https://api.remotedays.app` |

**Note:** This single variable is mapped to:
- `VITE_API_URL` for web builds (Vite requires this prefix)
- `EXPO_PUBLIC_API_URL` for mobile builds (Expo requires this prefix)

---

## EC2 Cleanup Commands

Run these commands on your EC2 instance to clean up existing configuration:

```bash
# SSH into your EC2 instance
ssh ec2-user@your-ec2-host

# ===========================================
# 1. Stop and remove all PM2 processes
# ===========================================
pm2 stop all
pm2 delete all
pm2 save --force

# Clear PM2 dump file
rm -f ~/.pm2/dump.pm2

# ===========================================
# 2. Clean up old directories
# ===========================================
# Remove old tracker directory if exists
rm -rf ~/tracker

# Remove old api-standalone if inside remote-days
rm -rf ~/remote-days/api-standalone

# ===========================================
# 3. Prepare new directory structure
# ===========================================
mkdir -p ~/remote-days
mkdir -p ~/backups

# ===========================================
# 4. Verify PM2 is clean
# ===========================================
pm2 list
# Should show: No process found

# ===========================================
# 5. Check current .env file location
# ===========================================
# The .env file should be at ~/remote-days/.env
# If you have one elsewhere, move it:
# mv ~/tracker/.env ~/remote-days/.env
```

---

## Nginx Configuration Check

Check if nginx is configured correctly for the new path:

```bash
# ===========================================
# 1. Check current nginx configuration
# ===========================================
sudo cat /etc/nginx/sites-available/api.remotedays.app
# OR
sudo cat /etc/nginx/conf.d/api.remotedays.app.conf

# ===========================================
# 2. Expected nginx config (proxy to Node.js)
# ===========================================
# The nginx config should proxy to localhost:3000
# It should NOT reference any file paths since it's just proxying

# Example correct configuration:
sudo tee /etc/nginx/sites-available/api.remotedays.app << 'EOF'
server {
    listen 80;
    server_name api.remotedays.app;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.remotedays.app;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/api.remotedays.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.remotedays.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }
}
EOF

# ===========================================
# 3. Test nginx configuration
# ===========================================
sudo nginx -t

# ===========================================
# 4. Reload nginx if config is valid
# ===========================================
sudo systemctl reload nginx

# ===========================================
# 5. Verify SSL certificate
# ===========================================
sudo certbot certificates
# Should show api.remotedays.app with valid certificate

# If SSL needs renewal or setup:
sudo certbot --nginx -d api.remotedays.app
```

---

## Post-Cleanup: Create .env File

After cleaning up, create the production .env file:

```bash
# Create .env file in the new location
cat > ~/remote-days/.env << 'EOF'
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_EXPIRATION=1d

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Frontend URL (for CORS and email links)
APP_URL=https://app.remotedays.app

# Email (SMTP)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SECURE=false
EMAIL_FROM=noreply@remotedays.app

# Business Rules
MAX_HOME_DAYS=34
EOF

# Secure the file
chmod 600 ~/remote-days/.env
```

---

## Vercel Project Setup

### For Web App (`apps/web`)

```bash
cd apps/web
vercel link
# Follow prompts to link to your web app project
cat .vercel/project.json
# Copy projectId → VERCEL_PROJECT_ID_WEB
# Copy orgId → VERCEL_ORG_ID
```

### For Landing Page (`landing`)

```bash
cd landing
vercel link
# Follow prompts to link to your landing page project
cat .vercel/project.json
# Copy projectId → VERCEL_PROJECT_ID_LANDING
```

### Configure Environment Variables in Vercel Dashboard

For each project, go to **Settings → Environment Variables** and add:

| Variable | Value | Environments |
|----------|-------|--------------|
| `VITE_API_URL` | `https://api.remotedays.app` | Production, Preview |

---

## Workflow Summary

| Workflow | Triggers On | What it does |
|----------|-------------|--------------|
| `ci.yml` | All PRs & pushes to main | Lint, type check, tests |
| `deploy-backend.yml` | `apps/api/**`, `packages/types/**` | Build → Test → Deploy to EC2 → Health check |
| `deploy-frontend.yml` | `apps/web/**`, `packages/types/**`, `packages/shared/**` | Deploy web app to Vercel |
| `deploy-landing.yml` | `landing/**` | Deploy landing page to Vercel |
| `build-mobile.yml` | `apps/mobile/**`, `packages/types/**`, `packages/shared/**` | Validate → EAS Build |

**Note:** Each deployment only triggers when its specific files change. The `packages/shared` is NOT used by API (per CLAUDE.md), so API doesn't redeploy when shared changes.

---

## Troubleshooting

### Frontend showing wrong API URL

1. Check GitHub Variables: Ensure `API_URL` is set to `https://api.remotedays.app`
2. Check Vercel Dashboard: Ensure `VITE_API_URL` is set in Environment Variables
3. Trigger a manual redeploy

### EC2 Deployment Fails

```bash
# Check PM2 logs
pm2 logs remotedays-api --lines 100

# Check if app is running
pm2 status

# Check if port 3000 is in use
sudo lsof -i :3000

# Manually start to see errors
cd ~/remote-days
node server.js
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew if needed
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```
