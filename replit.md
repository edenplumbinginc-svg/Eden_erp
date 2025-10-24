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

**Monitoring & Observability**: A production-grade observability stack with Sentry for error monitoring (backend/frontend with distributed tracing and session replay), Pino for structured JSON logging (with correlation IDs and sensitive data redaction), robust health probes (`/ops/live`, `/ops/ready`, `/ops/health`), and auto-restart resilience guards. A startup gate prevents server listening until the DB is reachable. Watchdog checks health periodically. Velocity Metrics provide lightweight per-route telemetry (`/ops/metrics`, `/ops/metrics/trends`) with rolling windows, exposed via a real-time Velocity Dashboard UI (`/velocity`) which includes p95 regression detection and Sentry correlation for deep linking. Machine-Readable Alarms (`/ops/alarms`) provide automated detection of operational issues (high error rates ≥5% with ≥5 samples, p95 latency regressions ≥20% AND ≥30ms) with structured output for integration, backed by unit tests validating both alarm rules and sample guards. Live Alert Overlay integrated into Velocity Dashboard polls `/ops/alarms` every 10s, displays global alert status bar, shows per-row alert badges (warning/critical) with severity-based color coding, and provides slide-out drawer with detailed alert information, evidence metrics, Sentry deep links, and remediation hints for real-time operational visibility. Slack Alerter polls `/ops/alarms` every 30s and sends formatted Slack messages for critical-severity alarms with 5-minute deduplication per route+kind (enabled via `SLACK_VELOCITY_WEBHOOK`).

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