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

# Start database if not running (creates network)
docker-compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up -d db

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Run migrations in a temporary container
# Use the network created by docker-compose
NETWORK_NAME=$(docker network ls --filter name=costconfirm --format "{{.Name}}" | head -1)
if [ -z "$NETWORK_NAME" ]; then
  echo "Error: Could not find costconfirm network"
  exit 1
fi

docker run --rm \
  --network ${NETWORK_NAME} \
  -e DATABASE_URL="${DATABASE_URL}" \
  costconfirm:${IMAGE_TAG} \
  sh -c "npx prisma@6.19.0 migrate deploy"

echo "Migrations completed successfully"
