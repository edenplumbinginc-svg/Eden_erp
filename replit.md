# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell for Eden Plumbing Inc., designed to streamline business operations, starting with coordination and procurement. It provides a robust backend with a defined database schema and a basic REST API, serving as a scalable platform for future application modules to efficiently manage projects, tasks, and resources.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with Vite, styled with 100% Google Material Design and custom CSS, emulating a professional Google Workspace aesthetic. This includes a specific color palette, typography (Roboto), an 8px spacing grid, a 4-level elevation system, and smooth transitions. A `DevAuthSwitcher` is implemented for development-time user role switching. API integration is handled via an Axios-based client. The project follows a monorepo structure with the frontend in `apps/coordination_ui/`.

### Technical Implementations
The backend is built with Express.js, Node.js 20, and uses Supabase PostgreSQL with Drizzle ORM. Authentication relies on Supabase Auth with JWT verification and a comprehensive RBAC system with four roles and over 35 granular permissions, enforced via middleware and a permission-aware UI. A five-layer performance optimization stack includes localStorage caching, ETag-based conditional requests, warm-boot preloading, and a delta sync mechanism for incremental data fetching. A "realtime-lite" change beacon system uses polling to provide pseudo-realtime updates. Middleware handles Zod schema validation, rate limiting, audit logs, and idempotency. The system includes an in-app notification system, user preferences, automated overdue and idle task tracking, and auto-completion of parent tasks based on subtask status. The architecture supports future AI-powered task creation from voice and email, integrating `voiceUrl`, `voiceTranscript`, and `ballInCourtNote` fields.

### Feature Specifications
Core modules include `coordination` (projects, tasks, comments, attachments) and `procurement`. The API provides CRUD operations for Projects and Tasks, nested task creation, comment management, and specialized reporting. Server-side task filtering with pagination and sorting is supported, along with shareable URL-bound views. A unified task creation interface is available via modal or a dedicated page. Reporting features include dashboard cards and a performance leaderboard with CSV export. A guest view offers public read-only access to tasks and projects. A complete department ball handoff workflow is implemented with an audit trail and notifications. An Admin RBAC UI (`/admin/rbac`) provides email-based user lookup, direct role assignment/removal, and role template quick-apply (operations, contributor, manager, admin_full) for streamlined user management.

**Task Checklists**: Full-featured checklist system with RBAC-protected endpoints, Material Design UI, drag-and-drop reordering, optimistic updates, and 20-second delta sync. Mounted on task detail pages with permission-based controls (read/write/delete). Captures completion timestamps for performance tracking.

**Performance Events**: Micro-telemetry system that automatically logs completion metrics when checklist items are marked as done. Tracks actor, task, duration, and department for "who finishes fast" analytics. Provides foundation for badges, points, and leaderboards. Includes 3 analytical views (v_perf_fastest_week, v_perf_dept_month, v_perf_recent) for performance insights.

