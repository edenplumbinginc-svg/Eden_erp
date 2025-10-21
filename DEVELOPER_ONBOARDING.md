# Developer Onboarding

## 0) System Overview
- **Stack:** Node 20, Express, Drizzle (Postgres), Supabase IPv4 (TLS=relaxed by default)
- **Infra Layer:** Health checks (`/health`, `/healthz`), diagnostics (`/diag/db`), Sentry (optional), uptime monitor, post-deploy gate
- **Access Control:** RBAC (roles, permissions, role_permissions, user_roles) + route-level middleware

## 1) Prereqs
- Node 18+ (`node -v`)
- Postgres URL (Supabase) — set as `DATABASE_URL`
- Optional Sentry DSN — set as `SENTRY_DSN`

## 2) Environment
Create `.env` (or use your platform secrets):
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:pass@host:5432/db
DB_SSL_REJECT_UNAUTHORIZED=false

# optional
SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
HEALTHZ_URL=http://localhost:3000/healthz
```

## 3) Install & Run
```bash
npm i
npm run dev
# then visit: http://localhost:3000/healthz
```

## 4) Diagnostics & Health

- **Liveness:** `GET /healthz` → `{"status":"ok","db":"up","tls":"relaxed","latency_ms":...}`
- **Database:** `GET /diag/db` → connectivity + latency snapshot
- **Manual error (dev-only):** `GET /boom` (gated in production)

## 5) Monitoring Layer

**Sentry (optional):**
```bash
# add SENTRY_DSN secret, then:
npm run sentry:test   # emits a test event
```

**Uptime (60s ping):**
```bash
npm run uptime
```

**Post-deploy gate:**
```bash
npm run postdeploy
```

## 6) RBAC: Schema & Seeding

- Tables: `roles`, `permissions`, `role_permissions`, `user_roles`
- Seed baseline roles & permissions:
  ```bash
  npm run seed:rbac
  ```
- Verify:
  ```sql
  select count(*) from roles;          -- expect ≥ 7
  select count(*) from permissions;    -- expect 24
  select count(*) from role_permissions; 
  ```

## 7) Route Protection

- Permission code format: `<module>:<action>` (e.g., `projects:read`, `estimation:write`, `admin:manage`)
- Usage in routes:
  ```javascript
  const { requirePerm } = require("./middleware/permissions");
  router.get("/api/projects", authenticate, requirePerm("projects:read"), handler);
  ```
- Programmatic check:
  ```javascript
  const { hasPerm } = require("./middleware/permissions");
  if (await hasPerm(userId, "projects:write")) { /* allow edit */ }
  ```

## 8) Scripts (reference)

```json
{
  "scripts": {
    "dev": "node server.js",
    "uptime": "node scripts/ping-healthz.js",
    "postdeploy": "node scripts/postdeploy.mjs",
    "sentry:test": "node -e \"require('@sentry/node').captureMessage('SENTRY_SCRIPT_OK')\"",
    "seed:rbac": "node scripts/seed-rbac.mjs",
    "diag:db": "curl -sS http://localhost:3000/diag/db | jq"
  }
}
```

## 9) Graceful Lifecycle

- Server handles SIGTERM, closes HTTP server and DB pool cleanly to avoid zombie connections.

## 10) Common Errors

- **Missing/invalid `DATABASE_URL`:** app fails fast on boot (env validation).
- **TLS strict chain errors:** set `DB_SSL_REJECT_UNAUTHORIZED=false` (Supabase direct connection requirement).
- **403 vs 500:** 403 = missing permission; 500 = DB or unexpected error (surfaced to Sentry if enabled).

## 11) Conventions

- Commit style: `feat(scope): ...`, `fix(scope): ...`, `chore: ...`
- Branching: `main` (protected), PRs from `feature/*`, deploys gated by `postdeploy`
- Permission naming: keep human-readable and grep-friendly.

## 12) Quick Smoke Checklist

- [ ] `npm run dev` starts server
- [ ] `/healthz` returns 200
- [ ] `npm run seed:rbac` succeeds
- [ ] Protected route returns 403 without perm, 200 with perm
- [ ] `npm run uptime` logs `[UP] ...`
- [ ] `npm run postdeploy` prints "🚀 POST-DEPLOY GATE PASSED."
- [ ] (Optional) Sentry receives `SENTRY_SCRIPT_OK`

## 13) Authentication in Development

Use dev headers to simulate authenticated users:
```bash
curl -H "X-Dev-User-Email: test@edenplumbing.com" \
     -H "X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2" \
     http://localhost:3000/api/projects
```

## 14) Available Roles

| Slug | Name | Permissions |
|------|------|-------------|
| admin | Administrator | ALL (32 permissions) |
| ops | Operations | projects:read, projects:write |
| estimator | Estimator | estimation:read, estimation:write |
| procurement | Procurement | procurement:read, procurement:write |
| coord | Coordination | coord:read, coord:write |
| hr | HR | hr:read, hr:write |
| viewer | Read-Only Viewer | All :read permissions |

## 15) Key Documentation

- `RBAC_GUIDE.md` - Complete RBAC system documentation
- `PERMISSIONS_GUIDE.md` - Permission middleware usage
- `MONITORING_GUIDE.md` - Sentry, uptime, deploy gates
- `DIAGNOSTICS_GUIDE.md` - Database troubleshooting
- `INTEGRATIONS_GUIDE.md` - GitHub & Notion integration
- `replit.md` - Project architecture and preferences

## 16) Database Schema Management

- Using **Drizzle ORM** for schema definition (`drizzle/schema.ts`)
- Push schema changes: `npm run db:push` (or `npm run db:push --force` if needed)
- Never manually write SQL migrations - use Drizzle
- Current database: Supabase PostgreSQL (direct connection, IPv4)

## 17) Troubleshooting

**Server won't start:**
- Check `DATABASE_URL` is set correctly
- Verify database is accessible: `npm run diag:db`
- Check Backend workflow logs in Console

**Permission denied (403):**
- Verify user has correct role assigned
- Check role has the required permission
- Confirm permission code matches exactly (e.g., `projects:read`)

**Database connection errors:**
- Ensure `DB_SSL_REJECT_UNAUTHORIZED=false` is set
- Run diagnostics: `curl http://localhost:3000/diag/db`
- Check Supabase database is running

**Health check fails:**
- Backend workflow not running
- Database not accessible
- Port 3000 in use by another process
