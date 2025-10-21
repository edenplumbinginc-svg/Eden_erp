# 🔍 Database Diagnostics Guide

## Overview

Your ERP system now has comprehensive database diagnostics that help you debug connection issues in **minutes** instead of **hours or days**.

**What this prevents:** 
- "Where the hell is the problem?" debugging sessions
- Multi-day hunts through logs
- Confusion about DNS, TLS, IP family, or credentials

**What you get:**
- One-line answer to "Why can't I connect to the database?"
- Clear visibility into connection attempts, retries, and failures
- Instant diagnosis of DNS/IP/TLS/latency/credential issues

---

## 🚀 Quick Start

### Check Database Health Right Now

```bash
npm run diag:db
```

**What you'll see:**
```json
{
  "status": "up",
  "latency_ms": 220,
  "connection": {
    "host": "db.jwehjdggkskmjrmoqibk.supabase.co",
    "port": "5432"
  },
  "resolved_ips": {
    "ipv4": ["3.150.244.156"],
    "ipv6": []
  },
  "database": {
    "postgres_version": "PostgreSQL 17.6",
    "server_ip": "10.165.161.101"
  }
}
```

---

## 🛠️ Available Diagnostic Tools

### 1. `/diag/db` Endpoint - Comprehensive Diagnostics

**What it does:** Returns everything you need to know about your database connection in one API call.

**How to use:**
```bash
# Pretty formatted output
npm run diag:db

# Raw JSON output
curl http://localhost:3000/diag/db

# From browser
http://localhost:3000/diag/db
```

**What it tells you:**

| Field | What It Means | When To Check |
|-------|---------------|---------------|
| `status` | "up" or "down" | First thing - is DB reachable? |
| `latency_ms` | How long the connection took | Slow queries? Check this |
| `resolved_ips.ipv4` | IPv4 addresses for DB host | DNS problems? Check this |
| `resolved_ips.ipv6` | IPv6 addresses (if available) | IPv6 issues? Check this |
| `config.tls_mode` | TLS/SSL configuration | Certificate errors? Check this |
| `database.postgres_version` | Database version | Compatibility issues? Check this |
| `error` | Error message if status is "down" | Something broken? Read this |

---

### 2. Startup Retry/Backoff Logic

**What it does:** Automatically retries database connections on startup with exponential backoff.

**How it works (Exponential Backoff):**
- Attempt 1: Immediate connection
- Attempt 2: Wait 500ms (2^0 × 500ms), retry
- Attempt 3: Wait 1000ms (2^1 × 500ms), retry
- Attempt 4: Wait 2000ms (2^2 × 500ms), retry
- Attempt 5: Wait 4000ms (2^3 × 500ms), retry
- **If all fail:** Application starts in "degraded mode" (no DB)

*Note: Delays double each attempt (exponential backoff) to prevent hammering a struggling database, capped at 5 seconds maximum.*

**What you'll see in logs:**

**Success on first attempt:**
```
✅ Database connection established { attempt: 1, max_attempts: 5 }
✅ Database connected (17 tables found)
```

**Retry scenario:**
```
⚠️ Database connection attempt failed { attempt: 1, retry_in_ms: 500, error: "connection timeout" }
⚠️ Database connection attempt failed { attempt: 2, retry_in_ms: 1000, error: "connection timeout" }
✅ Database connection established { attempt: 3, max_attempts: 5 }
```

---

### 3. Other Health Endpoints

| Endpoint | Purpose | When To Use |
|----------|---------|-------------|
| `/health` | Simple "ok" check | Quick ping, load balancers |
| `/healthz` | DB connection with TLS info | Deployment health checks |
| `/db/ping` | Simple DB query test | Just test DB, nothing else |
| `/diag/db` | **Full diagnostics** | **Debugging connection issues** |

---

## 🐛 Troubleshooting Common Issues

### Issue: "status": "down"

**What to check:**
1. Look at the `error` field in the response
2. Check if `resolved_ips.ipv4` is empty (DNS problem)
3. Check `config.tls_mode` vs actual requirements
4. Verify DATABASE_URL is set correctly

**Example:**
```json
{
  "status": "down",
  "error": {
    "message": "self-signed certificate in certificate chain",
    "code": "DEPTH_ZERO_SELF_SIGNED_CERT"
  }
}
```

**Solution:** Set `DB_SSL_REJECT_UNAUTHORIZED=false` in your environment.

---

### Issue: High `latency_ms` (> 1000ms)

**What it means:** Database is slow or far away

**What to check:**
1. Is your database in a different region? (Check `connection.host`)
2. Is your database overloaded? (Check Supabase dashboard)
3. Network issues? (Try from different location)

---

### Issue: `resolved_ips` shows empty arrays

**What it means:** DNS cannot resolve your database hostname

**What to check:**
1. Is `connection.host` correct?
2. Is your network blocking DNS?
3. Is the database hostname valid?

**Example:**
```json
{
  "resolved_ips": {
    "host": "wrong-host.supabase.co",
    "ipv4": [],
    "ipv6": [],
    "ipv4_error": "ENOTFOUND",
    "ipv6_error": "ENOTFOUND"
  }
}
```

**Solution:** Fix your DATABASE_URL in Replit Secrets.

---

### Issue: Application Won't Start

