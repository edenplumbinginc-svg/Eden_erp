# Testing the Release Guard - Complete Guide

This guide walks you through testing the complete CI/CD gating workflow with the Release Guard.

## Prerequisites

- ✅ Escalation worker enabled in DRY_RUN mode with 10% canary
- ✅ GitHub Actions workflow created (`.github/workflows/deploy-canary.yml`)
- ✅ Rollback script created (`scripts/rollback-staging.sh`)
- ✅ Staging environment accessible

## Test 1: Verify Guard Blocks on Critical Incidents

### Step 1: Create a Blocking Incident

Create a critical incident at escalation level 1 (started 6 minutes ago, within the 10-minute lookback window):

```sql
psql "$DATABASE_URL" -c "
UPDATE incidents
SET status='open',
    acknowledged_at=NULL,
    severity='critical',
    escalation_level=1,
    first_seen=now() - interval '6 minutes'
WHERE id IN (SELECT id FROM incidents ORDER BY random() LIMIT 1)
RETURNING id, incident_key, severity, escalation_level, first_seen;
"
```

### Step 2: Test the Release Guard Endpoint

```bash
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "X-Guard-Lookback-Min: 10" \
  -H "X-Guard-Min-Esc-Level: 1" \
  -H "X-Guard-Include-Warning: false" \
  "https://<STAGING_HOST>/ops/release-guard" | jq
```

**Expected Response:**
```
HTTP Status: 503
{
  "pass": false,
  "violations": [...]
}
```

### Step 3: Simulate CI/CD Pipeline

Save this as `test-guard-block.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "🚀 Simulating canary deployment..."
echo "✅ Tests passed"
echo "✅ Build succeeded"
echo "✅ Canary deployed (10%)"
echo "✅ Smoke tests passed"
echo ""

echo "🛡️  Checking Release Guard..."

code=$(curl -s -o guard.json -w "%{http_code}" \
  -H "X-Guard-Lookback-Min: 10" \
  -H "X-Guard-Min-Esc-Level: 1" \
  "https://<STAGING_HOST>/ops/release-guard")

echo "Release Guard HTTP: $code"
cat guard.json | jq '.'

if [ "$code" = "200" ]; then
  echo ""
  echo "✅ Release Guard PASSED"
  echo "✅ Promoting to production (100%)..."
  echo "✅ Deployment complete!"
  exit 0
else
  echo ""
  echo "❌ Release Guard BLOCKED"
  echo "🔄 Executing auto-rollback..."
  ./scripts/rollback-staging.sh
  echo "❌ Deployment failed - blocked by active incidents"
  exit 1
fi
```

Run it:

```bash
chmod +x test-guard-block.sh
./test-guard-block.sh
```

**Expected Output:**
```
🚀 Simulating canary deployment...
✅ Tests passed
✅ Build succeeded
✅ Canary deployed (10%)
✅ Smoke tests passed

🛡️  Checking Release Guard...
Release Guard HTTP: 503
{
  "pass": false,
  "violations": [...]
}

❌ Release Guard BLOCKED
🔄 Executing auto-rollback...
Rolling back staging deployment...
✅ Rollback completed
❌ Deployment failed - blocked by active incidents
```

## Test 2: Verify Guard Passes After Resolution

### Step 1: Acknowledge the Blocking Incident

```sql
psql "$DATABASE_URL" -c "
UPDATE incidents
SET acknowledged_at = now()
WHERE acknowledged_at IS NULL
  AND escalation_level >= 1
  AND severity = 'critical'
  AND first_seen > now() - interval '10 minutes'
RETURNING id, incident_key, acknowledged_at;
"
```

### Step 2: Rerun the Pipeline

```bash
./test-guard-block.sh
```

**Expected Output:**
```
🚀 Simulating canary deployment...
✅ Tests passed
✅ Build succeeded
✅ Canary deployed (10%)
✅ Smoke tests passed

🛡️  Checking Release Guard...
Release Guard HTTP: 200
{
  "pass": true,
  "violations": []
}

✅ Release Guard PASSED
✅ Promoting to production (100%)...
✅ Deployment complete!
```

## Test 3: GitHub Actions Integration

### Step 1: Push to Main Branch

```bash
git add .
git commit -m "Add Release Guard to CI/CD pipeline"
git push origin main
```

### Step 2: Monitor Workflow

Go to GitHub → Actions → "Canary Deployment with Release Guard"

**Expected Flow:**

