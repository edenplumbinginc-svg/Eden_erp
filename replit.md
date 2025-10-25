# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell for Eden Plumbing Inc., designed to streamline business operations, starting with coordination and procurement. It provides a robust backend with a defined database schema and a basic REST API, serving as a scalable platform for future application modules to efficiently manage projects, tasks, and resources. The business vision is to provide a comprehensive, scalable platform that integrates various operational aspects, improving efficiency and coordination.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with Vite, styled with 100% Google Material Design and custom CSS, emulating a professional Google Workspace aesthetic. This includes a specific color palette, typography (Roboto), an 8px spacing grid, a 4-level elevation system, and smooth transitions. A `DevAuthSwitcher` is implemented for development-time user role switching. API integration is handled via an Axios-based client. The project follows a monorepo structure with the frontend in `apps/coordination_ui/`.

### Technical Implementations
The backend is built with Express.js, Node.js 20, and uses Supabase PostgreSQL with Drizzle ORM. Authentication relies on Supabase Auth with JWT verification and a comprehensive RBAC system (four roles, 35+ permissions) enforced via middleware and a permission-aware UI. A five-layer performance optimization stack includes localStorage caching, ETag-based conditional requests, warm-boot preloading, and a delta sync mechanism. A "realtime-lite" change beacon system uses polling. Middleware handles Zod schema validation, rate limiting, audit logs, and idempotency. The system includes an in-app notification system, user preferences, automated overdue/idle task tracking, and auto-completion of parent tasks. The architecture supports future AI-powered task creation.

Core modules include `coordination` (projects, tasks, comments, attachments) and `procurement`. The API provides CRUD operations for Projects and Tasks, nested task creation, comment management, and specialized reporting with server-side filtering, pagination, and sorting. A unified task creation interface is available. Reporting features include dashboard cards and a performance leaderboard with CSV export. A guest view offers public read-only access. A complete department ball handoff workflow is implemented with an audit trail and notifications. An Admin RBAC UI (`/admin/rbac`) provides user management.

**Task Checklists**: A full-featured checklist system with RBAC-protected endpoints, Material Design UI, drag-and-drop reordering, optimistic updates, and 20-second delta sync. Performance metrics are captured upon completion.

