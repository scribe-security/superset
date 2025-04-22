#!/bin/bash

# Script to check for vulnerabilities and save results
# This script runs both Trivy and Grype scanners and saves reports

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME=${1:-"apache/superset:wolfi-latest"}
REPORT_DIR="vulnerability-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_STR=$(date +%Y-%m-%d)
SUMMARY_FILE="vulnerability-summary.md"

# Check if image exists
echo -e "${YELLOW}Checking if image exists: ${IMAGE_NAME}${NC}"
if ! docker image inspect ${IMAGE_NAME} &> /dev/null; then
    echo -e "${RED}Image ${IMAGE_NAME} not found!${NC}"
    echo -e "${YELLOW}Please build the image first using:${NC}"
    echo -e "./build-wolfi-latest.sh"
    echo -e "or"
    echo -e "./build-and-check.sh"
    exit 1
fi

# Create report directory
mkdir -p ${REPORT_DIR}

echo -e "${YELLOW}Checking vulnerabilities for image: ${IMAGE_NAME}${NC}\n"

# Run Trivy scan
if command -v trivy &> /dev/null; then
    echo -e "${YELLOW}Running Trivy scan...${NC}"
    trivy image ${IMAGE_NAME} --scanners vuln --format json > ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json
    trivy image ${IMAGE_NAME} --scanners vuln > ${REPORT_DIR}/trivy_report_${TIMESTAMP}.txt
    TRIVY_COUNT=$(jq '[.Results[]?.Vulnerabilities[]?] | length' ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json)
    echo -e "${GREEN}Trivy scan complete. Found ${TRIVY_COUNT} vulnerabilities.${NC}"
else
    echo -e "${RED}Trivy not found. Please install Trivy to run vulnerability scans.${NC}"
    TRIVY_COUNT="N/A"
fi

# Run Grype scan
if command -v grype &> /dev/null; then
    echo -e "${YELLOW}Running Grype scan...${NC}"
    grype ${IMAGE_NAME} -o json > ${REPORT_DIR}/grype_report_${TIMESTAMP}.json
    grype ${IMAGE_NAME} > ${REPORT_DIR}/grype_report_${TIMESTAMP}.txt
    GRYPE_COUNT=$(jq '.matches | length' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json)
    echo -e "${GREEN}Grype scan complete. Found ${GRYPE_COUNT} vulnerabilities.${NC}"
else
    echo -e "${RED}Grype not found. Please install Grype to run vulnerability scans.${NC}"
    GRYPE_COUNT="N/A"
fi

# Create summary report
cat > ${REPORT_DIR}/${SUMMARY_FILE} << EOF
# Vulnerability Scan Summary

**Date:** ${DATE_STR}
**Image:** ${IMAGE_NAME}
**Timestamp:** ${TIMESTAMP}

## Summary
- Trivy vulnerabilities: ${TRIVY_COUNT}
- Grype vulnerabilities: ${GRYPE_COUNT}

## Detailed Reports
- [Trivy JSON Report](trivy_report_${TIMESTAMP}.json)
- [Trivy Text Report](trivy_report_${TIMESTAMP}.txt)
- [Grype JSON Report](grype_report_${TIMESTAMP}.json)
- [Grype Text Report](grype_report_${TIMESTAMP}.txt)

## Critical Vulnerabilities
EOF

# Extract critical vulnerabilities from Trivy
if [ -f "${REPORT_DIR}/trivy_report_${TIMESTAMP}.json" ]; then
    echo -e "\n### Trivy Critical/High Issues:" >> ${REPORT_DIR}/${SUMMARY_FILE}
    jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL" or .Severity == "HIGH") | "\(.VulnerabilityID) - \(.PkgName) \(.InstalledVersion) - \(.Severity)"' ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json >> ${REPORT_DIR}/${SUMMARY_FILE} || echo "No Critical/High vulnerabilities found" >> ${REPORT_DIR}/${SUMMARY_FILE}
fi

# Extract critical vulnerabilities from Grype
if [ -f "${REPORT_DIR}/grype_report_${TIMESTAMP}.json" ]; then
    echo -e "\n### Grype Critical/High Issues:" >> ${REPORT_DIR}/${SUMMARY_FILE}
    jq -r '.matches[]? | select(.vulnerability.severity == "Critical" or .vulnerability.severity == "High") | "\(.vulnerability.id) - \(.artifact.name) \(.artifact.version) - \(.vulnerability.severity)"' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json >> ${REPORT_DIR}/${SUMMARY_FILE} || echo "No Critical/High vulnerabilities found" >> ${REPORT_DIR}/${SUMMARY_FILE}
fi

# Create a simple CSV for tracking over time
CSV_FILE="${REPORT_DIR}/vulnerability_tracking.csv"
if [ ! -f "${CSV_FILE}" ]; then
    echo "date,timestamp,image,trivy_count,grype_count" > ${CSV_FILE}
fi
echo "${DATE_STR},${TIMESTAMP},${IMAGE_NAME},${TRIVY_COUNT},${GRYPE_COUNT}" >> ${CSV_FILE}

# Display summary
echo -e "\n${YELLOW}=== Vulnerability Scan Summary ===${NC}"
echo -e "Image: ${IMAGE_NAME}"
echo -e "Trivy vulnerabilities: ${TRIVY_COUNT}"
echo -e "Grype vulnerabilities: ${GRYPE_COUNT}"
echo -e "\nDetailed reports saved in: ${REPORT_DIR}/"
echo -e "Summary available at: ${REPORT_DIR}/${SUMMARY_FILE}"
echo -e "Historical tracking at: ${CSV_FILE}"

# Create a JSON summary for automated processing
cat > ${REPORT_DIR}/scan_summary_${TIMESTAMP}.json << EOF
{
    "date": "${DATE_STR}",
    "timestamp": "${TIMESTAMP}",
    "image": "${IMAGE_NAME}",
    "trivy_count": ${TRIVY_COUNT:-null},
    "grype_count": ${GRYPE_COUNT:-null},
    "reports": {
        "trivy_json": "trivy_report_${TIMESTAMP}.json",
        "trivy_text": "trivy_report_${TIMESTAMP}.txt",
        "grype_json": "grype_report_${TIMESTAMP}.json",
        "grype_text": "grype_report_${TIMESTAMP}.txt"
    }
}
EOF

# Keep only the last 10 scans (adjust as needed)
ls -t ${REPORT_DIR}/trivy_report_*.json | tail -n +11 | xargs -r rm
ls -t ${REPORT_DIR}/trivy_report_*.txt | tail -n +11 | xargs -r rm
ls -t ${REPORT_DIR}/grype_report_*.json | tail -n +11 | xargs -r rm
ls -t ${REPORT_DIR}/grype_report_*.txt | tail -n +11 | xargs -r rm
ls -t ${REPORT_DIR}/scan_summary_*.json | tail -n +11 | xargs -r rm

echo -e "\n${GREEN}Vulnerability check complete!${NC}"
