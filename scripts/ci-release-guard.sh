#!/bin/bash
# CI/CD Release Guard - Automated deploy safety validation
# This script polls the /ops/release-guard endpoint to ensure the system
# is healthy before promoting a deployment.
#
# Usage:
#   ./scripts/ci-release-guard.sh <base-url>
#
# Example:
#   ./scripts/ci-release-guard.sh https://your-app.replit.app
#
# Exit codes:
#   0 = Release guard passed (safe to deploy)
#   1 = Release guard failed (violations detected)
#   2 = Missing base URL parameter or timeout/network error
#
# Environment variables (optional):
#   GUARD_ALLOW_WARN=true       - Ignore warning-level alarms (default: true)
#   GUARD_CHECK_REGRESS=false   - Check p95 regressions (default: false)
#   GUARD_MIN_SAMPLES=5         - Min samples to consider a route (default: 5)
#   GUARD_HARD_ERROR_PCT=20     - Hard error threshold (default: 20)
#   GUARD_MAX_ATTEMPTS=8        - Max polling attempts (default: 8)
#   GUARD_POLL_INTERVAL=15      - Seconds between polls (default: 15)

# Check for required parameter
if [ -z "$1" ]; then
  echo "❌ Error: Missing base URL parameter"
  echo "Usage: $0 <base-url>"
  echo "Example: $0 https://your-app.replit.app"
  exit 2
fi

BASE_URL="${1%/}"

# Configuration (with defaults)
ALLOW_WARN="${GUARD_ALLOW_WARN:-true}"
CHECK_REGRESS="${GUARD_CHECK_REGRESS:-false}"
MIN_SAMPLES="${GUARD_MIN_SAMPLES:-5}"
HARD_ERROR_PCT="${GUARD_HARD_ERROR_PCT:-20}"
MAX_ATTEMPTS="${GUARD_MAX_ATTEMPTS:-8}"
POLL_INTERVAL="${GUARD_POLL_INTERVAL:-15}"

# Build query string
QUERY="allow_warn=${ALLOW_WARN}&check_regress=${CHECK_REGRESS}&min_samples=${MIN_SAMPLES}&hard_error_pct=${HARD_ERROR_PCT}"
ENDPOINT="${BASE_URL}/ops/release-guard?${QUERY}"

echo "🔍 Release Guard - Automated Deploy Safety Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Endpoint: ${ENDPOINT}"
echo "Configuration:"
echo "  - Allow warnings: ${ALLOW_WARN}"
echo "  - Check regressions: ${CHECK_REGRESS}"
echo "  - Min samples: ${MIN_SAMPLES}"
echo "  - Hard error threshold: ${HARD_ERROR_PCT}%"
echo "  - Max attempts: ${MAX_ATTEMPTS}"
echo "  - Poll interval: ${POLL_INTERVAL}s"
echo ""

ATTEMPTS=${MAX_ATTEMPTS}

while [ ${ATTEMPTS} -gt 0 ]; do
  echo "⏳ Checking release guard (attempt $((MAX_ATTEMPTS - ATTEMPTS + 1))/${MAX_ATTEMPTS})..."
  
  # Fetch response and HTTP status (don't fail on non-2xx)
  HTTP_CODE=$(curl -s -w '%{http_code}' -o /tmp/guard-response.json "${ENDPOINT}" 2>/dev/null)
  RESPONSE=$(cat /tmp/guard-response.json 2>/dev/null || echo "")
  
  # Check if we got a valid response
  if [ -z "${RESPONSE}" ]; then
    echo "   ⚠ No response from endpoint (HTTP ${HTTP_CODE})"
  else
    # Try to parse JSON (convert boolean to string)
    PASS=$(echo "${RESPONSE}" | jq -r '.pass | tostring' 2>/dev/null)
    
    if [ -z "${PASS}" ] || [ "${PASS}" = "null" ]; then
      echo "   ⚠ Invalid JSON response (missing .pass field)"
    elif [ "${PASS}" = "true" ]; then
      # Success case
      echo ""
      echo "✅ Release Guard PASSED"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "✓ No SLO violations detected"
      echo "✓ No critical error rates detected"
      echo "✓ System is healthy - safe to proceed with deployment"
      echo ""
      rm -f /tmp/guard-response.json
      exit 0
    else
      # Failure case - guard detected violations
      echo ""
      echo "❌ Release Guard FAILED (HTTP ${HTTP_CODE})"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      
      # Show violations if available
      VIOLATIONS_COUNT=$(echo "${RESPONSE}" | jq -r '.violations | length' 2>/dev/null || echo "0")
      if [ "${VIOLATIONS_COUNT}" != "0" ]; then
        echo "${RESPONSE}" | jq -r '.violations[] | "  ⚠ \(.route): \(.reason)\n    Evidence: \(.evidence | tostring)"' 2>/dev/null || echo "${RESPONSE}"
      else
        echo "${RESPONSE}" | jq '.' 2>/dev/null || echo "${RESPONSE}"
      fi
      
      echo ""
      echo "🚫 Deployment blocked due to detected violations"
      echo "   Review the violations above and fix before deploying"
      echo ""
      rm -f /tmp/guard-response.json
      exit 1
    fi
  fi
  
  # Decrement attempts and wait
  ATTEMPTS=$((ATTEMPTS - 1))
  
  if [ ${ATTEMPTS} -gt 0 ]; then
    echo "   ⏸ Waiting ${POLL_INTERVAL}s before retry..."
    sleep ${POLL_INTERVAL}
  fi
done

# Max attempts reached - timeout/error
echo ""
echo "❌ Release Guard TIMEOUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Failed to get a passing response after ${MAX_ATTEMPTS} attempts"
echo "This may indicate:"
echo "  - The system is still experiencing issues"
echo "  - The endpoint is unreachable"
echo "  - Network connectivity problems"
echo ""
echo "🚫 Deployment blocked as a safety precaution"
echo ""
rm -f /tmp/guard-response.json
exit 2