**Performance Events & API**: A micro-telemetry system logs completion metrics for "who finishes fast" analytics. Read-only REST endpoints (`/api/perf/*`) expose performance metrics (top performers, department rankings, user's recent completions) for UI consumption.

**Performance Leaderboard UI**: A Material Design leaderboard page at `/leaderboard` consumes Performance API endpoints, displaying top performers, department rankings, and personal performance. It features auto-refreshing data and integrates gamification elements like badges for fast completions.

**Auto-Decisions v0 (Safe Rules Engine)**: An automated low-risk decision engine runs every 5 minutes, evaluating policies stored in `decision_policies`. All executions are logged for auditability. Ships with four safe policies (in DRY_RUN by default): auto-handoff, idle task escalation, speed badges, and unacknowledged handoff SLA escalation. An Admin API (`/api/admin/decisions/*`) provides policy management.

**Ball-in-Court Analytics**: A comprehensive handoff tracking and bottleneck analysis system using `ball_in_court_events` and SQL views. A REST API (`/api/perf/court-flow`) exposes 30-day metrics. UI components include a Responsibility Chain panel, a Court Flow Dashboard (`/admin/court-flow`) with visualizations, and a Task-level SLA Banner with warnings and nudge reminders.

**Monitoring & Observability**: A production-grade observability stack with Sentry for error monitoring (backend/frontend with distributed tracing and session replay), Pino for structured JSON logging (with correlation IDs and sensitive data redaction), robust health probes (`/ops/live`, `/ops/ready`, `/ops/health`), and auto-restart resilience guards. A startup gate prevents server listening until the DB is reachable. Watchdog checks health periodically. Velocity Metrics provide lightweight per-route telemetry (`/ops/metrics`, `/ops/metrics/trends`) with rolling windows, exposed via a real-time Velocity Dashboard UI (`/velocity`) which includes p95 regression detection and Sentry correlation for deep linking. Machine-Readable Alarms (`/ops/alarms`) provide automated detection of operational issues with three rules: Rule A (high error rates ≥5% with ≥5 samples), Rule B (p95 latency regressions ≥20% AND ≥30ms), and Rule C (SLO violations when routes enter critical state). All rules output structured JSON with evidence and remediation hints, backed by comprehensive unit tests. Route Owners & Targeted Alerts enable ownership-based monitoring via `ROUTE_OWNERS` environment variable (JSON), tagging each alarm with an owner and optionally routing alerts to route-specific Slack webhooks; owners are displayed in both Slack messages and the Velocity Dashboard alerts drawer for reduced mean-time-to-action. Live Alert Overlay integrated into Velocity Dashboard polls `/ops/alarms` every 10s, displays global alert status bar, shows per-row alert badges (warning/critical) with severity-based color coding, and provides slide-out drawer with detailed alert information, owner attribution, evidence metrics, Sentry deep links, and remediation hints for real-time operational visibility. Slack Alerter polls `/ops/alarms` every 30s and sends formatted Slack messages for critical-severity alarms with 5-minute deduplication per route+kind (enabled via `SLACK_VELOCITY_WEBHOOK`); routes with dedicated `slack_webhook` in their owner config receive individual messages to their specific channel, while routes without overrides batch to the global webhook. Slack messages include owner attribution and one-click "View in Sentry →" buttons (when `SENTRY_ORG_SLUG` and `SENTRY_PROJECT_SLUG` are configured) that deep-link directly to filtered error traces for each alarmed route, with graceful fallback when secrets are missing. Historical Metrics Persistence snapshots 1-minute KPIs to the `velocity_metrics` Postgres table every 30 seconds with 14-day retention, providing time-series data for regression analysis via `/ops/metrics/history` API. Release Impact API (`/ops/release-impact`) compares current vs previous release performance per route (p95 latency, RPS, error rate) over a configurable time window (5-240 minutes), providing instant visibility into deployment impact with absolute and percentage deltas. Release Impact UI displays deployment performance deltas directly in the Velocity Dashboard with color-coded badges (green for improvements, red for regressions) for p95 latency and error rate changes, updating every 60 seconds. SLO Evaluation API (`/ops/slo`) evaluates each route against configurable service level objectives (default: 300ms p95, 1% error rate) with three-tier classification (ok/warn/critical), supporting global defaults and per-route overrides via environment variables. SLO Badges UI on Velocity Dashboard displays real-time 🟢/🟡/🔴 badges per route with hover tooltips showing actuals vs targets, updating every 10 seconds. Release Guard API (`/ops/release-guard`) provides automated deploy safety validation that returns HTTP 200/503 based on current alarms (fails on slo_violation or error_rate critical), with configurable parameters for warning tolerance, regression checking, minimum sample thresholds, and hard error limits, enabling CI/CD pipelines to automatically block or rollback deployments that violate SLOs or have critical errors via the included `scripts/ci-release-guard.sh` script. Release Guard UI widget on Velocity Dashboard polls `//ops/release-guard` every 30 seconds and displays a prominent PASS/FAIL banner (green for safe deploys, red for violations) with release SHA and policy parameters; clicking "Details" opens a drawer showing full policy configuration, violations count, and per-route violation details with evidence JSON and Sentry deep links for instant investigation. Incident Management uses the `incidents` table to correlate alarms across time, track acknowledgment and escalation state, and support timed escalation workflows; incidents are keyed by `route::kind` and persist lifecycle metadata (first_seen, last_seen, status, owner snapshot, escalation_level). Incident correlation automatically creates/updates incident records for each alarm via `lib/incidents.js`, enabling durable incident tracking with transactional upserts, severity escalation (warning→critical), and metadata aggregation (lastEvidence, lastHint, sentryUrl).

**Incident Escalation Worker**: Runs every 60 seconds (configurable via `ESC_TICK_MS`) to automatically bump escalation levels for unacknowledged incidents based on SLA thresholds (critical: 5 minutes per level via `ESC_CRIT_ACK_MIN`, warning: 15 minutes per level via `ESC_WARN_ACK_MIN`); sends Slack notifications with incident details and Velocity Dashboard deep links for each escalation event via owner-specific or global webhooks. A manual test endpoint (`POST /ops/escalation/tick`) allows on-demand escalation checks. Full test coverage with 4 passing tests validates SLA compliance, multi-level escalation, acknowledgment handling, and severity-specific timing.

#### Escalation Worker - Operational Runbook

**Configuration:**

Environment variables controlling escalation behavior:

- `MAX_ESC_LEVEL` - Maximum escalation level (default: 7, hard limit enforced)
- `ESC_SNOOZE_MIN` - Snooze duration in minutes when incident is acknowledged (default: 30)
- `ESC_TICK_MS` - Worker tick interval in milliseconds (default: 60000, i.e., 60 seconds)
- `ESC_CRIT_ACK_MIN` - Minutes per escalation level for critical incidents (default: 5)
- `ESC_WARN_ACK_MIN` - Minutes per escalation level for warning incidents (default: 15)
- `ESCALATION_WORKER_ENABLED` - Master kill switch for escalation worker (default: true)
- `ESCALATION_V1` - Feature flag for escalation system (default: true)
- `ESC_CANARY_PCT` - Percentage of incidents to escalate (0-100, default: 100 for full rollout)
- `ESC_DRY_RUN` - If true, worker logs actions without executing them (default: false)
- `ESC_PAUSE_CRON` - Cron expression to pause escalations during maintenance windows (optional)
- `OPS_HMAC_SECRET` - Secret key for HMAC signature verification on ops endpoints (required for production)
- `OPS_ADMIN_ROLE` - Role name required for ops endpoints (default: "ops_admin")

Safety limits: Maximum escalation level is capped at 7 to prevent runaway escalation. Snooze duration defaults to 30 minutes to balance responsiveness with avoiding alert fatigue.

**Operations:**

1. **Pause Escalation Worker:**
   - Set environment variable: `ESCALATION_WORKER_ENABLED=false`
   - Deploy changes or restart the backend server
   - Verify in server logs for message: `"escalation worker disabled via feature flag"`
   - Confirm via health endpoint: `GET /ops/escalation/health` returns `enabled: false`

2. **Drain Escalations (Emergency):**
   - Acknowledge all open incidents: `UPDATE incidents SET acknowledged_at = now() WHERE acknowledged_at IS NULL`
   - Or reduce escalation levels: `UPDATE incidents SET escalation_level = GREATEST(escalation_level - 1, 0) WHERE incident_key = $1`
   - Verify drain completion: `SELECT COUNT(*) FROM incidents WHERE acknowledged_at IS NULL AND escalation_level > 0`

3. **Recalculate next_due_at (After SLA Changes):**
   - Note: `next_due_at` is a GENERATED STORED column that automatically recalculates when row data changes
   - Force recalculation via API: `POST /ops/escalation/recalc` (requires ops_admin role + HMAC signature)
   - Or use SQL: `UPDATE incidents SET escalation_level = escalation_level` (triggers column regeneration)

4. **Canary Rollout:**
   - Start conservatively: Set `ESC_CANARY_PCT=10` to enable escalation for 10% of incidents
   - Monitor canary metrics: Check server logs for `skipped_canary` counter
   - Gradual expansion: Increase to 25, then 50, then 100 over time as confidence grows
   - Emergency rollback: Set `ESC_CANARY_PCT=0` to disable escalation for all incidents

5. **Manual Escalation Tick:**
   - Trigger endpoint: `POST /ops/escalation/tick`
   - Authorization requirements: authenticated user with ops_admin role, valid HMAC signature in `X-Signature` header
   - Rate limiting: 10 requests per minute
   - Response format: `{success: true, escalated: <count>}`

6. **Health Monitoring:**
   - Health endpoint: `GET /ops/escalation/health`
   - Alert condition 1: `tickLagMs > 2 * tickIntervalMs` indicates worker is stuck or lagging
   - Alert condition 2: `healthStatus === 'critical'` returns HTTP 503 status code
   - Use for load balancer health checks and monitoring dashboards

7. **Audit Last 24h Escalations:**
   - Query escalation history: `SELECT * FROM escalation_events WHERE created_at > now() - INTERVAL '24 hours' ORDER BY created_at DESC`
   - Inspect for anomalies: Check for duplicate escalations (should never occur due to idempotency via unique_hash)
   - Validate Slack delivery: Cross-reference with Slack webhook logs

**Security:**

All ops escalation endpoints enforce multi-layered security:

- Authentication: Valid JWT token required
- Authorization: User must have the ops_admin role
- HMAC signature: Request body must be signed with `OPS_HMAC_SECRET`
- Rate limiting: 10 requests per minute per IP to prevent abuse

HMAC signature mechanism:
- Algorithm: `HMAC-SHA256(request_body, OPS_HMAC_SECRET)`
- Header: Include signature in `X-Signature` request header
- Generate signature example: `echo -n '{"foo":"bar"}' | openssl dgst -sha256 -hmac "your_secret"`

**Troubleshooting:**

- **Worker not running:** Verify `ESCALATION_WORKER_ENABLED=true` and `ESCALATION_V1=true` are both set
- **No escalations occurring:** Check `ESC_CANARY_PCT` is >0; verify incidents have `next_due_at NOT NULL`
- **Duplicate Slack messages:** Query `escalation_events` table for `unique_hash` constraint violations (should never happen)
- **Slow escalations:** Monitor `escalation_tick_ms` metric in logs; verify database has proper indices on `incidents(next_due_at, acknowledged_at)`

### System Design Choices
The project adopts a monolithic architecture with a scalable PostgreSQL database. It emphasizes observability through monitoring, logging, and health checks, and is designed for security with enforced authentication and multi-layered database validation. An `autosync.sh` script automates Git commits and pushes.

## External Dependencies

### Backend
- **Database**: Supabase PostgreSQL
- **Backend Framework**: Express.js
- **ORM**: Drizzle ORM
- **PostgreSQL Extensions**: `pgcrypto`, `citext`
- **Email**: Nodemailer
- **Scheduling**: `node-cron`
- **Error Monitoring**: Sentry
- **Logging**: Pino

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **HTTP Client**: Axios
- **Data Fetching**: React Query
- **Error Monitoring**: @sentry/react