1. ✅ **Test** job runs
2. ✅ **Build** job runs
3. ✅ **Deploy Canary** job starts
   - ✅ Deploy to staging (10%)
   - ✅ Smoke test (health check)
   - ✅ Smoke test (escalation worker)
   - 🛡️ **Release Guard** check
     - If blocking incidents: ❌ FAIL → Auto-rollback
     - If clean: ✅ PASS → Continue
4. ✅ **Promote Production** job runs (only if guard passed)

### Step 3: Review Artifacts

If the guard blocks deployment, check the **release-guard-report** artifact:

```
guard.json contains:
{
  "pass": false,
  "violations": [
    {
      "reason": "error_rate_critical",
      "route": "GET /api/tasks",
      "evidence": {...}
    }
  ]
}
```

## Test 4: End-to-End Automated Flow

### Scenario: Production Issue Detection

1. **Issue Occurs** → Metrics spike → Incident created
2. **Escalation Worker** → Detects overdue incident → Escalates to L1
3. **Developer Pushes** → CI/CD pipeline starts
4. **Release Guard** → Detects L1 incident → Blocks deployment (HTTP 503)
5. **Auto-Rollback** → Pipeline rolls back canary
6. **On-Call Alerted** → Via Slack escalation notification
7. **Issue Resolved** → Incident acknowledged
8. **Re-Deploy** → Guard passes → Deployment succeeds

### Timeline Simulation

```bash
# T+0: Issue starts
echo "🔥 Issue detected at 00:00"

# T+5: Escalation worker escalates
echo "📈 Incident escalated to L1 at 00:05"

# T+6: Developer attempts deploy
echo "🚀 Deploy attempted at 00:06"

# T+6: Guard blocks
echo "🛡️ Release Guard BLOCKS at 00:06 (L1 incident active)"

# T+7: Auto-rollback
echo "🔄 Canary rolled back at 00:07"

# T+15: Issue fixed
echo "✅ Issue resolved at 00:15"

# T+16: Deploy succeeds
echo "🚀 Deploy succeeds at 00:16 (no active incidents)"
```

## Configuration Tuning

### Adjust Guard Sensitivity

**More Strict** (block on any recent escalation):
```yaml
GUARD_LOOKBACK_MIN: 5      # Last 5 minutes only
GUARD_MIN_ESC_LEVEL: 0     # Block even at level 0
GUARD_INCLUDE_WARNING: true # Include warnings
```

**Less Strict** (only block on severe issues):
```yaml
GUARD_LOOKBACK_MIN: 20      # Last 20 minutes
GUARD_MIN_ESC_LEVEL: 3      # Only block at L3+
GUARD_INCLUDE_WARNING: false # Critical only
```

## Troubleshooting

### Guard always blocks

**Check active incidents:**
```sql
SELECT incident_key, severity, escalation_level, 
       first_seen, acknowledged_at
FROM incidents
WHERE acknowledged_at IS NULL
  AND first_seen > now() - interval '10 minutes'
ORDER BY escalation_level DESC, first_seen DESC;
```

**Quick fix (acknowledge all):**
```sql
UPDATE incidents
SET acknowledged_at = now()
WHERE acknowledged_at IS NULL;
```

### Guard never blocks (broken)

**Verify escalation worker is running:**
```bash
curl -s http://localhost:3000/ops/escalation/health | jq '.enabled, .lastTickAt'
```

**Check for escalated incidents:**
```sql
SELECT COUNT(*) 
FROM incidents 
WHERE escalation_level >= 1;
```

### GitHub Actions not calling guard

**Check workflow file:**
```bash
grep -A 10 "Release Guard" .github/workflows/deploy-canary.yml
```

**Verify staging URL is set:**
```bash
# In GitHub → Settings → Secrets → Actions
STAGING_URL = https://your-app.repl.co
```

## Success Criteria

✅ Guard blocks deployment when critical L1+ incidents exist
✅ Guard passes when no recent critical incidents
✅ Auto-rollback executes on guard failure
✅ guard.json artifact saved for debugging
✅ GitHub Actions workflow integrates guard correctly
✅ Deployment succeeds after resolving incidents

## Next Steps

Once Release Guard is verified:

1. **Tune thresholds** based on your incident patterns
2. **Add Slack notifications** on guard failures
3. **Monitor guard metrics** (block rate, false positives)
4. **Document override procedures** for emergencies
5. **Expand to production** when confident

## Related Documentation

- [Release Guard API Documentation](./RELEASE_GUARD.md)
- [Escalation Worker Operational Runbook](../replit.md#escalation-worker)
- [GitHub Actions Workflow](.github/workflows/deploy-canary.yml)