**What happens:**
- Old behavior: App crashes immediately with no clear error
- **New behavior:** App retries 5 times with exponential backoff, then starts in degraded mode

**What you'll see:**
```
⚠️ Database connection attempt failed { attempt: 1, retry_in_ms: 500, error: "..." }
⚠️ Database connection attempt failed { attempt: 2, retry_in_ms: 1000, error: "..." }
⚠️ Database connection attempt failed { attempt: 3, retry_in_ms: 1500, error: "..." }
⚠️ Database connection attempt failed { attempt: 4, retry_in_ms: 2000, error: "..." }
⚠️ Database connection attempt failed { attempt: 5, retry_in_ms: 2500, error: "..." }
❌ Database connection failed after all retry attempts
⚠️ Application will start in degraded mode. Database operations will fail.
```

**What to do:**
1. Check the error messages in the logs
2. Run `npm run diag:db` (if server started)
3. Fix the root cause (credentials, network, etc.)
4. Restart the application

---

## 📊 Understanding the Full Diagnostic Output

Here's a complete breakdown of what each field means:

```json
{
  "timestamp": "2025-10-21T05:10:48.119Z",          // When this diagnostic ran
  "status": "up",                                    // "up" or "down"
  "latency_ms": 220,                                 // How long it took to connect
  
  "config": {
    "node_env": "development",                       // Environment (development/production)
    "tls_mode": "prefer",                           // TLS mode (prefer/require/disable)
    "db_ssl_reject_unauthorized": "false",          // Allow self-signed certs?
    "health_tls_relax": "1",                        // Relaxed TLS for health checks?
    "ip_family_pref": "auto"                        // IPv4/IPv6 preference
  },
  
  "connection": {
    "host": "db.jwehjdggkskmjrmoqibk.supabase.co", // Database hostname
    "port": "5432",                                 // Database port
    "database": "postgres",                         // Database name
    "user": "postgres"                              // Database user
  },
  
  "resolved_ips": {
    "host": "db.jwehjdggkskmjrmoqibk.supabase.co",
    "ipv4": ["3.150.244.156"],                      // Resolved IPv4 addresses
    "ipv6": [],                                      // Resolved IPv6 addresses
    "ipv6_error": "ENODATA"                         // Why IPv6 failed (expected)
  },
  
  "database": {
    "database": "postgres",                          // Database name (confirmed)
    "schema": "public",                              // Active schema
    "server_ip": "10.165.161.101",                  // Database server's IP
    "postgres_version": "PostgreSQL 17.6...",       // Postgres version
    "server_time": "2025-10-21T05:10:48.296Z"       // Database server time
  },
  
  "error": null                                      // Error details if status is "down"
}
```

---

## 💡 Why This Matters

### Before (October 20, 2025)
**Problem:** Database won't connect  
**Debug process:**
1. Check logs - nothing clear
2. Try different DATABASE_URL values
3. Google error messages
4. Try different TLS settings
5. Ask Replit Agent for help
6. Spend 1-2 days troubleshooting

**Result:** Lost time, frustration

### After (October 21, 2025)
**Problem:** Database won't connect  
**Debug process:**
1. Run `npm run diag:db`
2. See: "ipv6_error: ENOTFOUND, ipv4: []"
3. Realize: DNS can't resolve hostname
4. Check DATABASE_URL - typo found
5. Fix it, restart

**Result:** 5 minutes, problem solved

---

## 🎯 When To Use Each Tool

| Scenario | Use This | Why |
|----------|----------|-----|
| "Is my app alive?" | `curl /health` | Fastest, simplest check |
| "Can my app reach the DB?" | `curl /healthz` | Includes DB ping + TLS info |
| "Why can't I connect?" | `npm run diag:db` | **Full diagnostic report** |
| "App won't start" | Check console logs | Retry/backoff logs show attempts |
| "Slow queries" | `npm run diag:db` → check `latency_ms` | See if it's network or DB |

---

## 🔄 Integration with Your Workflow

### During Development
```bash
# Start your app
npm run dev

# Check if everything is working
npm run diag:db
```

### Before Deploying
```bash
# Run post-deploy checks
npm run postdeploy

# Verify DB connectivity
npm run diag:db
```

### When Debugging
```bash
# Something broke - get full diagnostics
npm run diag:db

# Check backend logs
# Click "Console" → Select "Backend" workflow
```

---

## 📚 Related Documentation

- **Main Integration Guide:** `INTEGRATIONS_GUIDE.md`
- **Database Configuration:** `lib/config-db.js`
- **Health Endpoints:** `routes/healthz.js`, `routes/health.js`
- **Database Service:** `services/database.js`
- **Diagnostics Service:** `services/db-diagnostics.js`

---

## 🆘 Still Stuck?

If diagnostics don't help you solve the problem:

1. **Run diagnostics and save output:**
   ```bash
   npm run diag:db > diagnostics.json
   ```

2. **Check backend logs:**
   - Replit Console → Backend workflow
   - Look for retry attempts and error messages

3. **Tell Replit Agent:**
   - "I ran diagnostics and got [paste output]"
   - "Here's what I'm seeing in logs: [paste logs]"
   - Agent will help you fix it!

---

*Last Updated: October 21, 2025*
*This diagnostic pack prevents multi-day debugging sessions by giving you instant visibility into database connectivity issues.*
