#!/bin/bash
set -e

# Build Wolfie image and run with docker-compose

# Navigate to the main Superset directory
cd /Users/scribe/Projects/sps3/superset

echo "Building Wolfie-based Superset image from your branch..."

# Set BASE_IMAGE argument
export BASE_IMAGE="apache/superset:latest-dev"

# Build the Wolfie image first
docker build \
    --build-arg BASE_IMAGE="${BASE_IMAGE}" \
    -t apache/superset:latest-dev \
    -f wolfi/Dockerfile.wolfi \
    .

echo "Image built successfully! Now running docker-compose..."

# Run regular docker-compose (it will use the image we just built)
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check the status
docker-compose ps

echo ""
echo "Superset (Wolfie-based) should be available at http://localhost:8088"
echo "To check logs: docker-compose logs -f superset"
echo "To stop: docker-compose down"
