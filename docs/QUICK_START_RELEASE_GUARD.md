# Release Guard - Quick Start Guide

## What is Release Guard?

Release Guard is a **CI/CD safety gate** that automatically blocks deployments when critical production incidents are active, preventing bad releases from reaching production.

## How It Works (30-Second Overview)

```
Push Code → Tests → Build → Deploy Canary → 🛡️ Release Guard
                                                    ↓
                                        ┌───────────┴──────────┐
                                        │                      │
                                   HTTP 200                HTTP 503
                                  (No Issues)           (Critical Incident)
                                        │                      │
                                        ↓                      ↓
                               ✅ Promote to Prod      ❌ Auto-Rollback
```

## Files Created

1. **`.github/workflows/deploy-canary.yml`** - GitHub Actions workflow with guard integration
2. **`scripts/rollback-staging.sh`** - Auto-rollback script
3. **`docs/RELEASE_GUARD.md`** - Complete API documentation
4. **`docs/TESTING_RELEASE_GUARD.md`** - Testing procedures

## Test It Right Now (5 Minutes)

### 1. Create Blocking Incident

```bash
psql "$DATABASE_URL" -c "
UPDATE incidents
SET status='open', acknowledged_at=NULL, severity='critical', 
    escalation_level=1, first_seen=now() - interval '6 minutes'
WHERE id IN (SELECT id FROM incidents ORDER BY random() LIMIT 1);"
```

### 2. Check Release Guard

```bash
curl -s -w "\nHTTP: %{http_code}\n" \
  -H "X-Guard-Lookback-Min: 10" \
  -H "X-Guard-Min-Esc-Level: 1" \
  "http://localhost:3000/ops/release-guard"
```

**Expected:** HTTP 503 (BLOCKED)

### 3. Resolve Incident

```bash
psql "$DATABASE_URL" -c "
UPDATE incidents SET acknowledged_at=now() 
WHERE acknowledged_at IS NULL AND escalation_level >= 1;"
```

### 4. Check Again

```bash
curl -s -w "\nHTTP: %{http_code}\n" \
  -H "X-Guard-Lookback-Min: 10" \
  -H "X-Guard-Min-Esc-Level: 1" \
  "http://localhost:3000/ops/release-guard"
```

**Expected:** HTTP 200 (PASS)

## GitHub Actions Integration

Your workflow is ready at `.github/workflows/deploy-canary.yml`

**To activate:**

1. Add staging URL to GitHub secrets:
   ```
   GitHub → Settings → Secrets → Actions
   Name: STAGING_URL
   Value: https://your-app.repl.co
   ```

2. Push to main:
   ```bash
   git add .
   git commit -m "Add Release Guard CI/CD gate"
   git push origin main
   ```

3. Watch the workflow:
   ```
   GitHub → Actions → "Canary Deployment with Release Guard"
   ```

## Configuration

Edit workflow headers in `deploy-canary.yml`:

```yaml
env:
  GUARD_LOOKBACK_MIN: "10"      # Check last 10 minutes
  GUARD_MIN_ESC_LEVEL: "1"      # Block if level ≥ 1
  GUARD_INCLUDE_WARNING: "false" # Critical only
```

## Current Status

✅ **Release Guard Endpoint:** Working (`/ops/release-guard`)
✅ **Escalation Worker:** Enabled in DRY_RUN mode (10% canary)
✅ **GitHub Workflow:** Created and ready
✅ **Auto-Rollback:** Script ready at `scripts/rollback-staging.sh`
✅ **Documentation:** Complete in `docs/` folder

## Next Steps

1. **Test locally** (5 min) - Use commands above
2. **Set GitHub secret** - Add `STAGING_URL`
3. **Push to trigger workflow** - Watch it run
4. **Monitor metrics** - Track block rate
5. **Tune thresholds** - Adjust as needed

## Emergency Override

If you need to bypass the guard (NOT recommended):

```yaml
# In deploy-canary.yml, add:
- name: Release Guard
  if: github.event.inputs.skip_guard != 'true'  # Add this line
  run: ...
```

Then trigger with:
```bash
# GitHub UI → Actions → Run workflow → Check "skip_guard"
```

## Support

- **Full Docs:** `docs/RELEASE_GUARD.md`
- **Testing Guide:** `docs/TESTING_RELEASE_GUARD.md`
- **Escalation Runbook:** `replit.md` (search "Escalation Worker")

## Key Metrics to Watch

- **Guard Block Rate:** How often deploys are blocked
- **False Positives:** Blocks on safe deploys  
- **Missed Incidents:** Bad deploys that passed

Set up alerts when block rate > 50% or = 0% for 7+ days.
