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

# Check if database container exists
if ! docker ps -a --format '{{.Names}}' | grep -q '^costconfirm-db-prod$'; then
  echo "Database container doesn't exist yet (first deployment). Skipping backup."
  exit 0
fi

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q '^costconfirm-db-prod$'; then
  echo "Database container is not running. Skipping backup."
  exit 0
fi

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
ls -lh ${BACKUP_DIR}/costconfirm_backup_*.sql.gz 2>/dev/null | tail -5 || echo "No backups found"

echo "Backup completed successfully"
