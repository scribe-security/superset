#!/bin/bash
set -e

# Test the Wolfi build flow locally
# This script simulates the GitHub workflow by building the base image first and then using it for the Wolfi build

# Navigate to the main Superset directory
cd /Users/scribe/Projects/sps3/superset

# Configuration
REGISTRY="local-test"
IMAGE_NAME="superset"
REF_NAME=$(git branch --show-current)
RELEASE_INDEX="1"
PY_VERSION="py311"

# Define image tags
BASE_TAG="${REGISTRY}/${IMAGE_NAME}:${REF_NAME}-${RELEASE_INDEX}"
BASE_IMAGE="${BASE_TAG}-${PY_VERSION}"
WOLFI_TAG="${BASE_TAG}-wolfi"

echo "🔷 Step 1: Building base image from docker-compose.yml..."
echo "Base image will be: ${BASE_IMAGE}"

# Build the base Superset image first
docker build \
  -t ${BASE_IMAGE} \
  --target dev \
  .

echo "✅ Base image built successfully!"

echo "🔷 Step 2: Preparing Wolfi files..."
mkdir -p docker/pythonpath
cp wolfi/docker/pythonpath/* docker/pythonpath/ || true

echo "🔷 Step 3: Building Wolfi image using the base image..."
docker build \
  -f wolfi/Dockerfile.wolfi \
  -t ${WOLFI_TAG} \
  --build-arg BASE_IMAGE=${BASE_IMAGE} \
  .

echo "✅ Wolfi image built successfully!"

echo ""
echo "📋 Build Summary"
echo "🔹 Base image: ${BASE_IMAGE}"
echo "🔹 Wolfi image: ${WOLFI_TAG}"

echo ""
echo "🧪 To test the Wolfi image:"
echo "docker run -p 8088:8088 -e \"SUPERSET_SECRET_KEY=test-secret-key\" ${WOLFI_TAG}"
