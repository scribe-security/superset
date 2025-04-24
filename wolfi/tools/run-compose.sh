#!/bin/bash
set -e

# Wolfi Run Tool with Docker Compose Override
# Usage:
#   ./run-compose.sh                   # Use default base image
#   ./run-compose.sh myrepo/superset:tag  # Use specific base image

# Navigate to the Superset root directory
cd $(dirname "$0")/../../

# Default values
BASE_IMAGE=${1:-"apache/superset:latest-dev"}

echo "🔷 Building and running Superset with Wolfi-based image..."
echo "Using base image: ${BASE_IMAGE}"

# Check if .env file exists
if [ ! -f "docker/.env" ]; then
	echo "❌ Error: docker/.env file not found"
	echo "Please create it by copying docker/.env-non-dev to docker/.env"
	exit 1
fi

# Set the BASE_IMAGE environment variable
export BASE_IMAGE="${BASE_IMAGE}"

echo "Using standard docker-compose.yml with SUPERSET_IMAGE override"
export SUPERSET_IMAGE="apache/superset:wolfi-local"

# Build the Wolfi image first
docker build \
	--build-arg BASE_IMAGE="${BASE_IMAGE}" \
	-t apache/superset:wolfi-local \
	-f wolfi/Dockerfile.wolfi \
	.

# Run standard docker-compose
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
