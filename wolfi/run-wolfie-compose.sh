#!/bin/bash
set -e

# Run Dockerfile.wolfi with your local branch using docker-compose override

# Navigate to the main Superset directory
cd /Users/scribe/Projects/sps3/superset

echo "Building and running Superset with Wolfie-based image..."

# Check if .env file exists
if [ ! -f "docker/.env" ]; then
    echo "Error: docker/.env file not found"
    echo "Please create it by copying docker/.env-non-dev to docker/.env"
    exit 1
fi

# Set the BASE_IMAGE environment variable
export BASE_IMAGE="apache/superset:latest-dev"

# Run docker-compose with both the main file and the Wolfie override
docker-compose -f docker-compose.yml -f docker-compose.wolfie.yml up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check the status
docker-compose -f docker-compose.yml -f docker-compose.wolfie.yml ps

echo ""
echo "Superset (Wolfie-based) should be available at http://localhost:8088"
echo "To check logs: docker-compose -f docker-compose.yml -f docker-compose.wolfie.yml logs -f superset"
echo "To stop: docker-compose -f docker-compose.yml -f docker-compose.wolfie.yml down"
