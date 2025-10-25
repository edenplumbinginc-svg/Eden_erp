# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell for Eden Plumbing Inc., designed to streamline business operations, starting with coordination and procurement. It provides a robust backend with a defined database schema and a basic REST API, serving as a scalable platform for future application modules to efficiently manage projects, tasks, and resources. The business vision is to provide a comprehensive, scalable platform that integrates various operational aspects, improving efficiency and coordination.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with Vite, styled with 100% Google Material Design and custom CSS, emulating a professional Google Workspace aesthetic. This includes a specific color palette, typography (Roboto), an 8px spacing grid, a 4-level elevation system, and smooth transitions. A `DevAuthSwitcher` is implemented for development-time user role switching. API integration is handled via an Axios-based client. The project follows a monorepo structure with the frontend in `apps/coordination_ui/`.

**Modern Design Token Layer**: A lightweight CSS variable system (`apps/coordination_ui/src/styles/tokens.css`) provides centralized control over colors, typography, spacing, radius, shadows, and motion. Features include automatic dark mode support, motion-reduced-safe animations, and a modern gradient background. Utility classes (`.muted`, `.grid-auto`, `.card`, `.radius-xl`, `.chrome`) enable rapid UI development without component rewrites.

### Technical Implementations
The backend is built with Express.js, Node.js 20, and uses Supabase PostgreSQL with Drizzle ORM. Authentication relies on Supabase Auth with JWT verification and a comprehensive RBAC system enforced via middleware and a permission-aware UI. A five-layer performance optimization stack includes localStorage caching, ETag-based conditional requests, warm-boot preloading, and a delta sync mechanism. A "realtime-lite" change beacon system uses polling. Middleware handles Zod schema validation, rate limiting, audit logs, and idempotency. The system includes an in-app notification system, user preferences, automated overdue/idle task tracking, and auto-completion of parent tasks. The architecture supports future AI-powered task creation.

Core modules include `coordination` (projects, tasks, comments, attachments) and `procurement`. The API provides CRUD operations for Projects and Tasks, nested task creation, comment management, and specialized reporting with server-side filtering, pagination, and sorting. A unified task creation interface is available. Reporting features include dashboard cards and a performance leaderboard with CSV export. A guest view offers public read-only access. A complete department ball handoff workflow is implemented with an audit trail and notifications. An Admin RBAC UI (`/admin/rbac`) provides user management.

**Task Checklists**: A full-featured checklist system with RBAC-protected endpoints, Material Design UI, drag-and-drop reordering, optimistic updates, and 20-second delta sync. Performance metrics are captured upon completion.

**Performance Events & API**: A micro-telemetry system logs completion metrics for "who finishes fast" analytics. Read-only REST endpoints (`/api/perf/*`) expose performance metrics for UI consumption.

**Auto-Decisions v0 (Safe Rules Engine)**: An automated low-risk decision engine runs every 5 minutes, evaluating policies stored in `decision_policies`. All executions are logged for auditability. Ships with four safe policies (in DRY_RUN by default): auto-handoff, idle task escalation, speed badges, and unacknowledged handoff SLA escalation. An Admin API (`/api/admin/decisions/*`) provides policy management.

**Ball-in-Court Analytics**: A comprehensive handoff tracking and bottleneck analysis system using `ball_in_court_events` and SQL views. A REST API (`/api/perf/court-flow`) exposes 30-day metrics. UI components include a Responsibility Chain panel, a Court Flow Dashboard (`/admin/court-flow`) with visualizations, and a Task-level SLA Banner with warnings and nudge reminders.

