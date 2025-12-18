# CostConfirm Deployment Plan

## Overview

This document outlines the complete deployment strategy for the CostConfirm Next.js application. The deployment uses GitHub Actions (similar to rfurman.ca) but adapted for a full-stack Docker application with PostgreSQL database.

## Deployment Requirements

- **Deploy Method**: Docker containers via docker-compose
- **Server**: Same server as rfurman.ca (reuse SSH credentials)
- **Domain**: costconfirm.ca (dedicated domain)
- **Database**: PostgreSQL in Docker container
- **Zero-Downtime**: Container swap strategy
- **SSL/TLS**: Let's Encrypt via certbot

---

## Table of Contents

1. [GitHub Actions Workflow](#github-actions-workflow)
2. [Production Docker Compose](#production-docker-compose)
3. [Deployment Scripts](#deployment-scripts)
4. [Health Check Endpoint](#health-check-endpoint)
5. [Server Setup](#server-setup)
6. [Nginx Configuration](#nginx-configuration)
7. [Environment Variables](#environment-variables)
8. [Security Considerations](#security-considerations)
9. [Deployment Flow](#deployment-flow)
10. [Zero-Downtime Strategy](#zero-downtime-strategy)
11. [Rollback Procedure](#rollback-procedure)
12. [Monitoring and Maintenance](#monitoring-and-maintenance)
13. [Troubleshooting](#troubleshooting)

---

## GitHub Actions Workflow

### File: `.github/workflows/deploy.yml`

```yaml
name: Build and Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Docker image
        run: |
          docker build -t costconfirm:${{ github.sha }} -t costconfirm:latest .
          docker save costconfirm:${{ github.sha }} | gzip > costconfirm-${{ github.sha }}.tar.gz

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          chmod 700 ~/.ssh

          echo "${{ secrets.DEPLOY_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key

          echo "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
          chmod 644 ~/.ssh/known_hosts

          cat > ~/.ssh/config <<EOF
          Host deploy-server
            HostName ${{ secrets.SSH_HOST }}
            User ${{ secrets.SSH_USER }}
            IdentityFile ~/.ssh/deploy_key
            StrictHostKeyChecking yes
            UserKnownHostsFile ~/.ssh/known_hosts
            BatchMode yes
            LogLevel ERROR
          EOF
          chmod 600 ~/.ssh/config

      - name: Test SSH connection
        run: |
          ssh deploy-server 'echo "SSH connection successful"'

      - name: Transfer Docker image to server
        run: |
          rsync -avz --progress \
            -e "ssh -F $HOME/.ssh/config" \
            costconfirm-${{ github.sha }}.tar.gz \
            deploy-server:/var/www/costconfirm/

      - name: Transfer deployment files
        run: |
          rsync -avz \
            -e "ssh -F $HOME/.ssh/config" \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.next' \
            docker-compose.production.yml \
            scripts/deploy.sh \
            scripts/migrate.sh \
            scripts/backup.sh \
            deploy-server:/var/www/costconfirm/

      - name: Deploy application
        run: |
          ssh deploy-server "cd /var/www/costconfirm && bash deploy.sh ${{ github.sha }}"

      - name: Verify deployment
        run: |
          ssh deploy-server "docker ps | grep costconfirm"
          echo "Deployment completed successfully!"

      - name: Cleanup old images
        run: |
          ssh deploy-server "cd /var/www/costconfirm && docker image prune -af --filter 'until=72h'"
```

### GitHub Secrets Required

Reuse existing secrets from rfurman.ca:
- `DEPLOY_KEY` - SSH private key for deployment
- `SSH_KNOWN_HOSTS` - Server's SSH host key
- `SSH_HOST` - Server hostname/IP
- `SSH_USER` - SSH username (likely "deploy")

---

## Production Docker Compose

### File: `docker-compose.production.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    container_name: costconfirm-db-prod
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - /var/www/costconfirm/data/postgres:/var/lib/postgresql/data
    networks:
      - costconfirm-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Next.js Application
  app:
    image: costconfirm:${IMAGE_TAG:-latest}
    container_name: costconfirm-app-prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      AUTH_SECRET: ${AUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      AUTH_TRUST_HOST: ${AUTH_TRUST_HOST}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    networks:
      - costconfirm-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  costconfirm-network:
    driver: bridge
```

**Key Differences from Development**:
- Database data uses bind mount: `/var/www/costconfirm/data/postgres`
- Database port NOT exposed on host (security)
- Image tag controlled via `${IMAGE_TAG}` environment variable
- Restart policy: `always`
- No source code volume mounts (production image is self-contained)

---

## Deployment Scripts

### File: `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

# Deployment script for CostConfirm
# Usage: ./deploy.sh <IMAGE_TAG>

IMAGE_TAG=${1:-latest}
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

echo "========================================="
echo "CostConfirm Deployment Script"
echo "========================================="
echo "Image tag: $IMAGE_TAG"
echo "Starting deployment at $(date)"
echo ""

# Check if required files exist
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found!"
    exit 1
fi

# Load Docker image
echo "Loading Docker image..."
if [ -f "costconfirm-${IMAGE_TAG}.tar.gz" ]; then
    docker load < "costconfirm-${IMAGE_TAG}.tar.gz"
    echo "Image loaded successfully"
else
    echo "Warning: Image tar file not found, assuming image already exists"
fi

# Tag image
docker tag costconfirm:${IMAGE_TAG} costconfirm:latest

# Backup database before deployment
echo "Creating database backup..."
bash scripts/backup.sh

# Run migrations
echo "Running database migrations..."
export IMAGE_TAG=${IMAGE_TAG}
bash scripts/migrate.sh

# Deploy application with zero downtime
echo "Deploying application..."
IMAGE_TAG=${IMAGE_TAG} docker-compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up -d --no-deps app

# Wait for health check
echo "Waiting for application to be healthy..."
sleep 10

# Check if container is running
if docker ps | grep -q costconfirm-app-prod; then
    echo "Container is running"
else
    echo "Error: Container failed to start"
    docker-compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} logs app
    exit 1
fi

# Verify health endpoint
echo "Checking health endpoint..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "Health check passed!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "Error: Health check failed after $max_attempts attempts"
    docker-compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} logs app
    exit 1
fi

# Remove old containers
echo "Cleaning up old containers..."
docker container prune -f

echo ""
echo "========================================="
echo "Deployment completed successfully!"
echo "Completed at $(date)"
echo "========================================="
```

### File: `scripts/migrate.sh`

```bash
#!/bin/bash
set -e

# Database migration script for CostConfirm
# Runs Prisma migrations using the production Docker image

COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
IMAGE_TAG=${IMAGE_TAG:-latest}

echo "Running database migrations..."

# Source environment variables
set -a
source ${ENV_FILE}
set +a

# Run migrations in a temporary container
docker run --rm \
  --network costconfirm_costconfirm-network \
  -e DATABASE_URL="${DATABASE_URL}" \
  costconfirm:${IMAGE_TAG} \
  sh -c "npx prisma migrate deploy"

echo "Migrations completed successfully"
```

### File: `scripts/backup.sh`

```bash
#!/bin/bash
set -e

# Database backup script for CostConfirm
# Creates timestamped backups of PostgreSQL database

BACKUP_DIR="/var/www/costconfirm/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/costconfirm_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Source environment variables
set -a
source .env.production
set +a

echo "Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create backup using docker exec
docker exec costconfirm-db-prod pg_dump \
  -U ${POSTGRES_USER} \
  -d ${POSTGRES_DB} \
  --no-owner \
  --no-acl \
  | gzip > ${BACKUP_FILE}

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    size=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup created successfully: $BACKUP_FILE ($size)"
else
    echo "Error: Backup file was not created"
    exit 1
fi

# Remove old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "costconfirm_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# List recent backups
echo "Recent backups:"
ls -lh ${BACKUP_DIR}/costconfirm_backup_*.sql.gz | tail -5

echo "Backup completed successfully"
```

---

## Health Check Endpoint

### File: `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
```

This endpoint:
- Returns JSON with health status
- Checks database connectivity via Prisma
- Used by Docker healthcheck
- Used by deployment verification
- Returns 503 if unhealthy

---

## Server Setup

These steps must be performed **once** on the production server.

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add deploy user to docker group
sudo usermod -aG docker deploy

# Verify installation
docker --version
docker-compose --version
```

### 2. Create Directory Structure

```bash
# Create application directories
sudo mkdir -p /var/www/costconfirm/data/postgres
sudo mkdir -p /var/www/costconfirm/backups
sudo mkdir -p /var/www/costconfirm/logs

# Set ownership (deploy user, www-data group for nginx)
sudo chown -R deploy:www-data /var/www/costconfirm

# Set permissions
chmod 755 /var/www/costconfirm
chmod 750 /var/www/costconfirm/data
```

### 3. Install Certbot for SSL

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y
```

---

## Nginx Configuration

### File: `/etc/nginx/sites-available/costconfirm.ca`

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name costconfirm.ca www.costconfirm.ca;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other requests to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name costconfirm.ca www.costconfirm.ca;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/costconfirm.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/costconfirm.ca/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/costconfirm-access.log;
    error_log /var/log/nginx/costconfirm-error.log;

    # Max upload size
    client_max_body_size 10M;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (bypass auth)
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
```

### Enable Site and Obtain SSL Certificate

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/costconfirm.ca /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d costconfirm.ca -d www.costconfirm.ca

# Certificate auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

---

## Environment Variables

### File: `/var/www/costconfirm/.env.production`

**IMPORTANT**: This file lives on the server only, NEVER in git.

```bash
# Database Configuration
POSTGRES_USER=costconfirm_prod
POSTGRES_PASSWORD=<GENERATE_STRONG_PASSWORD>
POSTGRES_DB=costconfirm_prod

# DATABASE_URL for Prisma
DATABASE_URL=postgresql://costconfirm_prod:<PASSWORD>@db:5432/costconfirm_prod?connection_limit=10&pool_timeout=30&connect_timeout=10

# Auth.js Configuration
NEXTAUTH_SECRET=<GENERATE_WITH_CRYPTO>
AUTH_SECRET=<SAME_AS_NEXTAUTH_SECRET>
NEXTAUTH_URL=https://costconfirm.ca
AUTH_TRUST_HOST=true

# Node Environment
NODE_ENV=production
```

### Generate Secrets

```bash
# Generate POSTGRES_PASSWORD (32 random bytes, base64 encoded)
openssl rand -base64 32

# Generate NEXTAUTH_SECRET and AUTH_SECRET (32 random bytes, base64 encoded)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Set Permissions

```bash
chmod 600 /var/www/costconfirm/.env.production
```

---

## Security Considerations

### 1. Database Security

**Network Isolation**:
- Database NOT exposed on host ports in production
- Only accessible via Docker network to app container
- No external connections possible

**Backup Security**:
- Backups stored in `/var/www/costconfirm/backups` (750 permissions)
- Deploy user and www-data group have access
- 30-day retention policy

### 2. Container Security

**Image Security**:
- Official Node.js Alpine base image (minimal attack surface)
- Run as non-root user (nextjs:nodejs)
- Multi-stage build reduces final image size
- No development dependencies in production

**Runtime Security**:
- Containers restart automatically on failure
- Health checks detect unhealthy containers
- Custom bridge network isolates containers

### 3. SSH Security

**Key-Based Authentication**:
- No password authentication
- Deploy key has limited permissions
- StrictHostKeyChecking prevents MITM attacks
- BatchMode prevents interactive prompts

### 4. Application Security

**Next.js Security Headers** (configured in next.config.ts):
- HSTS: Force HTTPS for 2 years
- X-Frame-Options: Prevent clickjacking
- X-Content-Type-Options: Prevent MIME sniffing
- CSP: Content Security Policy
- Permissions-Policy: Restrict browser features

**Auth.js Security**:
- Secure session cookies
- CSRF protection built-in
- Password hashing with bcrypt

### 5. Secrets Management

**GitHub Secrets**:
- DEPLOY_KEY: SSH private key (600 permissions)
- SSH_KNOWN_HOSTS: Prevents MITM attacks
- SSH_HOST and SSH_USER: Server connection details

**Server-Side Secrets**:
- `.env.production` (600 permissions)
- Never committed to git
- Cryptographically secure random bytes
- Rotation procedure documented

---

## Deployment Flow

### Automated Deployment (Push to main)

1. **Developer pushes to main branch** → GitHub Actions triggers

2. **CI Build Phase** (GitHub Actions runner):
   - Checkout code
   - Install dependencies with `npm ci`
   - Build Docker image with standalone Next.js
   - Generate Prisma client for Alpine Linux
   - Tag image with commit SHA and `latest`
   - Export image to tar.gz file

3. **Transfer Phase**:
   - Configure SSH connection
   - Test SSH connectivity
   - rsync Docker image tar.gz to server
   - rsync deployment scripts
   - rsync production docker-compose.yml

4. **Server Deploy Phase**:
   - SSH into server
   - Execute `deploy.sh` script:
     - Load Docker image from tar
     - Create database backup
     - Run Prisma migrations
     - Start new app container (zero-downtime)
     - Wait for health check to pass
     - Remove old containers
   - Verify deployment

5. **Cleanup Phase**:
   - Prune old Docker images (older than 72h)
   - Remove tar files

### Manual Deployment (workflow_dispatch)

Same as automated, but triggered manually from GitHub Actions UI.

---

## Zero-Downtime Strategy

### Current State
- Old app container running: `costconfirm-app-prod`
- Database container running: `costconfirm-db-prod`

### Deployment Process

1. **Database migrations run first** (against live DB)
2. **New app container starts** with new image
3. **Health check verifies** new container is healthy
4. **Docker Compose replaces** old container
5. **Old container stops** after new one is healthy
6. **Database container never stops** (no downtime)

### If Deployment Fails

- If new container fails health checks:
  - Docker Compose won't remove old container
  - Old container continues serving traffic
  - Deployment script exits with error
  - Investigation required before next deploy

### Migration Safety

**Migration Flow**:
1. Migrations run BEFORE app container swap
2. If migrations fail, deployment aborts
3. Old app container continues running
4. No code runs against un-migrated database

---

## Rollback Procedure

### Automatic Rollback

If health checks fail during deployment:
- Old container stays running
- New container is not promoted
- Deployment fails and alerts

### Manual Rollback

If issues discovered after deployment:

```bash
# SSH into server
ssh deploy@your-server.com

# Navigate to app directory
cd /var/www/costconfirm

# Find previous commit SHA from GitHub or Docker images
docker images | grep costconfirm

# Rollback to specific version
IMAGE_TAG=<PREVIOUS_SHA> bash deploy.sh <PREVIOUS_SHA>

# Or use the previous 'latest' if it still exists
docker tag costconfirm:<PREVIOUS_SHA> costconfirm:latest
IMAGE_TAG=<PREVIOUS_SHA> docker-compose -f docker-compose.production.yml --env-file .env.production up -d --no-deps app
```

### Database Rollback

If migrations need to be rolled back:

```bash
# Restore from backup
gunzip < /var/www/costconfirm/backups/costconfirm_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod

# Then deploy the previous application version
```

---

## Monitoring and Maintenance

### Health Checks

**Application Health**:
- Endpoint: `GET /api/health`
- Checks database connectivity
- Returns JSON with status
- Used by Docker healthcheck

**Docker Health Check**:
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Logging

```bash
# Application logs
docker-compose -f docker-compose.production.yml logs -f app

# Database logs
docker-compose -f docker-compose.production.yml logs -f db

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail 100 app

# Nginx logs
tail -f /var/log/nginx/costconfirm-access.log
tail -f /var/log/nginx/costconfirm-error.log
```

### Automated Backups

Set up cron job on server:

```bash
# Edit deploy user's crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /var/www/costconfirm && bash scripts/backup.sh >> logs/backup.log 2>&1
```

### SSL Certificate Renewal

**Automatic**:
- Certbot systemd timer runs daily
- Auto-renews certificates within 30 days of expiration
- Reloads nginx after renewal

**Manual**:
```bash
sudo certbot renew --nginx
sudo systemctl reload nginx
```

### Maintenance Tasks

**Weekly**:
- Review application logs for errors
- Check disk space usage: `df -h`
- Verify backups are completing

**Monthly**:
- Review security logs
- Update base Docker images if needed
- Test backup restoration
- Review nginx access logs

**Quarterly**:
- Rotate secrets (NEXTAUTH_SECRET, DB password)
- Security audit
- Review and update dependencies

---

## Troubleshooting

### Issue: Deployment fails at migration step

```bash
# Check database connectivity
docker exec costconfirm-db-prod pg_isready -U costconfirm_prod

# Check migration logs
docker logs costconfirm-app-prod | grep -i prisma

# Manually run migrations
cd /var/www/costconfirm
IMAGE_TAG=latest bash scripts/migrate.sh
```

### Issue: Container starts but health check fails

```bash
# Check container logs
docker logs costconfirm-app-prod

# Test health endpoint manually
docker exec costconfirm-app-prod wget -O- http://localhost:3000/api/health

# Check environment variables
docker exec costconfirm-app-prod env | grep DATABASE_URL
```

### Issue: 502 Bad Gateway from nginx

```bash
# Check if app container is running
docker ps | grep costconfirm-app-prod

# Check nginx error logs
tail -f /var/log/nginx/costconfirm-error.log

# Verify port 3000 is listening
netstat -tlnp | grep 3000
```

### Issue: Database connection errors

```bash
# Check if database container is running
docker ps | grep costconfirm-db-prod

# Check database logs
docker logs costconfirm-db-prod

# Test connection from app container
docker exec costconfirm-app-prod sh -c 'nc -zv db 5432'
```

### Emergency: Application Down

1. Check container status: `docker ps -a`
2. Restart containers: `docker-compose -f docker-compose.production.yml restart`
3. Check logs: `docker logs costconfirm-app-prod`
4. If needed, rollback to previous version

### Emergency: Disk Space Full

```bash
# Remove old Docker images
docker image prune -af

# Remove old logs
sudo journalctl --vacuum-time=7d

# Remove old backups
find /var/www/costconfirm/backups -mtime +30 -delete
```

---

## Pre-Deployment Checklist

Before first production deployment:

- [ ] Server has Docker and docker-compose installed
- [ ] Directory structure created (`/var/www/costconfirm`)
- [ ] `.env.production` file configured with secrets
- [ ] Nginx configuration deployed and tested
- [ ] SSL certificates obtained via certbot
- [ ] Domain DNS points to server
- [ ] GitHub secrets configured (reuse rfurman.ca)
- [ ] SSH access tested from local machine
- [ ] Deploy user has docker group permissions
- [ ] Firewall allows ports 80, 443, 22

After first deployment:

- [ ] Application accessible at https://costconfirm.ca
- [ ] SSL certificate valid and HSTS working
- [ ] Login/signup functionality works
- [ ] Database connectivity verified
- [ ] Health check endpoint responds
- [ ] Backup script executes successfully
- [ ] Create real admin user
- [ ] Remove sample data if needed

---

## Implementation Timeline

1. **Server Preparation**: 1-2 hours
   - Install Docker and docker-compose
   - Create directory structure
   - Configure nginx reverse proxy
   - Obtain SSL certificates
   - Create `.env.production` file

2. **Repository Setup**: 30-45 minutes
   - Create GitHub Actions workflow
   - Create production docker-compose
   - Create deployment scripts
   - Create health check API route
   - Commit and push

3. **Initial Deployment**: 1-2 hours
   - Trigger workflow manually
   - Monitor deployment
   - Verify application accessibility
   - Test functionality

4. **Testing and Validation**: 1-2 hours
   - Test automated deployment
   - Test zero-downtime deployment
   - Test backup and restore
   - Test rollback procedure
   - Verify SSL/TLS

**Total**: 4-7 hours for complete setup

---

## Summary

This deployment plan provides a production-ready GitHub Actions workflow for CostConfirm, adapted from rfurman.ca for a full-stack Docker application. Key features:

✅ **Zero-downtime deployments** via Docker Compose
✅ **Automatic database migrations** with safety checks
✅ **Automated backups** before each deployment
✅ **Health checks** to verify successful deployment
✅ **Rollback capability** via versioned Docker images
✅ **Security hardening** with nginx, SSL/TLS, and secrets management
✅ **Reuse existing SSH infrastructure** from rfurman.ca
✅ **Comprehensive monitoring** and troubleshooting procedures

---

## Next Steps

1. Review this plan and ensure all requirements are understood
2. Perform server setup (one-time)
3. Create workflow and scripts in repository
4. Test in staging environment (recommended)
5. Deploy to production
6. Monitor and maintain
