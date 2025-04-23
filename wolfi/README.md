# Superset Wolfi Image Documentation

This directory contains scripts and configuration files for building and managing a Wolfi-based Apache Superset Docker image. Wolfi is a minimal, security-focused container base image from Chainguard.

## Directory Structure

```
wolfi/
├── Dockerfile.wolfi           # Main Dockerfile for building Wolfi-based Superset
├── Dockerfile.wolfi-fix-deps  # Fixed version addressing dependency conflicts
├── build-*.sh                  # Various build scripts
├── check-vulnerabilities.sh    # Vulnerability scanning script
├── run-*.sh                    # Scripts to run the image
├── docker/                     # Docker configuration files
└── vulnerability-reports/      # Directory for scan reports
```

## Scripts Overview

### Build Scripts

#### `build-wolfi-image.sh`
The primary build script that:
- Builds the base Superset image using docker-compose
- Creates the Wolfi-based image tagged as `apache/superset:latest-dev`
- Includes error checking and image verification
- Usage: `./build-wolfi-image.sh`

#### `build-wolfi-latest.sh`
Similar to `build-wolfi-image.sh` but tags the image as `apache/superset:wolfi-latest`.
- Specifically designed for vulnerability scanning compatibility
- Usage: `./build-wolfi-latest.sh`

#### `build-secure.sh`
A security-focused build script that:
- May include additional security measures during build
- Usage: `./build-secure.sh`

#### `build-and-check.sh`
An all-in-one script that:
1. Builds the base Superset image
2. Builds the Wolfi-based image (`apache/superset:wolfi-latest`)
3. Automatically runs vulnerability scans
4. Provides colored output for easy status tracking
- Usage: `./build-and-check.sh`

#### `build-and-run-wolfie.sh`
Builds the Wolfi image and immediately runs it:
- Combines building and execution in one step
- Useful for quick testing of changes
- Usage: `./build-and-run-wolfie.sh`

### Vulnerability Scanning Scripts

#### `check-vulnerabilities.sh`
Runs comprehensive vulnerability scans using both Trivy and Grype:
- Defaults to scanning `apache/superset:wolfi-latest`
- Generates reports in JSON and text formats
- Creates a summary report with critical/high issues
- Maintains historical tracking of vulnerabilities
- Usage: `./check-vulnerabilities.sh [IMAGE_NAME]`

#### `check-vulnerabilities-safe.sh`
A safer version of the vulnerability check script:
- May include additional safety measures or checks
- Usage: `./check-vulnerabilities-safe.sh`

### Runtime Scripts

#### `run-wolfie-compose.sh`
Runs the Wolfi-based Superset using docker-compose:
- Uses the existing docker-compose configuration
- Replaces the standard Superset image with the Wolfi version
- Usage: `./run-wolfie-compose.sh`

#### `run-wolfie-local.sh`
Runs the Wolfi-based Superset image locally:
- Direct Docker run command without docker-compose
- Useful for quick tests or debugging
- Usage: `./run-wolfie-local.sh`

### Maintenance Scripts

#### `cleanup.sh`
Cleans up temporary files and old vulnerability reports:
- Removes test files and old reports
- Keeps essential configuration files
- Maintains directory hygiene
- Usage: `./cleanup.sh`

## Dockerfiles

### `Dockerfile.wolfi`
The main Dockerfile that creates the Wolfi-based Superset image:
- Uses Chainguard's Wolfi base image
- Installs Python 3.11 and required dependencies
- Configures security settings
- Copies Superset artifacts from the base image

### `Dockerfile.wolfi-fix-deps`
A modified version of the Dockerfile that:
- Addresses dependency conflict issues
- Uses version constraints instead of exact versions
- More compatible with existing requirements

## Vulnerability Reports

The `vulnerability-reports/` directory contains:
- JSON and text reports from Trivy and Grype scans
- Summary markdown files
- Historical tracking CSV
- Scan summary JSON files

## Workflow Files

### `workflow-vulnerability-check.yml`
GitHub Actions workflow for automated vulnerability checking:
- Can be integrated into CI/CD pipeline
- Runs scans on push/pull requests

## Configuration Files

### `.github-act-event.json` & `.github-act-secrets`
Configuration files for testing GitHub Actions locally using `act`.

## Quick Start Guide

1. **Build the Wolfi image:**
   ```bash
   ./build-wolfi-latest.sh
   ```

2. **Run vulnerability scans:**
   ```bash
   ./check-vulnerabilities.sh
   ```

3. **Build and check in one step:**
   ```bash
   ./build-and-check.sh
   ```

4. **Run the image:**
   ```bash
   ./run-wolfie-compose.sh  # With docker-compose
   # or
   ./run-wolfie-local.sh    # Standalone
   ```

5. **Clean up old files:**
   ```bash
   ./cleanup.sh
   ```

## Security Benefits

The Wolfi-based image provides:
- Minimal attack surface with a reduced package set
- Regular security updates from Chainguard
- Built-in security features and configurations
- Comprehensive vulnerability scanning capabilities

## Notes

- Always run vulnerability scans after building new images
- Check the vulnerability reports for critical issues
- Keep the vulnerability reports directory clean using the cleanup script
- The build scripts require Docker and docker-compose to be installed
- Vulnerability scanners (Trivy and Grype) must be installed for scanning
