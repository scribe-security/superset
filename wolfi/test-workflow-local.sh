#!/bin/bash

# Test GitHub Actions workflow locally using act
set -e

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo "Error: 'act' is not installed. Please install it first:"
    echo "  brew install act"
    exit 1
fi

# Navigate to root directory FIRST
cd ..

# Create a secrets file for testing in the root directory
cat > .github-act-secrets <<EOF
DOCKERHUB_USER=testuser
DOCKERHUB_TOKEN=testtoken
EOF

# Create event payload for workflow_dispatch in the root directory
cat > .github-act-event.json <<EOF
{
  "action": "workflow_dispatch",
  "inputs": {
    "release_index": "test-001",
    "build_type": "wolfi"
  }
}
EOF

# Test the workflow
echo "Testing Scribe Docker Release workflow..."

# For Apple Silicon Macs (M-series), use linux/amd64 architecture
if [[ $(uname -m) == "arm64" ]]; then
    echo "Detected Apple Silicon - using linux/amd64 architecture"
    
    # Test with dry-run first
    act workflow_dispatch -j build \
        --container-architecture linux/amd64 \
        --platform ubuntu-latest=catthehacker/ubuntu:act-latest \
        --secret-file .github-act-secrets \
        --eventpath .github-act-event.json \
        -W .github/workflows/scribe-docker-release.yml \
        --dryrun
else
    # For Intel Macs or Linux
    act workflow_dispatch -j build \
        --platform ubuntu-latest=catthehacker/ubuntu:act-latest \
        --secret-file .github-act-secrets \
        --eventpath .github-act-event.json \
        -W .github/workflows/scribe-docker-release.yml \
        --dryrun
fi

echo ""
echo "Dry run complete! To run the workflow without dry-run, remove the --dryrun flag"
echo "To test different build types, edit .github-act-event.json and change 'build_type' to:"
echo "  - base"
echo "  - wolfi"
echo "  - both"

# Clean up
rm -f .github-act-secrets .github-act-event.json
