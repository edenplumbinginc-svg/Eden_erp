# ChatOps Incident Acknowledgment API

## Overview

The ChatOps ACK endpoint (`POST /ops/incidents/:id/ack`) enables acknowledging incidents directly from ChatOps interfaces like Slack. It's protected by a 5-layer security stack and provides full audit trail capabilities.

## Endpoint Specification

### Request

```
POST /ops/incidents/:id/ack
```

**Path Parameters:**
- `id` (uuid, required) - The incident ID to acknowledge

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-Signature: <HMAC_SHA256_SIGNATURE>
```

**Body:**
```json
{
  "reason": "chatops-ack"
}
```

### Response

**Success (200 OK):**
```json
{
  "ok": true,
  "incident": {
    "id": "2417bed8-6fed-41eb-a65f-293a37873e69",
    "incident_key": "GET /api/tasks::error_rate_critical",
    "status": "acknowledged",
    "acknowledged_by": "ops-admin@eden.local",
    "acknowledged_at": "2025-10-25T03:43:56.307Z",
    "escalation_level": 9,
    "severity": "critical",
    "route": "GET /api/tasks"
  }
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 401 | UNAUTHENTICATED | Missing or invalid JWT token |
| 401 | UNAUTHORIZED | Invalid HMAC signature |
| 403 | FORBIDDEN | User lacks `ops_admin` role |
| 404 | NOT_FOUND | Incident ID does not exist |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests (>10/min) |
| 500 | INTERNAL_ERROR | Server error |

## Security Stack

The endpoint enforces **5 layers of security** (applied in order):

### 1. Authentication (`requireAuth`)
- Validates JWT token from `Authorization: Bearer` header
- Ensures user is authenticated via Supabase Auth
- Extracts user identity for audit logging

### 2. RBAC Permissions (`loadRbacPermissions`)
- Loads user's role-based permissions
- Populates `req.rbac.roles` array

### 3. Ops Admin Verification (`requireOpsAdmin`)
- Verifies user has `ops_admin` role
- Required role: `$OPS_ADMIN_ROLE` (default: `ops_admin`)
- Logs security events for denied access

### 4. HMAC Signature (`verifyHmac`)
- Validates request integrity using HMAC-SHA256
- Signature computed from request body
- Secret: `$OPS_HMAC_SECRET`
- Prevents request tampering and replay attacks

### 5. Rate Limiting (`opsRateLimiter`)
- In-memory rate limiter
- Limit: 10 requests per minute per user
- Returns `429` with `Retry-After` header when exceeded

## HMAC Signature Generation

The `X-Signature` header must contain an HMAC-SHA256 hash of the request body.

### Node.js Example

```javascript
const crypto = require('crypto');

const body = JSON.stringify({ reason: "chatops-ack" });
const secret = process.env.OPS_HMAC_SECRET;

const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

console.log(signature); // Use this value in X-Signature header
```

### Bash Example

```bash
BODY='{"reason":"chatops-ack"}'
SIG=$(node -e "
  const crypto = require('crypto');
  const sig = crypto.createHmac('sha256', process.env.OPS_HMAC_SECRET)
    .update('$BODY').digest('hex');
  console.log(sig);
")

echo "X-Signature: $SIG"
```

### Python Example

```python
import hmac
import hashlib
import os
import json

body = json.dumps({"reason": "chatops-ack"})
secret = os.environ['OPS_HMAC_SECRET'].encode()

signature = hmac.new(secret, body.encode(), hashlib.sha256).hexdigest()
print(f"X-Signature: {signature}")
```

## Complete Usage Example

### Step 1: Get Unacknowledged Incident

```bash
INCIDENT_ID=$(psql "$DATABASE_URL" -At -c "
  SELECT id FROM incidents 
  WHERE acknowledged_at IS NULL 
  ORDER BY escalation_level DESC
  LIMIT 1;
")
```

### Step 2: Prepare Request

```bash
BODY='{"reason":"chatops-manual-ack"}'

# Generate HMAC signature
SIG=$(node -e "
  const crypto = require('crypto');
  const sig = crypto.createHmac('sha256', process.env.OPS_HMAC_SECRET)
    .update('$BODY').digest('hex');
  console.log(sig);
")
```

### Step 3: Get JWT Token

**Option A: From Frontend (Browser)**
1. Login to Eden ERP as ops_admin user
2. Open DevTools → Application → Local Storage
3. Find `supabase.auth.token` and copy the access token

**Option B: Programmatically (Supabase)**
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'ops-admin@eden.local',
  password: 'your-password'
});

const jwt = data.session.access_token;
```

### Step 4: Call Endpoint

```bash
curl -X POST "https://your-app.repl.co/ops/incidents/$INCIDENT_ID/ack" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  --data "$BODY" | jq
```

### Step 5: Verify Database Update

```sql
SELECT id, incident_key, status, acknowledged_by, acknowledged_at
FROM incidents
WHERE id = '<incident-id>';
```

## Database Schema

The endpoint updates the following columns in the `incidents` table:

```sql
UPDATE incidents
SET status = 'acknowledged',
    acknowledged_by = <user_email>,
    acknowledged_at = NOW()
