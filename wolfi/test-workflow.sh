#!/bin/bash
set -e

# Script to test GitHub Actions workflow locally using act
# https://github.com/nektos/act

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo -e "${RED}Error: 'act' is not installed.${NC}"
    echo -e "${YELLOW}Please install act first:${NC}"
    echo "  - macOS: brew install act"
    echo "  - Linux: https://github.com/nektos/act#installation"
    exit 1
fi

# Create temporary secrets file
echo -e "${YELLOW}Creating temporary secrets file for testing...${NC}"
cat > .act-secrets << EOF
DOCKERHUB_USER=test-user
DOCKERHUB_TOKEN=test-token
EOF

echo -e "${GREEN}Secrets file created.${NC}"

# Determine which workflow to test
echo -e "${YELLOW}Which workflow type do you want to test?${NC}"
echo "1) Base image only"
echo "2) Wolfi image only"
echo "3) Both images"
read -p "Enter option (1-3): " workflow_option

case $workflow_option in
    1)
        build_type="base"
        ;;
    2)
        build_type="wolfi"
        ;;
    3)
        build_type="both"
        ;;
    *)
        echo -e "${RED}Invalid option. Exiting.${NC}"
        exit 1
        ;;
esac

# Ask for release index
read -p "Enter release index for testing (e.g., 1): " release_index

echo -e "${YELLOW}Running workflow with:${NC}"
echo -e "  - Build type: ${GREEN}$build_type${NC}"
echo -e "  - Release index: ${GREEN}$release_index${NC}"

# Run act with the workflow
echo -e "${YELLOW}Starting local workflow test with act...${NC}"
echo -e "${YELLOW}(This will just list the actions that would run)${NC}"

# Preview mode
act workflow_dispatch -W .github/workflows/scribe-docker-release.yml \
    --secret-file .act-secrets \
    -e <(echo '{"inputs":{"release_index":"'$release_index'","build_type":"'$build_type'"}}') \
    --list

echo
echo -e "${YELLOW}Would you like to run the actual workflow? (Docker commands will execute)${NC}"
echo -e "${YELLOW}WARNING: This will build Docker images but the push will fail with test credentials${NC}"
read -p "Run actual workflow? (y/n): " run_actual

if [[ $run_actual == "y" || $run_actual == "Y" ]]; then
    echo -e "${YELLOW}Running actual workflow (push will fail with test credentials)...${NC}"
    
    act workflow_dispatch -W .github/workflows/scribe-docker-release.yml \
        --secret-file .act-secrets \
        -e <(echo '{"inputs":{"release_index":"'$release_index'","build_type":"'$build_type'"}}')
fi

# Clean up
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -f .act-secrets

echo -e "${GREEN}Workflow test complete!${NC}"