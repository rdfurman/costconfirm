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
