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

# Ensure BASE_IMAGE is not empty
if [ -z "$BASE_IMAGE" ]; then
    echo "❌ Error: BASE_IMAGE cannot be empty"
    echo "Please provide a valid base image as parameter or use the default"
    exit 1
fi

echo "🔷 Building Wolfi-based Superset image from your branch..."
echo "Base image: ${BASE_IMAGE}"
echo "Target image: ${WOLFI_IMAGE}"

# First, explicitly tag the base image with a known name to avoid ARG issues
echo "🔷 Tagging base image for build..."
docker tag ${BASE_IMAGE} wolfi-base-temp:latest

# Build the Wolfi image with the tagged base image
docker build \
    --build-arg BASE_IMAGE="wolfi-base-temp:latest" \
    -t ${WOLFI_IMAGE} \
    -f wolfi/Dockerfile.wolfi \
    .

# Clean up the temporary tag
docker rmi wolfi-base-temp:latest || true

# Use the locally built image by overriding the image for Superset services
export SUPERSET_IMAGE=${WOLFI_IMAGE}

# Check for orphaned containers and clean them up
echo "🔷 Checking for orphaned containers..."
docker compose down --remove-orphans

# Stop any running services first
echo "🔷 Stopping any running services..."
docker compose down --remove-orphans

# Create an override file to use the Wolfi image
echo "🔷 Creating docker-compose override for Wolfi image..."
cat > docker-compose.override.yml << EOF
version: '3'
services:
  superset:
    image: ${WOLFI_IMAGE}
  superset-init:
    image: ${WOLFI_IMAGE}
  superset-worker:
    image: ${WOLFI_IMAGE}
  superset-worker-beat:
    image: ${WOLFI_IMAGE}
EOF

# Run docker-compose with the Wolfi-built image
echo "🔷 Starting services with Wolfi image: ${WOLFI_IMAGE}"
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
echo ""
echo "When finished, run this to clean up the override file:"
echo "rm docker-compose.override.yml && docker compose down"
