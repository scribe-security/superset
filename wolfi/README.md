# Superset Wolfi Image Documentation

This directory contains scripts and configuration files for building and managing a Wolfi-based Apache Superset Docker image. Wolfi is a minimal, security-focused container base image from Chainguard.

## Directory Structure

```
wolfi/
├── Dockerfile.wolfi     # Main Dockerfile for building Wolfi-based Superset
├── README.md            # This documentation file
├── VULNERABILITY_FIX_SUMMARY.md  # Summary of security vulnerability fixes
├── docker/              # Docker configuration files
├── github/              # GitHub workflow templates
├── security/            # Security scanning tools and reports
│   ├── check-vulnerabilities.sh  # Vulnerability scanning script
│   ├── README.md        # Security tools documentation
│   └── reports/         # Directory for scan reports
└── tools/               # Build and run tools
    ├── build-wolfi.sh   # Main build script
    ├── README.md        # Tools documentation
    ├── run-compose.sh   # Run with docker-compose
    └── run-local.sh     # Run locally
```

## Quick Start Guide

1. **Build the Wolfi image:**
   ```bash
   ./tools/build-wolfi.sh
   ```

2. **Push to registry:**
   ```bash
   ./tools/build-wolfi.sh -p -r myregistry
   ```

3. **Run vulnerability scans:**
   ```bash
   ./tools/build-wolfi.sh -s
   ```

4. **Run the image locally:**
   ```bash
   ./tools/run-local.sh
   ```

5. **Run with docker-compose:**
   ```bash
   ./tools/run-compose.sh
   ```

## Tools Overview

### Build Tools

The `tools/` directory contains scripts for building and running Wolfi-based Superset images:

- **build-wolfi.sh**: Main build script with options for registry, pushing, and security scanning
- **run-local.sh**: Run locally with Docker
- **run-compose.sh**: Run with docker-compose

For detailed usage, see the [Tools README](tools/README.md).

### Security Tools

The `security/` directory contains tools for vulnerability scanning:

- **check-vulnerabilities.sh**: Scans images for vulnerabilities using Trivy
- **reports/**: Contains vulnerability scan reports

For detailed usage, see the [Security README](security/README.md).

## Dockerfile

### `Dockerfile.wolfi`
The main Dockerfile that creates the Wolfi-based Superset image:
- Uses Chainguard's Wolfi base image
- Installs Python 3.11 and required dependencies
- Configures security settings including SCARF_ANALYTICS=false
- Copies Superset artifacts from the base image

## GitHub Workflow Templates

The `github/` directory contains GitHub Actions workflow templates that can be moved to your `.github/workflows/` directory:

- **vulnerability-check.yml**: Workflow for automated vulnerability scanning

## Security Benefits

The Wolfi-based image provides:
- Minimal attack surface with a reduced package set
- Regular security updates from Chainguard
- Built-in security features and configurations
- Comprehensive vulnerability scanning capabilities

## Notes

- Always run vulnerability scans after building new images
- The build scripts require Docker and docker-compose to be installed
- For GitHub Actions workflow integration, copy files from `github/` to `.github/workflows/`
