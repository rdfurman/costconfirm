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
