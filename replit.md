# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell for Eden Plumbing Inc., providing a robust backend with a defined database schema, organizational structure, and a basic REST API. Its purpose is to streamline business operations, starting with coordination and procurement, offering a scalable platform for future application modules to efficiently manage projects, tasks, and resources.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with Vite.
- **Styling**: 100% Google Material Design with custom CSS (Tailwind removed October 2025). Professional Google Workspace aesthetic with Roboto font, Material color palette, 4-level elevation system, 8px spacing grid, and smooth transitions.
- **Development Authentication**: `DevAuthSwitcher` for quick user role switching.
- **API Integration**: Axios-based client with interceptors for development auth headers.
- **Project Structure**: Monorepo with frontend in `apps/coordination_ui/`. Vite proxies `/api` to backend on port 3000.
- **Material Design System**: Complete implementation with color variables (--md-primary: #1a73e8), elevation shadows (4 levels), spacing tokens (8/16/24/32/40/48px), typography scale (Roboto 300/400/500/700), button styles (raised, outlined, danger, success), form inputs with focus states, navigation tabs, cards with proper shadows, loading skeletons, and Material animations.
- **Components**: StatusSelect, BICChip, Overdue Badge, Idle Badge, Notifications Bell, Toast System, SummaryCard, TasksByStatusChart, TasksByAssigneeChart, RecentActivityFeed.

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
- **In-App Notifications System**: Complete real-time notification loop that closes the coordination cycle. Automatically creates notifications for ball handoffs (all department users), comments (creator/assignee/ball-holder), and status changes (task creator). Features include `services/notifications.js` service layer, `GET /api/notifications/recent` (user-scoped, unread by default), `PATCH /api/notifications/:id/read` and mark-all-read endpoints, NotificationsBell component with unread badge and dropdown, rich emoji-based notification text (🏀 handoffs, 💬 comments, 📊 status), click-to-navigate, and 30-second polling. Includes deduplication (actors don't notify themselves) and proper error handling. Background job queue still handles `notify-user` and `daily-summary` for email digests.
- **User Preferences System**: Database table and API endpoints for managing user settings like `default_project_id` and `tasks_group_by`.
- **Automated Overdue Task Tracking**: `is_overdue` and `overdue_snoozed_until` fields, `recomputeOverdue` service, daily cron job at 3:00 AM, and manual admin endpoint.
- **Automated Idle Task Reminders**: `needs_idle_reminder` and `idle_snoozed_until` fields, `recomputeIdle` service with 3-day threshold, daily cron job at 9:05 AM, snooze endpoint, and UI badge.
- **Auto-Complete Parent Task**: Service to auto-manage parent task status based on subtask completion, with manual override (`status_locked`).
- **Email Summary**: Nodemailer service for daily digest with smart fallback.
- **Coordination Phase 1A (Voice/Email Intake Prep)**: Schema extended to support future AI-powered task creation from voice and email. Added `voiceUrl`, `voiceTranscript`, and `ballInCourtNote` fields to tasks table. Multi-project linking enabled via `tasks_projects` join table. Origin tracking defaults to 'UI' for all tasks. Backward compatible with existing 80+ tasks.

### Feature Specifications
- **Core Modules**: `coordination` (projects, tasks, comments, attachments) and `procurement`.
- **Core Services**: Authentication, email, notifications, permissions, reporting, storage, and utilities.
- **API Endpoints**: CRUD for Projects and Tasks, nested task creation, comment management, time-boxed guest links, and specialized reporting endpoints (status, priority, overdue, performance leaderboard).
- **Task Filtering**: Server-side filtering with pagination and sorting on `GET /api/tasks`. Supports filtering by status, priority, assignee, project, department, ball-in-court, due date ranges, overdue/idle flags, and text search. Configurable pagination (default 20, max 100) and sorting by created_at, updated_at, due_at, title, status, or priority.
- **Shareable Views (URL-Bound Filtering)**: Frontend task filtering with URL query parameter synchronization for shareable views. Features include `useQueryState` and `useTasksQuery` hooks with shared subscription model, debounced API calls (300ms), status chips, search bar, advanced filters, "Copy View Link" button, and "All Tasks" view toggle. All filter state persists in URL for bookmarking and sharing.
- **Notifications**: Supports `in_app`, `email`, and `push` channels.
- **Frontend UI**: Coordination dashboard, project detail view, full-featured task view, guest view (public read-only), task create page/modal, and reports page.
- **Task Creation**: Unified task creation interface with modal (in-context) and standalone page (/tasks/new for deep-linking). Features include required title field, optional fields (description, status, priority, assignee, due date, project), department/ball-in-court selection, and collapsible advanced options for voice/email intake (origin, voice_url, voice_transcript, ball_in_court_note). Form validation, toast notifications, react-query cache invalidation, and auto-navigation to created task.
- **Reporting**: Four card layout (Tasks by Status, Tasks by Owner, Overdue Tasks, Recent Activity) with deep-linking. Performance leaderboard with 7/30-day task completion metrics and CSV export.
- **Guest View**: Public read-only access to tasks and projects via token, with rate limiting and audit logging.
- **Ball Handoff UX**: Complete department handoff workflow with "Pass Ball 🏀" button on TaskDetail page. Select target department (Operations, Procurement, Accounting, Service, Estimating, Scheduling), add optional note explaining reason for handoff, 24-hour duplicate guard prevents accidental re-handoffs, full audit trail stored in `handoff_events` table with notes, toast notifications on success/duplicate, automatic task refresh. Ready for future AI-suggested handoff reasons.

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
- **Styling**: Google Material Design (custom CSS, Tailwind removed October 2025)
- **Data Fetching**: React Query
- **Dev Server**: Runs on port 5000 with proxy to backend on port 3000