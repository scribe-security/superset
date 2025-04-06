#!/bin/bash
set -e

# Script to test the Wolfi build process locally
# This mimics the GitHub Actions workflow but runs locally

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define variables
RELEASE_INDEX=${1:-"test"}
BRANCH_NAME=${2:-"4.1.2-to-wolfie"}
PLATFORM=${3:-"amd"} # "amd" or "arm"

echo -e "${YELLOW}Starting local build test with:${NC}"
echo -e "  - Branch: ${GREEN}$BRANCH_NAME${NC}"
echo -e "  - Release index: ${GREEN}$RELEASE_INDEX${NC}"
echo -e "  - Platform: ${GREEN}$PLATFORM${NC}"

# Step 1: Build the base image
echo -e "${YELLOW}Step 1: Building base image...${NC}"
docker build -t superset-base:local -f Dockerfile --target lean \
  --build-arg PY_VER=3.11-slim-bookworm .

# Step 2: Verify the base image
echo -e "${YELLOW}Step 2: Verifying base image...${NC}"
docker images | grep superset-base

# Step 3: Copy wolfi/docker/pythonpath to docker/pythonpath for Dockerfile.wolfie
echo -e "${YELLOW}Step 3: Preparing pythonpath files...${NC}"
mkdir -p docker/pythonpath
cp wolfi/docker/pythonpath/* docker/pythonpath/

# Step 4: Build the Wolfi image using the local base
echo -e "${YELLOW}Step 4: Building Wolfi image...${NC}"
docker build -t scribesecurity/superset:$BRANCH_NAME-$RELEASE_INDEX-wolfi-$PLATFORM \
  -f wolfi/Dockerfile.wolfie \
  --build-arg BASE_IMAGE=superset-base:local .

# Step 4: Verify the Wolfi image
echo -e "${YELLOW}Step 4: Verifying Wolfi image...${NC}"
docker images | grep wolfi

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "Created image: ${GREEN}scribesecurity/superset:$BRANCH_NAME-$RELEASE_INDEX-wolfi-$PLATFORM${NC}"

echo
echo -e "${YELLOW}Would you like to run the Wolfi container to test it? (y/n)${NC}"
read -p "Run container? " run_container

if [[ $run_container == "y" || $run_container == "Y" ]]; then
    echo -e "${YELLOW}Running Wolfi container on port 8088...${NC}"
    docker run -p 8088:8088 -e SECRET_KEY=test1234 \
      --name superset-wolfi-test \
      scribesecurity/superset:$BRANCH_NAME-$RELEASE_INDEX-wolfi-$PLATFORM
fi