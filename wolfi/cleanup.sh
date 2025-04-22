#!/bin/bash

# Script to clean up the Wolfie directory

echo "Cleaning up Wolfie directory..."

# Remove GitHub Act local testing files
rm -f .github-act-event.json .github-act-secrets

# Remove duplicate or unnecessary scripts
# Keep: build-wolfi-image.sh, run-wolfie-compose.sh, check-vulnerabilities.sh
# Remove: test/temporary scripts
rm -f test-workflow-local.sh test-workflow.sh local-test-build.sh
rm -f build-secure.sh  # If this is a duplicate of build-wolfi-image.sh
rm -f build-and-run-wolfie.sh run-wolfie-local.sh  # If these are duplicates

# Clean up old vulnerability reports (keep latest)
cd vulnerability-reports/
# Keep only the latest reports and summary files
find . -name "grype_report_*.json" -type f -printf '%T@ %p\n' | sort -n | head -n -1 | cut -d' ' -f2- | xargs -r rm
find . -name "grype_report_*.txt" -type f -printf '%T@ %p\n' | sort -n | head -n -1 | cut -d' ' -f2- | xargs -r rm
find . -name "trivy_report_*.json" -type f -printf '%T@ %p\n' | sort -n | head -n -1 | cut -d' ' -f2- | xargs -r rm
find . -name "trivy_report_*.txt" -type f -printf '%T@ %p\n' | sort -n | head -n -1 | cut -d' ' -f2- | xargs -r rm
find . -name "scan_summary_*.json" -type f -printf '%T@ %p\n' | sort -n | head -n -1 | cut -d' ' -f2- | xargs -r rm
cd ..

# Optional: Remove workflow file if it's now in .github/workflows
# rm -f workflow-vulnerability-check.yml

echo "Cleanup complete!"
echo "Remaining files:"
ls -la
