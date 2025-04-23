#!/bin/bash

# Script to build Wolfi-based Superset image

# Set variables
IMAGE_NAME="apache/superset"
IMAGE_TAG="latest-dev"
DOCKERFILE_PATH="Dockerfile.wolfi"
BUILD_CONTEXT=".."

# Change to the superset root directory first
cd ..

# Build the base image first using docker-compose context
echo "Building the original dev image as base..."
docker compose build superset

# Now change to the wolfi directory
cd wolfi

# Build the Wolfi-based image using the original as base
echo "Building Wolfi-based image..."
docker build -f ${DOCKERFILE_PATH} \
	--build-arg BASE_IMAGE=${IMAGE_NAME}:dev \
	-t ${IMAGE_NAME}:${IMAGE_TAG} \
	${BUILD_CONTEXT}

# Check if build was successful
if [ $? -eq 0 ]; then
	echo "Successfully built ${IMAGE_NAME}:${IMAGE_TAG}"

	# Tag the image for use with docker-compose
	docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:dev
	echo "Tagged image as ${IMAGE_NAME}:dev for use with docker-compose"

	# List images
	echo ""
	echo "Available images:"
	docker images | grep -E "superset|REPOSITORY"
else
	echo "Build failed!"
	exit 1
fi
