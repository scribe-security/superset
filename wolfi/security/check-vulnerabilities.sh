#!/bin/bash

# Script to check for vulnerabilities and save results
# This script runs both Trivy and Grype scanners and saves reports

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration - Changed default to Wolfi image
IMAGE_NAME=${1:-"apache/superset:wolfi-latest"}
REPORT_DIR="vulnerability-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_STR=$(date +%Y-%m-%d)
SUMMARY_FILE="vulnerability-summary.md"

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
    
    # Count vulnerabilities by severity for Trivy
    TRIVY_CRITICAL=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json)
    TRIVY_HIGH=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json)
    TRIVY_MEDIUM=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "MEDIUM")] | length' ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json)
    TRIVY_LOW=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "LOW")] | length' ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json)
    TRIVY_UNKNOWN=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "UNKNOWN")] | length' ${REPORT_DIR}/trivy_report_${TIMESTAMP}.json)
else
    echo -e "${RED}Trivy not found. Please install Trivy to run vulnerability scans.${NC}"
    TRIVY_COUNT="N/A"
    TRIVY_CRITICAL="N/A"
    TRIVY_HIGH="N/A"
    TRIVY_MEDIUM="N/A"
    TRIVY_LOW="N/A"
    TRIVY_UNKNOWN="N/A"
fi

# Run Grype scan
if command -v grype &> /dev/null; then
    echo -e "${YELLOW}Running Grype scan...${NC}"
    grype ${IMAGE_NAME} -o json > ${REPORT_DIR}/grype_report_${TIMESTAMP}.json
    grype ${IMAGE_NAME} > ${REPORT_DIR}/grype_report_${TIMESTAMP}.txt
    GRYPE_COUNT=$(jq '.matches | length' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json)
    echo -e "${GREEN}Grype scan complete. Found ${GRYPE_COUNT} vulnerabilities.${NC}"
    
    # Count vulnerabilities by severity for Grype
    GRYPE_CRITICAL=$(jq '[.matches[]? | select(.vulnerability.severity == "Critical")] | length' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json)
    GRYPE_HIGH=$(jq '[.matches[]? | select(.vulnerability.severity == "High")] | length' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json)
    GRYPE_MEDIUM=$(jq '[.matches[]? | select(.vulnerability.severity == "Medium")] | length' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json)
    GRYPE_LOW=$(jq '[.matches[]? | select(.vulnerability.severity == "Low")] | length' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json)
    GRYPE_NEGLIGIBLE=$(jq '[.matches[]? | select(.vulnerability.severity == "Negligible")] | length' ${REPORT_DIR}/grype_report_${TIMESTAMP}.json)
else
    echo -e "${RED}Grype not found. Please install Grype to run vulnerability scans.${NC}"
    GRYPE_COUNT="N/A"
    GRYPE_CRITICAL="N/A"
    GRYPE_HIGH="N/A"
    GRYPE_MEDIUM="N/A"
    GRYPE_LOW="N/A"
    GRYPE_NEGLIGIBLE="N/A"
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

## Trivy Vulnerabilities by Severity
- CRITICAL: ${TRIVY_CRITICAL}
- HIGH: ${TRIVY_HIGH}
- MEDIUM: ${TRIVY_MEDIUM}
- LOW: ${TRIVY_LOW}
- UNKNOWN: ${TRIVY_UNKNOWN}

## Grype Vulnerabilities by Severity
- CRITICAL: ${GRYPE_CRITICAL}
- HIGH: ${GRYPE_HIGH}
- MEDIUM: ${GRYPE_MEDIUM}
- LOW: ${GRYPE_LOW}
- NEGLIGIBLE: ${GRYPE_NEGLIGIBLE}

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
    echo "date,timestamp,image,trivy_total,trivy_critical,trivy_high,trivy_medium,trivy_low,trivy_unknown,grype_total,grype_critical,grype_high,grype_medium,grype_low,grype_negligible" > ${CSV_FILE}
fi
echo "${DATE_STR},${TIMESTAMP},${IMAGE_NAME},${TRIVY_COUNT},${TRIVY_CRITICAL},${TRIVY_HIGH},${TRIVY_MEDIUM},${TRIVY_LOW},${TRIVY_UNKNOWN},${GRYPE_COUNT},${GRYPE_CRITICAL},${GRYPE_HIGH},${GRYPE_MEDIUM},${GRYPE_LOW},${GRYPE_NEGLIGIBLE}" >> ${CSV_FILE}

# Display summary
echo -e "\n${YELLOW}=== Vulnerability Scan Summary ===${NC}"
echo -e "Image: ${IMAGE_NAME}"
echo -e "\n${YELLOW}Trivy Results:${NC}"
echo -e "Total: ${TRIVY_COUNT}"
echo -e "Critical: ${TRIVY_CRITICAL}"
echo -e "High: ${TRIVY_HIGH}"
echo -e "Medium: ${TRIVY_MEDIUM}"
echo -e "Low: ${TRIVY_LOW}"
echo -e "Unknown: ${TRIVY_UNKNOWN}"
echo -e "\n${YELLOW}Grype Results:${NC}"
echo -e "Total: ${GRYPE_COUNT}"
echo -e "Critical: ${GRYPE_CRITICAL}"
echo -e "High: ${GRYPE_HIGH}"
echo -e "Medium: ${GRYPE_MEDIUM}"
echo -e "Low: ${GRYPE_LOW}"
echo -e "Negligible: ${GRYPE_NEGLIGIBLE}"
echo -e "\nDetailed reports saved in: ${REPORT_DIR}/"
echo -e "Summary available at: ${REPORT_DIR}/${SUMMARY_FILE}"
echo -e "Historical tracking at: ${CSV_FILE}"

# Create a JSON summary for automated processing
cat > ${REPORT_DIR}/scan_summary_${TIMESTAMP}.json << EOF
{
    "date": "${DATE_STR}",
    "timestamp": "${TIMESTAMP}",
    "image": "${IMAGE_NAME}",
    "trivy": {
        "total": ${TRIVY_COUNT:-null},
        "critical": ${TRIVY_CRITICAL:-null},
        "high": ${TRIVY_HIGH:-null},
        "medium": ${TRIVY_MEDIUM:-null},
        "low": ${TRIVY_LOW:-null},
        "unknown": ${TRIVY_UNKNOWN:-null}
    },
    "grype": {
        "total": ${GRYPE_COUNT:-null},
        "critical": ${GRYPE_CRITICAL:-null},
        "high": ${GRYPE_HIGH:-null},
        "medium": ${GRYPE_MEDIUM:-null},
        "low": ${GRYPE_LOW:-null},
        "negligible": ${GRYPE_NEGLIGIBLE:-null}
    },
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