**Performance API**: Read-only REST endpoints exposing performance metrics for UI consumption. Three endpoints protected by authentication: `/api/perf/fastest-week` (top 20 performers this week), `/api/perf/dept-month` (department rankings last 30 days), `/api/perf/me/recent` (user's 30 most recent completions). Queries pre-computed database views for optimal performance. Ready for leaderboard UI implementation.

**Performance Leaderboard UI**: Full-featured Material Design leaderboard page at `/leaderboard` consuming Performance API endpoints. Features three main sections: (1) Top Performers This Week - top 20 fastest checklist completions with medals for top 3, (2) Department Rankings - 30-day dept performance with total completions and average time, (3) My Recent Performance - user's last 30 completions with personal stats (total, fastest, average, lightning fast count). Auto-refreshes data via React Query (60s for weekly, 120s for dept, 30s for personal). Integrates with navigation header with ⚡ emoji. Supports "WHO FINISHES FAST" gamification with badges (⚡ for <60min completions) and velocity indicators.

**Auto-Decisions v0 (Safe Rules Engine)**: Automated low-risk decision engine with full auditability. Runs every 5 minutes evaluating policies stored in `decision_policies` table. All executions logged to `decision_executions` for audit trail. Ships with 4 safe policies (all in DRY_RUN mode by default): auto-handoff from Estimation→Procurement when checklist hits 100%, idle task escalation (>7 days), speed badges for checklist items completed in <60 minutes, and unacknowledged handoff SLA escalation (48h default). Admin API (`/api/admin/decisions/*`) provides policy management, manual execution, toggle controls, and execution history. SLA thresholds are configurable via admin UI (`/admin/court-flow`) through `sla_thresholds` config table. Only enables low-risk effects: notify, create_task (templated), and label assignment.

**Ball-in-Court Analytics**: Comprehensive handoff tracking and bottleneck analysis system. `ball_in_court_events` table captures all department handoffs with acknowledgment workflow. SQL views (`v_ball_hold_time`, `v_court_flow_30d`) provide real-time metrics on hold times, acknowledgment rates, and departmental KPIs. REST API (`/api/perf/court-flow`) exposes 30-day metrics with avg/median/max hold times per department. UI components include task detail Responsibility Chain panel (15s auto-refresh, color-coded hold-time badges), Court Flow Dashboard (`/admin/court-flow`) with recharts visualizations and SLA configuration controls, and Task-level SLA Banner on task detail pages. The SLA banner shows yellow/red warnings when handoffs exceed thresholds, displays age/SLA/recipient info, and allows admins to send one-off nudge reminders directly from the task page. Supports automated SLA enforcement via decision policies.

**Monitoring & Observability**: Production-grade observability stack with Sentry error monitoring, Pino structured JSON logging, ops health endpoints, and auto-restart resilience guards. Sentry integration (configured via SENTRY_DSN and SENTRY_ENV secrets) provides crash reporting with 30% trace sampling and 10% profile sampling, user context tagging, and `sentry_event_id` in error responses for incident correlation. Request correlation IDs system generates UUID per request via middleware, sets `req.id` and `X-Request-Id` header, and propagates through all log entries. Pino logger emits structured JSON logs with service/env base fields, sensitive data redaction (auth headers, tokens, passwords), and custom serializers for HTTP requests. All logs include `req_id`, user context (`user_email`, `role`), request/response details (`method`, `url`, `statusCode`), and performance metrics (`duration_ms`, `responseTime`). Error handler logs unhandled errors with full correlation context (req_id, user info, stack trace) for end-to-end trace correlation across Sentry events and structured logs. Health endpoints provide machine-readable checks for ops: `/healthz` (liveness probe, returns 200 when app is healthy, 503 when degraded), `/ready` (readiness probe, returns 200 only when DB is reachable, 503 otherwise), and `/version` (version/env info with uptime). All health checks use the connection pool (no per-request clients), report DB response time, memory usage (RSS/heap), CPU load, and include `RELEASE_SHA`, `BUILD_TIME`, and `SENTRY_ENV` metadata when available. Auto-restart guards include a startup gate (fails fast with exit code 42 if DB unreachable on boot, logs `startup_gate_ok` on success) and a periodic watchdog (checks health every 30s via `WATCHDOG_INTERVAL_MS`, exits with code 43 after 4 consecutive failures via `WATCHDOG_FAILS_TO_EXIT`, logs recovery transitions). The `FORCE_HEALTH_FAIL` environment variable enables testing degraded states without database manipulation.

### System Design Choices
The project adopts a monolithic architecture with a scalable PostgreSQL database. It emphasizes observability through monitoring, logging, and health checks, and is designed for security with enforced authentication and multi-layered database validation. An `autosync.sh` script automates Git commits and pushes.

## External Dependencies

### Backend
- **Database**: Supabase PostgreSQL
- **Backend Framework**: Express.js
- **Database Driver**: `pg`
- **Environment Variables**: `dotenv`
- **ORM**: Drizzle ORM
- **PostgreSQL Extensions**: `pgcrypto`, `citext`
- **Email**: Nodemailer
- **Scheduling**: `node-cron`
- **Timezone**: `luxon`
- **Error Monitoring**: Sentry with profiling
- **Logging**: Pino (structured JSON), pino-http
- **Request IDs**: `uuid` for correlation

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **HTTP Client**: Axios
- **Styling**: Google Material Design (custom CSS)
- **Data Fetching**: React Query