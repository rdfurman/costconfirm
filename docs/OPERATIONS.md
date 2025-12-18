# CostConfirm Operations Runbook

This document provides operational procedures for managing the CostConfirm production deployment.

## Quick Reference

### Check Application Status

```bash
# SSH into server
ssh deploy@your-server.com

# Check if containers are running
docker ps | grep costconfirm

# Check application logs
docker logs -f costconfirm-app-prod

# Check database logs
docker logs -f costconfirm-db-prod

# Test health endpoint
curl http://localhost:3000/api/health
```

### View Logs

```bash
# Application logs (last 100 lines)
docker-compose -f docker-compose.production.yml logs --tail 100 app

# Follow logs in real-time
docker-compose -f docker-compose.production.yml logs -f app

# Database logs
docker-compose -f docker-compose.production.yml logs -f db

# Nginx logs
tail -f /var/log/nginx/costconfirm-access.log
tail -f /var/log/nginx/costconfirm-error.log
```

### Restart Application

```bash
# Restart app container only
docker-compose -f docker-compose.production.yml restart app

# Restart all containers
docker-compose -f docker-compose.production.yml restart

# Stop and start (full restart)
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

## Daily Maintenance Tasks

### Morning Checks (5 minutes)

1. **Verify Application is Running**
   ```bash
   curl -I https://costconfirm.ca
   # Should return 200 OK
   ```

2. **Check Health Endpoint**
   ```bash
   curl https://costconfirm.ca/api/health
   # Should return {"status":"healthy"}
   ```

3. **Review Error Logs**
   ```bash
   # Check for errors in last 24 hours
   docker logs --since 24h costconfirm-app-prod | grep -i error
   ```

4. **Check Disk Space**
   ```bash
   df -h /var/www/costconfirm
   # Should have at least 20% free space
   ```

## Weekly Maintenance Tasks

### Monday Morning Checklist (15 minutes)

1. **Review Application Logs**
   ```bash
   # Check for patterns or recurring errors
   docker logs --since 168h costconfirm-app-prod | grep -i error | sort | uniq -c
   ```

2. **Check Database Size**
   ```bash
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c \
     "SELECT pg_size_pretty(pg_database_size('costconfirm_prod'));"
   ```

3. **Verify Backups**
   ```bash
   ls -lh /var/www/costconfirm/backups/ | tail -7
   # Should have 7 daily backups
   ```

4. **Check Container Resource Usage**
   ```bash
   docker stats --no-stream costconfirm-app-prod costconfirm-db-prod
   ```

5. **Review Nginx Access Patterns**
   ```bash
   # Top 10 most accessed endpoints
   awk '{print $7}' /var/log/nginx/costconfirm-access.log | sort | uniq -c | sort -rn | head -10
   ```

## Monthly Maintenance Tasks

### First Monday of Month (30-60 minutes)

1. **Security Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y

   # Check for Docker updates
   docker version
   # Compare with latest: https://docs.docker.com/engine/release-notes/
   ```

2. **SSL Certificate Check**
   ```bash
   # Check certificate expiration
   sudo certbot certificates

   # Test renewal (dry run)
   sudo certbot renew --dry-run
   ```

3. **Test Backup Restoration**
   ```bash
   # Create test database
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d postgres -c \
     "CREATE DATABASE costconfirm_test;"

   # Restore latest backup to test database
   gunzip < /var/www/costconfirm/backups/costconfirm_backup_*.sql.gz | \
     docker exec -i costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_test

   # Verify restoration
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_test -c \
     "SELECT COUNT(*) FROM \"User\";"

   # Drop test database
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d postgres -c \
     "DROP DATABASE costconfirm_test;"
   ```

4. **Review Docker Image Usage**
   ```bash
   # List all images
   docker images | grep costconfirm

   # Remove dangling images
   docker image prune -f

   # Remove old images (keep last 3)
   docker images | grep costconfirm | tail -n +4 | awk '{print $3}' | xargs -r docker rmi
   ```

5. **Database Maintenance**
   ```bash
   # Run VACUUM and ANALYZE
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c "VACUUM ANALYZE;"

   # Check for bloat
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c \
     "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
   ```

## Quarterly Maintenance Tasks

### Security Audit (2-4 hours)

1. **Rotate Secrets**
   ```bash
   # Generate new NEXTAUTH_SECRET
   NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

   # Update .env.production
   nano /var/www/costconfirm/.env.production
   # Update NEXTAUTH_SECRET and AUTH_SECRET with new value

   # Restart application
   docker-compose -f docker-compose.production.yml restart app
   ```

2. **Review Database User Permissions**
   ```bash
   # List database users and roles
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c "\du"
   ```

3. **Update Dependencies**
   ```bash
   # This should be done in development and deployed via CI/CD
   # Check for outdated packages
   npm outdated

   # Update and test in development
   # Deploy via git push to main
   ```

4. **Review Security Logs**
   ```bash
   # Check for failed login attempts
   docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c \
     "SELECT * FROM \"SecurityLog\" WHERE \"eventType\" = 'FAILED_LOGIN'
      AND \"timestamp\" > NOW() - INTERVAL '3 months'
      ORDER BY \"timestamp\" DESC LIMIT 20;"
   ```

## Common Operations

### Manual Deployment

