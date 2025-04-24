#!/bin/bash
set -e

# Wolfi Run Tool - Runs a secure Wolfi-based Superset image locally
# Usage: 
#   ./run-local.sh                   # Use default base image
#   ./run-local.sh apache/superset:latest-dev  # Specify base image

# Navigate to the Superset root directory
cd $(dirname "$0")/../../

# Default values
BASE_IMAGE=${1:-"apache/superset:latest-dev"}
WOLFI_IMAGE="apache/superset:wolfi-local"

echo "🔷 Building Wolfi-based Superset image from your branch..."
echo "Base image: ${BASE_IMAGE}"
echo "Target image: ${WOLFI_IMAGE}"

# Build the Wolfi image
docker build \
    --build-arg BASE_IMAGE="${BASE_IMAGE}" \
    -t ${WOLFI_IMAGE} \
    -f wolfi/Dockerfile.wolfi \
    .

# Use the locally built image by overriding the image for Superset services
export SUPERSET_IMAGE=${WOLFI_IMAGE}

# Run docker-compose with the Wolfi-built image
docker compose -f docker-compose.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check the status
docker compose ps

echo ""
echo "✅ Superset (Wolfi-based) should be available at http://localhost:8088"
echo "🔍 To check logs: docker compose logs -f superset"
echo "🛑 To stop: docker compose down"