**Monitoring & Observability**: A production-grade observability stack with Sentry for error monitoring, Pino for structured JSON logging, robust health probes, and auto-restart resilience guards. Velocity Metrics provide lightweight per-route telemetry with rolling windows, exposed via a real-time Velocity Dashboard UI which includes p95 regression detection and Sentry correlation. Machine-Readable Alarms (`/ops/alarms`) provide automated detection of operational issues with three rules: high error rates, p95 latency regressions, and SLO violations. Route Owners & Targeted Alerts enable ownership-based monitoring via `ROUTE_OWNERS` environment variable. Live Alert Overlay integrated into Velocity Dashboard polls `/ops/alarms` every 10s for real-time operational visibility. Slack Alerter polls `/ops/alarms` every 30s and sends formatted Slack messages for critical-severity alarms with 5-minute deduplication. Historical Metrics Persistence snapshots 1-minute KPIs to the `velocity_metrics` Postgres table every 30 seconds with 14-day retention. Release Impact API (`/ops/release-impact`) compares current vs previous release performance per route. Release Impact UI displays deployment performance deltas in the Velocity Dashboard. SLO Evaluation API (`/ops/slo`) evaluates each route against configurable service level objectives. SLO Badges UI on Velocity Dashboard displays real-time 🟢/🟡/🔴 badges per route. Release Guard API (`/ops/release-guard`) provides automated deploy safety validation that returns HTTP 200/503 based on current alarms. Release Guard UI widget on Velocity Dashboard displays a prominent PASS/FAIL banner for deployment safety. Incident Management uses the `incidents` table to correlate alarms across time, track acknowledgment and escalation state, and support timed escalation workflows.

**Incident Escalation Worker**: Runs every 60 seconds to automatically bump escalation levels for unacknowledged incidents based on SLA thresholds; sends Slack notifications with incident details and Velocity Dashboard deep links for each escalation event.

**Release Guard API** (`/ops/release-guard`): Automated deployment gating endpoint for CI/CD pipelines that blocks deployments (returns HTTP 503) when critical incidents at escalation level ≥1 are detected within a configurable time window (default: 10 minutes). Integrated into GitHub Actions workflow with auto-rollback on failure, preventing bad releases from reaching production.

**ChatOps Incident Management** (`/ops/incidents/:id/ack`): Operational endpoint for acknowledging incidents via ChatOps interfaces (Slack). Protected by 5-layer security stack (JWT Auth → RBAC Permissions → Ops Admin Role → HMAC Signature → Rate Limit). Updates incident status to 'acknowledged', records acknowledging user and timestamp, provides full audit trail. Designed for integration with Slack slash commands to enable incident management without leaving chat interface.

**Startup Config Validation**: Production-grade environment variable validation with Zod schemas, fail-fast behavior on misconfiguration, environment-aware production guards, and unknown key detection for typo prevention. Config health endpoint (`/ops/config/health`) exposes runtime configuration with secret redaction.

**User Profile Management**: Optional profile fields API (`/api/me/profile`) with GET and PATCH endpoints for managing user information. Supports phone, title, avatar URL, timezone, locale, and notification preferences. Zod validation ensures data integrity with constraints on field lengths and formats. Partial updates supported for efficient data changes. All fields nullable for backward compatibility.

**UI Coverage Gate**: Automated quality gate system enforcing complete page coverage for all API resources. Contract-based validation (`docs/ui-contract.yaml`) defines required pages and states. Checker script (`scripts/check-ui-coverage.js`) scans pages and components directories, handling multiple naming patterns including singular/plural forms for dynamic routes. Integrates with CI/CD via `npm run check:ui`. Status: **100% coverage achieved** (24/24 pages). Includes incident management pages (`IncidentsPage.jsx`, `IncidentDetail.jsx`) with Material Design UI. Prevents shipping half-built features by failing builds when required pages are missing.

**Navigation Smoke Test**: Contract-driven Playwright test suite validating all 24 routes render correctly in headless Chrome. Global auth setup (`tests/global-setup.cjs`) enables programmatic Supabase login when `PW_EMAIL`/`PW_PASSWORD` env vars are provided, allowing authenticated testing of protected routes. Without credentials, tests verify auth redirects work correctly. Tests validate visible UI elements, handle all states (loading, error, unauthorized, empty, not_found), and generate HTML reports at `coverage/playwright-report`. Integrated with npm scripts (`test:smoke`, `test:smoke:headed`) and ready for GitHub Actions. Ensures routes don't break due to runtime errors, missing imports, or auth issues before deployment.

**Showcase Page** (`/showcase`): Auto-generated visual testing page listing all 24 routes from UI contract with Material Design styling. Auto-generates via pre-build hooks (`scripts/generate-showcase.js`) before dev/build/preview. Provides single-click navigation to any route for QA and demos. Auth-protected route with responsive grid layout.

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