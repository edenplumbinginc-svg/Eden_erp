# Release Guard - CI/CD Deployment Gating

## Overview

The Release Guard endpoint (`/ops/release-guard`) provides automated deployment gating in CI/CD pipelines. It blocks deployments when critical incidents are detected, preventing bad releases from reaching production.

## How It Works

### Deployment Flow

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   Test   │
    └────┬─────┘
         │
    ┌────▼─────┐
    │  Build   │
    └────┬─────┘
         │
┌────────▼──────────┐
│ Deploy Canary 10% │
└────────┬──────────┘
         │
    ┌────▼─────────────┐
    │  Smoke Tests     │
    └────┬─────────────┘
         │
┌────────▼───────────────┐
│  🛡️ RELEASE GUARD     │◄── GATE HERE
│                        │
│  Check for:            │
│  - Active incidents    │
│  - Escalation level ≥1 │
│  - Critical severity   │
│  - Within 10min window │
└────────┬───────────────┘
         │
         ├─ HTTP 200 ─────► ✅ PASS → Promote to 100%
         │
         └─ HTTP 503 ─────► ❌ BLOCK → Auto-rollback
```

## Endpoint Specification

### Request

```bash
GET /ops/release-guard
```

**Headers:**
```
X-Guard-Lookback-Min: 10          # Only check incidents from last N minutes
X-Guard-Min-Esc-Level: 1          # Block if escalation_level >= N
X-Guard-Include-Warning: false    # Include 'warning' severity (default: false)
```

### Response

**HTTP 200 - PASS (Safe to Deploy)**
```json
{
  "service": "eden-erp-backend",
  "env": "production",
  "pass": true,
  "violations": []
}
```

**HTTP 503 - BLOCK (Deployment Blocked)**
```json
{
  "service": "eden-erp-backend",
  "env": "production",
  "pass": false,
  "violations": [
    {
      "reason": "error_rate_critical",
      "route": "GET /api/tasks",
      "evidence": {
        "err_rate_1m": 100,
        "samples_1m": 42
      }
    },
    {
      "reason": "slo_violation",
      "route": "GET /api/projects",
      "evidence": {
        "actual": { "p95_ms": 1500, "err_pct": 25 },
        "targets": { "p95_ms": 300, "err_pct": 1 }
      }
    }
  ]
}
```

## GitHub Actions Integration

### Complete Workflow

See `.github/workflows/deploy-canary.yml` for the full implementation.

**Key Steps:**

```yaml
# 1. Smoke tests pass
- name: Smoke test
  run: curl -f "${{ env.STAGING_URL }}/health"

# 2. Release Guard check
- name: Release Guard
  id: release-guard
  run: |
    code=$(curl -s -o guard.json -w "%{http_code}" \
      -H "X-Guard-Lookback-Min: 10" \
      -H "X-Guard-Min-Esc-Level: 1" \
      "${{ env.STAGING_URL }}/ops/release-guard")
    
    if [ "$code" = "200" ]; then
      echo "✅ Release Guard PASSED"
      exit 0
    else
      echo "❌ Release Guard BLOCKED"
      exit 1
    fi

# 3. Auto-rollback on failure
- name: Auto-rollback on guard fail
  if: failure() && steps.release-guard.outcome == 'failure'
  run: |
    echo "🔄 Rolling back canary..."
    ./scripts/rollback-staging.sh
    exit 1
```

## Testing the Guard

### Test 1: Verify Blocking Behavior

Create a critical incident with escalation:

```sql
UPDATE incidents
SET status='open',
    acknowledged_at=NULL,
    severity='critical',
    escalation_level=1,
    first_seen=now() - interval '6 minutes'
WHERE id IN (SELECT id FROM incidents ORDER BY random() LIMIT 1);
```

Call Release Guard:

```bash
curl -s -H "X-Guard-Lookback-Min: 10" \
        -H "X-Guard-Min-Esc-Level: 1" \
        http://localhost:3000/ops/release-guard
```

**Expected:** HTTP 503 with violations listed

### Test 2: Verify Pass Behavior

Acknowledge all blocking incidents:

```sql
UPDATE incidents
SET acknowledged_at = now()
WHERE acknowledged_at IS NULL
  AND escalation_level >= 1
  AND severity = 'critical'
  AND first_seen > now() - interval '10 minutes';
