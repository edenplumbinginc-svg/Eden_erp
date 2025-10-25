# Velocity Metrics Fix - 4xx Response Handling

## 🐛 Issue

**Problem:** Release Guard was incorrectly blocking deployments due to "100% error rates" on endpoints returning expected 4xx responses (401, 403, 404).

**Root Cause:** Velocity metrics were treating ALL non-2xx/3xx responses as errors, including client errors (4xx) which are expected and valid responses.

**Impact:**
- `/api/notifications/recent` returning 401 (unauthenticated) → counted as error ❌
- `/api/me/permissions` returning 401 (unauthenticated) → counted as error ❌
- Release Guard blocking deployments unnecessarily ❌

---

## ✅ Fix

**File:** `server.js` line 178

**Change:**
```javascript
// Before (incorrect - counts 4xx as errors)
const ok = res.statusCode < 400;

// After (correct - only counts 5xx as errors)
const ok = res.statusCode < 500;
```

**Reasoning:**
- **2xx-3xx**: Success responses
- **4xx**: Client errors (expected - bad request, unauthorized, not found, etc.)
- **5xx**: Server errors (actual failures that should trigger alarms)

---

## 📊 Status Code Classification

### NOT Errors (Expected Responses)
- `200` OK
- `201` Created
- `204` No Content
- `301/302` Redirects
- `304` Not Modified
- `400` Bad Request (client error)
- `401` Unauthorized (client needs to authenticate)
- `403` Forbidden (client lacks permission)
- `404` Not Found (resource doesn't exist)
- `409` Conflict (client request conflicts with current state)
- `422` Unprocessable Entity (validation failed)
- `429` Too Many Requests (rate limit)

### ARE Errors (Server Failures)
- `500` Internal Server Error
- `501` Not Implemented
- `502` Bad Gateway
- `503` Service Unavailable
- `504` Gateway Timeout

---

## 🧪 Verification

### Before Fix
```json
{
  "route": "GET /notifications/recent",
  "kind": "error_rate",
  "severity": "critical",
  "evidence": {
    "err_rate_1m": 81.82,
    "samples_1m": 11
  }
}
```

Release Guard: **HTTP 503** (BLOCKING) ❌

### After Fix
```json
{
  "alarms_count": 0,
  "critical_count": 0,
  "warning_count": 0,
  "routes_with_issues": []
}
```

Release Guard: **HTTP 200** (PASSING) ✅

---

## 📈 Impact Metrics

**Test Case:** 16 consecutive 401 responses to `/api/notifications/recent`

**Before Fix:**
- Error rate: 100%
- Alarms triggered: error_rate_critical, slo_violation
- Release Guard: BLOCKED

**After Fix:**
- Error rate: 0%
- Alarms triggered: none
- Release Guard: PASS

---

## 🔍 Technical Details

### Metrics Tracking

The velocity metrics system tracks requests in `server.js` via an Express middleware:

```javascript
// Middleware tracks after response
app.use((req, res, next) => {
  res.on('finish', () => {
    const ok = res.statusCode < 500; // Fixed: only 5xx are errors
    const durationMs = Date.now() - req._startTime;
    
    metrics.record(req, {
      ok,             // true for 2xx/3xx/4xx, false for 5xx
      durationMs,
      statusCode: res.statusCode
    });
  });
  next();
});
```

### Error Rate Calculation

```javascript
// In lib/metrics.js
const errRate = (errors / total) * 100;

// Alarms triggered when:
// - error_rate >= 50% (critical)
// - error_rate >= 10% (warning)
```

With the fix:
- 401/403/404 → `ok: true` → NOT counted in errors
- 500/502/503 → `ok: false` → counted in errors

---

## 🎯 SLO Impact

### Before Fix (Incorrect)
```
Target: error_pct < 1%
Actual: error_pct = 81.82% (11 × 401 responses)
Result: SLO VIOLATION ❌
```

### After Fix (Correct)
```
Target: error_pct < 1%
Actual: error_pct = 0% (401 responses not counted)
Result: SLO COMPLIANT ✅
```

---

## 🚀 Deployment Impact

### CI/CD Pipeline

**Before:** Release Guard blocks promotion on every 401/403 response
```bash
curl http://staging/ops/release-guard
→ HTTP 503 (violations: 6)
→ Deployment BLOCKED ❌
```

**After:** Release Guard only blocks on real server errors
```bash
curl http://staging/ops/release-guard
→ HTTP 200 (violations: 0)
→ Deployment ALLOWED ✅
```

---

## 📝 Related Endpoints

This fix impacts all endpoints that may return 4xx responses:

**Authentication Required:**
- `POST /api/tasks` → 401 if no auth
- `GET /api/projects` → 401 if no auth
- `GET /api/me/permissions` → 401 if no auth
- `GET /api/notifications/recent` → 401 if no auth

**Authorization Required:**
- `DELETE /api/tasks/:id` → 403 if insufficient permissions
- `POST /api/admin/*` → 403 if not admin

**Validation Failures:**
- `POST /api/tasks` → 400 if invalid payload
- `PUT /api/projects/:id` → 422 if validation fails

**Resource Not Found:**
- `GET /api/tasks/:id` → 404 if task doesn't exist
- `GET /api/projects/:id` → 404 if project doesn't exist

All of these responses are now correctly treated as **valid responses**, not errors.

---

## ✅ Verification Steps

To verify the fix is working:

### 1. Generate 4xx Responses
```bash
# Generate 401 responses (no auth)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:3000/api/notifications/recent
done
```

### 2. Check Error Rate
```bash
# Should show 0% error rate
curl -s http://localhost:3000/ops/alarms | \
  jq '.alarms[] | select(.route == "GET /notifications/recent")'
```

Expected: No alarms

### 3. Check Release Guard
```bash
curl -s http://localhost:3000/ops/release-guard | jq '.pass'
```

Expected: `true`

---

## 🎓 Key Takeaways

1. **4xx ≠ Errors**: Client errors (400-499) are expected responses, not server failures
2. **5xx = Errors**: Server errors (500-599) indicate actual system problems
3. **SLO Definitions Matter**: Define what counts as an "error" carefully to avoid false alarms
4. **Release Guard Logic**: Should only block on real server failures (5xx), not client errors (4xx)

---

## 📚 References

- [HTTP Status Codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- RFC 7231: HTTP/1.1 Semantics and Content
- SRE Book: Monitoring Distributed Systems

---

**Date:** 2025-10-25  
**Fix Applied:** server.js line 178  
**Verified:** Release Guard passing, zero false alarms  
**Status:** ✅ PRODUCTION READY
