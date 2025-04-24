#!/bin/bash
set -e

# Wolfi Build Tool - Builds a secure Wolfi-based Superset image
# Usage: 
#   ./build-wolfi.sh                   # Default local build
#   ./build-wolfi.sh -p                # Push images to registry
#   ./build-wolfi.sh -r my-registry    # Specify registry name
#   ./build-wolfi.sh -i my-index       # Specify release index
#   ./build-wolfi.sh -s                # Check for security vulnerabilities

# Navigate to the Superset root directory
cd $(dirname "$0")/../../

# Default values
PUSH=false
REGISTRY="local-test"
IMAGE_NAME="superset"
REF_NAME=$(git branch --show-current)
RELEASE_INDEX="1"
PY_VERSION="py311"
CHECK_SECURITY=false

# Parse arguments
while getopts "pr:i:s" opt; do
  case $opt in
    p) PUSH=true ;;
    r) REGISTRY="$OPTARG" ;;
    i) RELEASE_INDEX="$OPTARG" ;;
    s) CHECK_SECURITY=true ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
  esac
done

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
# Tag the base image to avoid ARG issues
docker tag ${BASE_IMAGE} wolfi-base-temp:latest

# Build using the tagged image
docker build \
  -f wolfi/Dockerfile.wolfi \
  -t ${WOLFI_TAG} \
  --build-arg BASE_IMAGE=wolfi-base-temp:latest \
  .

# Clean up temporary tag
docker rmi wolfi-base-temp:latest || true

echo "✅ Wolfi image built successfully!"

# Check for vulnerabilities if requested
if [ "$CHECK_SECURITY" = true ]; then
  echo "🔷 Step 4: Checking for vulnerabilities..."
  wolfi/security/check-vulnerabilities.sh ${WOLFI_TAG}
fi

# Push images if requested
if [ "$PUSH" = true ]; then
  echo "🔷 Pushing images to registry..."
  docker push ${BASE_IMAGE}
  docker push ${WOLFI_TAG}
  echo "✅ Images pushed to registry"
fi

echo ""
echo "📋 Build Summary"
echo "🔹 Base image: ${BASE_IMAGE}"
echo "🔹 Wolfi image: ${WOLFI_TAG}"

echo ""
echo "🧪 To test the Wolfi image:"
echo "docker run -p 8088:8088 -e \"SUPERSET_SECRET_KEY=test-secret-key\" ${WOLFI_TAG}"
