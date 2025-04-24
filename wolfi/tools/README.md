# Wolfi Tools

This directory contains tools for building and running Wolfi-based Superset images.

## Available Tools

### build-wolfi.sh

Builds a secure Wolfi-based Superset image from your local codebase.

```bash
# Default local build
./build-wolfi.sh

# Push images to registry
./build-wolfi.sh -p

# Specify registry name
./build-wolfi.sh -r my-registry

# Specify release index
./build-wolfi.sh -i my-index

# Check for security vulnerabilities after build
./build-wolfi.sh -s
```

### run-local.sh

Runs a secure Wolfi-based Superset image locally with docker-compose.

```bash
# Build image from docker-compose.yml and use it as base
./run-local.sh

# Skip local build and use existing apache/superset:latest-dev
./run-local.sh --no-build

# Specify custom base image
./run-local.sh apache/superset:custom-tag
```

### run-compose.sh

Runs Superset with a Wolfi-based image using docker-compose.

```bash
# Use default tags
./run-compose.sh

# Use specific base image
./run-compose.sh myrepo/superset:tag
```
