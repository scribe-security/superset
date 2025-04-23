#!/bin/bash

# Build script for secure Superset image with Wolfi base
# This script builds a security-hardened version of Superset

# Set environment variables
DOCKERFILE_PATH="./Dockerfile.wolfi"
IMAGE_NAME="apache/superset"
IMAGE_TAG="latest-dev-secure"
BASE_IMAGE=${BASE_IMAGE:-"apache/superset:latest-dev"}  # Use existing image as build stage

# Build the secure image
echo "Building secure Superset image..."
docker build -f ${DOCKERFILE_PATH} \
    --build-arg BASE_IMAGE=${BASE_IMAGE} \
    -t ${IMAGE_NAME}:${IMAGE_TAG} \
    ..

# Verify the build
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    # Run security scans
    echo "Running security scans..."
    
    # Run Trivy scan
    if command -v trivy &> /dev/null; then
        echo "Running Trivy scan..."
        trivy image ${IMAGE_NAME}:${IMAGE_TAG} --scanners vuln > trivy_report_$(date +%Y%m%d_%H%M%S).json
    fi
    
    # Run Grype scan
    if command -v grype &> /dev/null; then
        echo "Running Grype scan..."
        grype ${IMAGE_NAME}:${IMAGE_TAG} -o json > grype_report_$(date +%Y%m%d_%H%M%S).json
    fi
    
    echo "Security scans completed. Check the report files for results."
else
    echo "Build failed!"
    exit 1
fi
