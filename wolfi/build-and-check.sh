#!/bin/bash

# Script to build Wolfi image and then check for vulnerabilities

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set variables
IMAGE_NAME="apache/superset"
IMAGE_TAG="wolfi-latest"
DOCKERFILE_PATH="Dockerfile.wolfie"
BUILD_CONTEXT=".."

echo -e "${YELLOW}Starting build and vulnerability check process...${NC}\n"

# Change to the superset root directory first
cd ..

# Build the base image first using docker-compose context
echo -e "${YELLOW}Building the original dev image as base...${NC}"
docker compose build superset

# Check if base build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Base image build failed!${NC}"
    exit 1
fi

# Now change to the wolfi directory
cd wolfi

# Build the Wolfi-based image using the original as base
echo -e "${YELLOW}Building Wolfi-based image...${NC}"
docker build -f ${DOCKERFILE_PATH} \
	--build-arg BASE_IMAGE=${IMAGE_NAME}:dev \
	-t ${IMAGE_NAME}:${IMAGE_TAG} \
	${BUILD_CONTEXT}

# Check if build was successful
if [ $? -eq 0 ]; then
	echo -e "${GREEN}Successfully built ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
	
	# List images to confirm
	echo -e "\n${YELLOW}Available images:${NC}"
	docker images | grep -E "superset|REPOSITORY"
	
	# Now run vulnerability checks
	echo -e "\n${YELLOW}Running vulnerability checks...${NC}"
	./check-vulnerabilities.sh ${IMAGE_NAME}:${IMAGE_TAG}
else
	echo -e "${RED}Build failed!${NC}"
	exit 1
fi