WHERE id = <incident_id>
```

**Columns:**
- `status` - Changed from 'open' to 'acknowledged'
- `acknowledged_by` - User email from JWT token
- `acknowledged_at` - Timestamp of acknowledgment

## Audit Trail

All acknowledgment attempts are logged with structured JSON:

**Successful Acknowledgment:**
```json
{
  "level": "info",
  "event": "incident_acknowledged",
  "incident_id": "...",
  "incident_key": "GET /api/tasks::error_rate_critical",
  "user": "ops-admin@eden.local",
  "escalation_level": 9,
  "req_id": "..."
}
```

**Failed Attempt:**
```json
{
  "level": "warn",
  "event": "ops_admin_access_denied",
  "incident_id": "...",
  "user_id": "...",
  "user_email": "viewer@eden.local",
  "required_role": "ops_admin",
  "user_roles": ["viewer"],
  "req_id": "..."
}
```

## Testing

### Manual Test Script

```bash
#!/bin/bash
# Save as: scripts/test-chatops-ack.sh

INCIDENT_ID=$(psql "$DATABASE_URL" -At -c "
  SELECT id FROM incidents WHERE acknowledged_at IS NULL LIMIT 1;
")

BODY='{"reason":"manual-test"}'
SIG=$(node -e "
  const crypto = require('crypto');
  const sig = crypto.createHmac('sha256', process.env.OPS_HMAC_SECRET)
    .update('$BODY').digest('hex');
  console.log(sig);
")

curl -s -X POST "http://localhost:3000/ops/incidents/$INCIDENT_ID/ack" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  --data "$BODY" | jq
```

### Test Cases

| Test | Expected Result |
|------|-----------------|
| Valid request with ops_admin JWT | HTTP 200, incident acknowledged |
| Missing JWT token | HTTP 401 UNAUTHENTICATED |
| Invalid HMAC signature | HTTP 401 UNAUTHORIZED |
| Non-ops_admin user | HTTP 403 FORBIDDEN |
| Non-existent incident ID | HTTP 404 NOT_FOUND |
| >10 requests in 1 minute | HTTP 429 RATE_LIMIT_EXCEEDED |

## Integration with Slack

*Coming next: Slack slash command `/incident-ack` integration*

The Slack integration will:
1. Receive slash command from Slack
2. Validate Slack signature
3. Generate HMAC signature
4. Call this endpoint with proper JWT
5. Return formatted response to Slack

## Environment Variables

```bash
# Required
OPS_HMAC_SECRET=<your-hmac-secret>       # HMAC signature secret
OPS_ADMIN_ROLE=ops_admin                 # Required role name

# Optional (with defaults)
OPS_RATE_LIMIT_MAX=10                    # Max requests per window
OPS_RATE_LIMIT_WINDOW_MS=60000           # Rate limit window (1 minute)
```

## Troubleshooting

### Error: "Sign in required" (401)

**Cause:** Missing or invalid JWT token

**Fix:**
```bash
# Get a fresh JWT token
# Method 1: Login via frontend and copy from localStorage
# Method 2: Use Supabase client to authenticate
```

### Error: "Invalid signature" (401)

**Cause:** HMAC signature mismatch

**Fix:**
```bash
# Ensure body matches exactly what you're signing
# Verify OPS_HMAC_SECRET is correct
# Check for extra whitespace in body
```

### Error: "Access denied. Required role: ops_admin" (403)

**Cause:** User lacks ops_admin role

**Fix:**
```sql
-- Grant ops_admin role to user
INSERT INTO user_role_grants (user_id, role_id)
SELECT 
  '<user-id>',
  id
FROM roles
WHERE name = 'ops_admin';
```

### Error: "Incident not found" (404)

**Cause:** Invalid incident ID or already acknowledged

**Fix:**
```sql
-- Find unacknowledged incidents
SELECT id, incident_key FROM incidents 
WHERE acknowledged_at IS NULL;
```

### Error: "Rate limit exceeded" (429)

**Cause:** More than 10 requests in 1 minute

**Fix:** Wait for the retry period indicated in `Retry-After` header

## Security Considerations

### Rate Limiting
- In-memory tracking (resets on server restart)
- Per-user limits (based on JWT user ID)
- Consider Redis for distributed deployments

### HMAC Secret Rotation
- Generate strong secrets: `openssl rand -hex 32`
- Rotate periodically (e.g., every 90 days)
- Update all callers when rotating

### JWT Token Expiry
- Tokens expire based on Supabase configuration
- Default: 1 hour
- Implement token refresh logic in clients

### Audit Logging
- All attempts logged (success and failure)
- Includes user identity, timestamp, incident details
- Searchable via structured logs

## Related Documentation

- [Escalation Worker](../replit.md#escalation-worker)
- [Incident Management System](../replit.md#incident-management)
- [RBAC Middleware](../lib/rbac.js)
- [HMAC Verification](../lib/hmac.js)
