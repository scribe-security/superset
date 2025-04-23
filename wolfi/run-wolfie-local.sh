#!/bin/bash
set -e

# Run Dockerfile.wolfi with your local branch, replacing the default Superset image in docker-compose

# Navigate to the main Superset directory
cd /Users/scribe/Projects/sps3/superset

echo "Building Wolfie-based Superset image from your branch..."

# Build the Wolfie image
docker build \
    --build-arg BASE_IMAGE="apache/superset:latest-dev" \
    -t apache/superset:wolfie-local \
    -f wolfi/Dockerfile.wolfi \
    .

# Use the locally built image by overriding the image for Superset services
export SUPERSET_IMAGE=apache/superset:wolfie-local

# Run docker-compose with the Wolfie-built image
docker-compose -f docker-compose.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check the status
docker-compose ps

echo ""
echo "Superset (Wolfie-based) should be available at http://localhost:8088"
echo "To check logs: docker-compose logs -f superset"
echo "To stop: docker-compose down"