```bash
# Trigger GitHub Actions workflow manually
# Go to: https://github.com/YOUR_USERNAME/costconfirm/actions
# Select "Build and Deploy to Production"
# Click "Run workflow"
```

### Rollback to Previous Version

```bash
# SSH into server
ssh deploy@your-server.com
cd /var/www/costconfirm

# Find previous commit SHA
docker images | grep costconfirm

# Rollback
IMAGE_TAG=<PREVIOUS_SHA> bash deploy.sh <PREVIOUS_SHA>
```

### Database Operations

#### Manual Backup

```bash
cd /var/www/costconfirm
bash scripts/backup.sh
```

#### Restore from Backup

```bash
# List available backups
ls -lh /var/www/costconfirm/backups/

# Restore specific backup
gunzip < /var/www/costconfirm/backups/costconfirm_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod
```

#### Run Database Migrations Manually

```bash
cd /var/www/costconfirm
export IMAGE_TAG=latest
bash scripts/migrate.sh
```

#### Connect to Database

```bash
# Via psql in container
docker exec -it costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod

# Common queries
\dt              # List tables
\d "User"        # Describe User table
SELECT COUNT(*) FROM "Project";
```

### Container Management

#### View Container Resources

```bash
# Real-time resource usage
docker stats

# One-time snapshot
docker stats --no-stream costconfirm-app-prod costconfirm-db-prod
```

#### Access Container Shell

```bash
# App container
docker exec -it costconfirm-app-prod sh

# Database container
docker exec -it costconfirm-db-prod sh
```

#### Update Container Environment Variables

```bash
# Edit .env.production
nano /var/www/costconfirm/.env.production

# Restart containers to apply changes
docker-compose -f docker-compose.production.yml restart
```

## Monitoring Alerts

### Disk Space Alert

If disk usage exceeds 80%:

```bash
# Check what's using space
du -sh /var/www/costconfirm/*

# Clean up old backups
find /var/www/costconfirm/backups -name "*.sql.gz" -mtime +30 -delete

# Clean up Docker
docker system prune -af --volumes
```

### High CPU/Memory Usage

If containers are consuming excessive resources:

```bash
# Check current usage
docker stats --no-stream

# Check application logs for errors
docker logs costconfirm-app-prod | grep -i error

# Restart if needed
docker-compose -f docker-compose.production.yml restart app
```

### Application Down

If application is not responding:

```bash
# Check container status
docker ps -a | grep costconfirm

# Check logs
docker logs costconfirm-app-prod
docker logs costconfirm-db-prod

# Restart containers
docker-compose -f docker-compose.production.yml restart

# If still down, check nginx
sudo systemctl status nginx
sudo nginx -t
```

## Emergency Procedures

### Complete Application Failure

```bash
# 1. Check container status
docker ps -a

# 2. Try restarting
docker-compose -f docker-compose.production.yml restart

# 3. If restart fails, check logs
docker-compose -f docker-compose.production.yml logs

# 4. Nuclear option: stop and start fresh
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 5. If still failing, rollback to previous version
IMAGE_TAG=<PREVIOUS_SHA> bash deploy.sh <PREVIOUS_SHA>
```

### Database Corruption

```bash
# 1. Stop application
docker-compose -f docker-compose.production.yml stop app

# 2. Create emergency backup of current state
docker exec costconfirm-db-prod pg_dump -U costconfirm_prod -d costconfirm_prod | \
  gzip > /var/www/costconfirm/backups/emergency_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 3. Restore from last known good backup
gunzip < /var/www/costconfirm/backups/costconfirm_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod

# 4. Verify restoration
docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c "SELECT COUNT(*) FROM \"User\";"

# 5. Restart application
docker-compose -f docker-compose.production.yml start app
```

### SSL Certificate Expired

```bash
# 1. Renew certificate
sudo certbot renew --force-renewal

# 2. Reload nginx
sudo systemctl reload nginx

# 3. Verify certificate
curl -vI https://costconfirm.ca 2>&1 | grep -i "expire"
```

## Performance Optimization

### Database Query Optimization

```bash
# Enable slow query logging
docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c \
  "ALTER SYSTEM SET log_min_duration_statement = 1000;"  # Log queries slower than 1s

# Reload config
docker exec costconfirm-db-prod psql -U costconfirm_prod -d costconfirm_prod -c "SELECT pg_reload_conf();"

# View slow queries in logs
docker logs costconfirm-db-prod | grep "duration:"
```

### Application Performance

```bash
# Check Next.js build size
docker exec costconfirm-app-prod du -sh /app/.next

# Check container memory limits
docker inspect costconfirm-app-prod | grep -i memory
```

## Contact Information

### Escalation Path

1. **First Response**: Check logs and restart containers
2. **Second Response**: Restore from backup if data issue
3. **Third Response**: Rollback to previous deployment
4. **Emergency**: Contact development team

### Useful Links

- **GitHub Repository**: https://github.com/YOUR_USERNAME/costconfirm
- **GitHub Actions**: https://github.com/YOUR_USERNAME/costconfirm/actions
- **Application**: https://costconfirm.ca
- **Health Check**: https://costconfirm.ca/api/health

## Notes

- All times in commands are UTC unless specified
- Always create backups before major operations
- Test rollback procedures monthly
- Document any unusual incidents or resolutions
- Keep this runbook updated with new procedures