```

Call Release Guard again:

```bash
curl -s -H "X-Guard-Lookback-Min: 10" \
        -H "X-Guard-Min-Esc-Level: 1" \
        http://localhost:3000/ops/release-guard
```

**Expected:** HTTP 200 with `"pass": true`

## Configuration

### Guard Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `GUARD_LOOKBACK_MIN` | 10 | Only check incidents started in last N minutes |
| `GUARD_MIN_ESC_LEVEL` | 1 | Block if escalation level >= N |
| `GUARD_INCLUDE_WARNING` | false | Include 'warning' severity incidents |

### Tuning Recommendations

**Strict (Recommended for Production)**
```
GUARD_LOOKBACK_MIN: 10
GUARD_MIN_ESC_LEVEL: 1
GUARD_INCLUDE_WARNING: false
```

**Moderate (Staging/QA)**
```
GUARD_LOOKBACK_MIN: 15
GUARD_MIN_ESC_LEVEL: 2
GUARD_INCLUDE_WARNING: false
```

**Permissive (Development)**
```
GUARD_LOOKBACK_MIN: 5
GUARD_MIN_ESC_LEVEL: 3
GUARD_INCLUDE_WARNING: true
```

## Operational Procedures

### Scenario 1: Blocked Deployment

**What happens:**
1. CI/CD calls Release Guard
2. Returns HTTP 503 (blocking)
3. Auto-rollback executes
4. Deployment fails with clear message

**Resolution:**
1. Check `guard.json` artifact in failed workflow
2. Review incidents in Velocity Dashboard
3. Fix root cause or acknowledge false positives
4. Re-run workflow

### Scenario 2: Emergency Override

If you need to bypass the guard (NOT RECOMMENDED):

```yaml
# Option 1: Skip guard step temporarily
- name: Release Guard
  if: github.event.inputs.skip_guard != 'true'
  run: ...

# Option 2: Use manual approval
- name: Release Guard
  continue-on-error: true  # Allow manual review
  run: ...
```

### Scenario 3: False Positive

If guard blocks on non-critical issues:

1. **Short-term:** Acknowledge the incident to unblock
2. **Long-term:** Tune guard parameters or fix monitoring thresholds

## Monitoring

### Metrics to Track

- **Guard block rate**: How often deployments are blocked
- **False positive rate**: Blocked deployments that were actually safe
- **Missed incidents**: Bad deployments that passed the guard

### Alerts

Set up alerts for:
- Guard blocking rate > 50% (may indicate systemic issues)
- Guard never blocks for 7+ days (may indicate guard is broken)

## Integration with Escalation Worker

The Release Guard works in conjunction with the escalation worker:

```
Incident Created
    ↓
Escalation Worker Ticks
    ↓
Escalation Level Increases
    ↓
Release Guard Detects High-Level Incidents
    ↓
Deployment Blocked
```

This creates a feedback loop where operational issues automatically prevent new deployments until resolved.

## Troubleshooting

### Guard always blocks

**Cause:** Persistent incidents or monitoring issues

**Fix:**
```sql
-- Check current blocking incidents
SELECT incident_key, severity, escalation_level, first_seen
FROM incidents
WHERE acknowledged_at IS NULL
  AND escalation_level >= 1
  AND first_seen > now() - interval '10 minutes';
```

### Guard never blocks

**Cause:** Incidents not escalating, or guard not called

**Fix:**
1. Check `/ops/escalation/health` - verify worker is enabled
2. Check CI/CD logs - verify guard step is executed
3. Review incident escalation levels

### Guard returns 500

**Cause:** Database connectivity or configuration issue

**Fix:**
1. Check backend logs for errors
2. Verify `DATABASE_URL` is set
3. Test `/health` endpoint

## Best Practices

1. **Always run Release Guard** after smoke tests but before promotion
2. **Store guard.json** as an artifact for debugging
3. **Auto-rollback on failure** to prevent partial deployments
4. **Monitor guard metrics** to tune thresholds
5. **Review blocked deployments** to improve reliability

## Security

The Release Guard endpoint:
- ✅ Public read-only (no sensitive data exposed)
- ✅ No authentication required (safe to call from CI/CD)
- ✅ Rate-limited to prevent abuse
- ❌ No write operations (cannot modify incidents)

## Related Documentation

- [Escalation Worker - Operational Runbook](../replit.md#escalation-worker)
- [Velocity Metrics Dashboard](../replit.md#velocity-metrics)
- [Incident Management](../replit.md#incident-management)
