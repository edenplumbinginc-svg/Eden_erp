#!/bin/bash
set -euo pipefail

# ChatOps ACK Endpoint Test Script
# Usage: JWT_TOKEN=<your-token> ./scripts/test-chatops-ack.sh

echo "🧪 ChatOps ACK Endpoint - Manual Test"
echo "====================================="
echo ""

# Check for required environment variables
if [ -z "${JWT_TOKEN:-}" ]; then
  echo "❌ Error: JWT_TOKEN environment variable not set"
  echo ""
  echo "To get a JWT token:"
  echo "  1. Login to Eden ERP as ops_admin user"
  echo "  2. Open DevTools → Application → Local Storage"
  echo "  3. Copy value from 'supabase.auth.token'"
  echo "  4. Run: JWT_TOKEN='<token>' ./scripts/test-chatops-ack.sh"
  echo ""
  exit 1
fi

if [ -z "${OPS_HMAC_SECRET:-}" ]; then
  echo "❌ Error: OPS_HMAC_SECRET environment variable not set"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set"
  exit 1
fi

# Configuration
STAGING_HOST="${STAGING_HOST:-localhost:3000}"
PROTOCOL="${PROTOCOL:-http}"

echo "Configuration:"
echo "  Host: $STAGING_HOST"
echo "  Protocol: $PROTOCOL"
echo ""

# 1) Get an unacknowledged incident
echo "1️⃣  Finding unacknowledged incident..."
INCIDENT_ID=$(psql "$DATABASE_URL" -At -c "
  SELECT id FROM incidents 
  WHERE acknowledged_at IS NULL 
  ORDER BY escalation_level DESC
  LIMIT 1;
")

if [ -z "$INCIDENT_ID" ]; then
  echo "   ⚠️  No unacknowledged incidents found"
  echo "   Creating test incident..."
  INCIDENT_ID=$(psql "$DATABASE_URL" -At -c "
    INSERT INTO incidents (incident_key, route, kind, severity, status, escalation_level)
    VALUES ('TEST::chatops_manual', 'POST /test/manual', 'manual_test', 'critical', 'open', 1)
    RETURNING id;
  ")
  echo "   ✅ Created test incident: $INCIDENT_ID"
else
  echo "   ✅ Found incident: $INCIDENT_ID"
fi

echo ""

# 2) Show current state
echo "2️⃣  Current incident state:"
psql "$DATABASE_URL" -c "
  SELECT id, incident_key, status, acknowledged_by, acknowledged_at, escalation_level, severity
  FROM incidents
  WHERE id = '$INCIDENT_ID';
"
echo ""

# 3) Prepare request
echo "3️⃣  Preparing request..."
BODY='{"reason":"chatops-manual-test"}'
echo "   Body: $BODY"

# Generate HMAC signature
SIG=$(node -e "
const crypto = require('crypto');
const body = '$BODY';
const secret = process.env.OPS_HMAC_SECRET;
const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
console.log(sig);
")

echo "   Signature: ${SIG:0:32}..."
echo "   JWT Token: ${JWT_TOKEN:0:32}..."
echo ""

# 4) Call endpoint
echo "4️⃣  Calling ACK endpoint..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "${PROTOCOL}://${STAGING_HOST}/ops/incidents/${INCIDENT_ID}/ack" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  --data "$BODY")

http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
body_response=$(echo "$response" | grep -v "HTTP_CODE")

echo "   HTTP Status: $http_code"
echo ""

# 5) Display response
echo "5️⃣  Response:"
echo "$body_response" | jq '.' 2>/dev/null || echo "$body_response"
echo ""

# 6) Verify database update
echo "6️⃣  Verifying database update..."
psql "$DATABASE_URL" -c "
  SELECT id, incident_key, status, acknowledged_by, acknowledged_at, escalation_level
  FROM incidents
  WHERE id = '$INCIDENT_ID';
"
echo ""

# 7) Summary
echo "📊 Summary"
echo "=========="

if [ "$http_code" = "200" ]; then
  ack_by=$(echo "$body_response" | jq -r '.incident.acknowledged_by' 2>/dev/null || echo "unknown")
  ack_at=$(echo "$body_response" | jq -r '.incident.acknowledged_at' 2>/dev/null || echo "unknown")
  
  echo "✅ SUCCESS - Incident acknowledged"
  echo "   ✅ HTTP Status: 200 OK"
  echo "   ✅ Acknowledged by: $ack_by"
  echo "   ✅ Acknowledged at: $ack_at"
  echo "   ✅ Status changed: open → acknowledged"
  echo ""
  echo "🎉 All systems working correctly!"
  
elif [ "$http_code" = "401" ]; then
  error_code=$(echo "$body_response" | jq -r '.error.code' 2>/dev/null || echo "UNAUTHORIZED")
  echo "❌ AUTHENTICATION FAILED"
  echo "   Error: $error_code"
  echo ""
  echo "Possible causes:"
  echo "   - JWT token expired (check token expiry)"
  echo "   - Invalid JWT token format"
  echo "   - HMAC signature mismatch"
  echo ""
  echo "Troubleshooting:"
  echo "   1. Get a fresh JWT token from browser localStorage"
  echo "   2. Verify OPS_HMAC_SECRET is correct"
  echo "   3. Ensure body matches signature exactly"
  
elif [ "$http_code" = "403" ]; then
  echo "❌ AUTHORIZATION FAILED"
  echo "   User lacks ops_admin role"
  echo ""
  echo "Fix:"
  echo "   1. Grant ops_admin role to your user in database"
  echo "   2. Or login with an ops_admin account"
  
elif [ "$http_code" = "404" ]; then
  echo "❌ INCIDENT NOT FOUND"
  echo "   Incident may have been already acknowledged"
  echo ""
  echo "Try again with a different incident ID"
  
elif [ "$http_code" = "429" ]; then
  retry_after=$(echo "$body_response" | jq -r '.error.retryAfter' 2>/dev/null || echo "60")
  echo "❌ RATE LIMIT EXCEEDED"
  echo "   Retry after: ${retry_after}s"
  
else
  echo "⚠️  Unexpected status: $http_code"
  echo "   Response: $body_response"
fi

echo ""
