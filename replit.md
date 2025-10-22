# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell for Eden Plumbing Inc., providing a robust backend with a defined database schema, organizational structure, and a basic REST API. Its purpose is to streamline business operations, starting with coordination and procurement, offering a scalable platform for future application modules to efficiently manage projects, tasks, and resources.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with Vite.
- **Styling**: TailwindCSS for utility-first responsive design.
- **Development Authentication**: `DevAuthSwitcher` for quick user role switching.
- **API Integration**: Axios-based client with interceptors for development auth headers.
- **Project Structure**: Monorepo with frontend in `apps/coordination_ui/`. Vite proxies `/api` to backend on port 3000.
- **Theming**: Soft Light (Google-ish) theme with custom utilities, active scale feedback, and focus rings.
- **Components**: StatusSelect, BICChip, Overdue Badge, Idle Badge, Notifications Bell, Toast System.

### Technical Implementations
- **Backend Framework**: Express.js.
- **Database**: Supabase PostgreSQL with Drizzle ORM.
- **Runtime**: Node.js 20.
- **Authentication**: Global authentication on `/api/*` routes, supporting development headers and JWT.
- **RBAC**: Complete foundation with normalized tables, module-based permission naming, and middleware.
- **Airtight Layer**: Middleware for Zod schema validation, Rate Limiting, Audit Logs, Idempotency, Background Job Queue, and PII Scrubbing.
- **Monitoring**: Health checks, structured JSON logging, Sentry integration, and automated post-deploy gates.
- **Smoke Tests**: Automated API health checks.
- **Database Safety**: Multi-layered validation and diagnostics.
- **Automation**: Background job queue for async tasks (emails, syncs, exports).
- **Notifications System**: Integrated job queue for `notify-user` and `daily-summary`, triggered by task events and overdue checks.
- **User Preferences System**: Database table and API endpoints for managing user settings like `default_project_id` and `tasks_group_by`.
- **Automated Overdue Task Tracking**: `is_overdue` and `overdue_snoozed_until` fields, `recomputeOverdue` service, daily cron job at 3:00 AM, and manual admin endpoint.
- **Automated Idle Task Reminders**: `needs_idle_reminder` and `idle_snoozed_until` fields, `recomputeIdle` service with 3-day threshold, daily cron job at 9:05 AM, snooze endpoint, and UI badge.
- **Auto-Complete Parent Task**: Service to auto-manage parent task status based on subtask completion, with manual override (`status_locked`).
- **Email Summary**: Nodemailer service for daily digest with smart fallback.

### Feature Specifications
- **Core Modules**: `coordination` (projects, tasks, comments, attachments) and `procurement`.
- **Core Services**: Authentication, email, notifications, permissions, reporting, storage, and utilities.
- **API Endpoints**: CRUD for Projects and Tasks, nested task creation, comment management, time-boxed guest links, and specialized reporting endpoints (status, priority, overdue, performance leaderboard).
- **Task Filtering**: Server-side filtering with pagination and sorting on `GET /api/tasks`. Supports filtering by status, priority, assignee, project, department, ball-in-court, due date ranges, overdue/idle flags, and text search. Configurable pagination (default 20, max 100) and sorting by created_at, updated_at, due_at, title, status, or priority.
- **Notifications**: Supports `in_app`, `email`, and `push` channels.
- **Frontend UI**: Coordination dashboard, project detail view, full-featured task view, guest view (public read-only), create task modal, and reports page.
- **Reporting**: Four card layout (Tasks by Status, Tasks by Owner, Overdue Tasks, Recent Activity) with deep-linking. Performance leaderboard with 7/30-day task completion metrics and CSV export.
- **Guest View**: Public read-only access to tasks and projects via token, with rate limiting and audit logging.
- **Department Handoffs**: Track task ownership transitions between departments (Operations, Procurement, Accounting, Service, Estimating, Scheduling) with 24-hour duplicate guard, full audit trail in `handoff_events` table, and UI dropdown for seamless handoff workflow.

### System Design Choices
- **Monolithic Architecture**: Single, cohesive unit.
- **Scalable Database**: PostgreSQL with a session pooler.
- **Observability**: Built-in monitoring, logging, and health checks.
- **Secure by Design**: Enforced authentication and multi-layered database configuration validation.
- **Auto-Sync to GitHub**: Background workflow `autosync.sh` commits and pushes changes every 5 minutes using `GITHUB_TOKEN`.

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

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **HTTP Client**: Axios
- **Styling**: TailwindCSS 3
- **Data Fetching**: React Query
- **Dev Server**: Runs on port 5000 with proxy to backend on port 3000