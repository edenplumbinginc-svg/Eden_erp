# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell designed for Eden Plumbing Inc., serving as a foundational scaffolding. Its primary purpose is to provide a robust backend with a well-defined database schema, organizational structure, and a basic REST API. The project aims to streamline business operations, starting with coordination and procurement, by offering a scalable and maintainable platform. This system is designed to be the backbone for future application modules, facilitating efficient management of projects, tasks, and resources within the company.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with Vite for development.
- **Styling**: TailwindCSS for utility-first responsive design.
- **Development Authentication**: `DevAuthSwitcher` component for quick user role switching (OPS, VIEWER, ADMIN) for RBAC testing.
- **API Integration**: Axios-based API client with interceptors for development auth headers.
- **Project Structure**: Monorepo with frontend in `apps/coordination_ui/`. Vite proxies `/api` requests to backend on port 3000.

### Technical Implementations
- **Backend Framework**: Express.js.
- **Database**: Supabase PostgreSQL with Drizzle ORM for schema management.
- **Runtime**: Node.js 20.
- **Authentication**: Global authentication on all `/api/*` routes, supporting development headers and JWT bearer tokens.
- **RBAC (Role-Based Access Control)**: Complete RBAC foundation with normalized tables, module-based permission naming (`<module>:<action>`), and permission middleware (`requirePerm()`, `hasPerm()`). Includes 9 baseline roles and 32 module-based permissions.
- **Airtight Layer**: Production-grade middleware for (1) Zod schema validation, (2) Rate Limiting, (3) Audit Logs (`audit_logs` table), (4) Idempotency protection, (5) Background Job Queue, and (6) PII Scrubbing in Sentry logs.
- **Monitoring**: Comprehensive production monitoring with health checks, structured JSON logging, Sentry integration for error tracking/performance, and automated post-deploy gates.
- **Database Configuration Safety**: Multi-layered validation ensures correct database connection.
- **Database Diagnostics**: Full diagnostic infrastructure with retry/backoff, DNS resolution, `/diag/db` endpoint, and fail-fast startup.
- **Automation**: Automated job for sending idle task reminders and a background job queue for async tasks (emails, syncs, exports).
- **Notifications System**: Integrated job queue for `notify-user` and `daily-summary`, with notifications triggered by task events and overdue checks.

### Feature Specifications
- **Core Modules**: `coordination` (projects, tasks, comments, attachments) and `procurement`.
- **Core Services**: Authentication, email, notifications, permissions, reporting, storage, and utilities.
- **API Endpoints**: CRUD for Projects and Tasks, nested task creation, comment management, time-boxed guest links, and 5 specialized reporting endpoints.
- **Notifications**: Supports `in_app`, `email`, and `push` channels.
- **Frontend UI**: Coordination dashboard, project detail view, and full-featured task view with checklist editor, comments, attachments, and guest link generation.
- **Reporting**: Four card layout (Tasks by Status, Tasks by Owner, Overdue Tasks, Recent Activity) with deep-linking.

### System Design Choices
- **Monolithic Architecture**: Single, cohesive unit for simplified development and deployment.
- **Scalable Database**: PostgreSQL with a session pooler.
- **Observability**: Built-in comprehensive monitoring, logging, and health checks.
- **Secure by Design**: Enforced authentication and multi-layered database configuration validation.

## External Dependencies
### Backend
- **Database**: Supabase PostgreSQL
- **Backend Framework**: Express.js
- **Database Driver**: `pg`
- **Environment Variables**: `dotenv`
- **ORM**: Drizzle ORM
- **PostgreSQL Extensions**: `pgcrypto`, `citext`

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **HTTP Client**: Axios
- **Styling**: TailwindCSS 3
- **Dev Server**: Runs on port 5000 with proxy to backend on port 3000

## Recent Changes
- **2025-10-22 (Latest)**: Applied Soft Light (Google-ish) Theme to Modern UI (apps/ui):
  - **Theme System**: Soft Light CSS with custom utilities (.soft-card, .soft-panel, .btn, .input)
  - **Design Language**: Light #f7f8fa background, white cards, rounded-2xl corners, subtle shadows
  - **Google-Style Components**: Blue #4285F4 primary buttons, smooth ease-out transitions (200ms)
  - **Interactive Elements**: Active scale feedback, focus rings, hover states
  - **Dashboard Layout**: Header with EDEN branding, stat cards, search input, task list
  - **Vite Configuration**: Port 5000, allowedHosts: 'all' for Replit compatibility
  - **API Connection**: Health check endpoint integrated, shows API status
  - Ready to wire up real data from backend endpoints
- **2025-10-22**: Shipped Guest View (Public Read-Only Access):
  - **Backend Route**: `/api/guest/resolve?token=UUID` for public, unauthenticated access
  - **Token Validation**: Checks expiry, returns 404 for invalid, 410 for expired tokens
  - **Task Scope**: Returns task details, comments (up to 100), and attachments with metadata
  - **Project Scope**: Returns project info and recent tasks (up to 200)
  - **Rate Limiting**: 60 requests per minute to prevent abuse
  - **Audit Logging**: Every guest view writes to audit_logs with tokenPreview
  - **Frontend Page**: `/guest?token=...` shows read-only view with expiry timestamp
  - **Clean UI**: Rounded cards for task info, attachments list, and comments with timestamps
  - Verified: Backend returns full data, audit logs record guest.view events, error handling works
- **2025-10-22**: Added Email Summary (Daily Digest):
  - **Mailer Service**: Nodemailer with smart fallback (console transport if no SMTP configured)
  - **Summary Builder**: Generates plain-text digest with Overdue, Due Today, and Recent Activity sections
  - **Daily Job Integration**: Wired into existing `daily-summary` job queue handler
  - **Manual Trigger**: POST `/api/ops/run-daily` for testing
  - **Dev Mode**: Logs emails to console with `[MAIL:DEV]` prefix when SMTP not configured
  - **Production Ready**: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM env vars for real emails
  - Verified: Daily digest shows 1 overdue task, 0 due today, 10 recent activities
- **2025-10-22**: Added Notifications Bell + Toast System:
  - **NotificationsBell Component**: Polls `/api/notifications/recent` every 30s, shows badge with notification count
  - **Drawer UI**: Click bell to see recent notifications with deep links to tasks
  - **Toast System**: Global ToasterProvider with success/error toasts (auto-dismiss success after 2.5s)
  - **Comment Toasts**: "Comment posted" on success, error message on failure
  - **Upload Toasts**: "File uploaded successfully" on success, error message on failure
  - **Auto-refresh**: Toasts appear when new notifications arrive ("New notifications received")
  - **Header Integration**: Bell appears in EdenHeader with Projects/Reports navigation links
  - All notification types (task_created, task_assigned, status_changed, task_overdue, comment_added) display with proper labels
- **2025-10-22**: Wired Notifications System Backend:
  - **Job Queue**: Extended `services/queue.js` with fire-and-forget job handlers for `notify-user` and `daily-summary`
  - **Notification Helper**: Updated `lib/notify.js` to insert notifications and enqueue jobs automatically
  - **Task Events**: Added notifications for task creation, status changes, and assignee changes in `routes/tasks.js`
  - **Overdue Checker**: Added nightly job (runs every 24h, first check at 10s after startup) to notify assignees of overdue tasks
  - **Daily Summary**: Scaffold for daily digest emails (currently logs to console, ready for email integration)
  - **Manual Trigger**: Added POST /api/ops/run-daily endpoint to manually trigger daily summary
  - Verified: Status changes, assignments, and overdue checks all trigger notifications; daily summary runs successfully
- **2025-10-22**: Completed Reports Page with Deep-Linking:
  - **React Query Integration**: Upgraded Reports component to use React Query for efficient data fetching
  - **Four Card Layout**: Tasks by Status, Tasks by Owner, Overdue Tasks, and Recent Activity (7 days)
  - **Deep-Linking**: "Open" buttons on overdue tasks navigate directly to `/task/:id` for quick access
  - **Live Data**: Shows real-time coordination stats
- **2025-10-22**: Completed Project → Task Navigation Flow:
  - **GET /api/projects/:id**: New endpoint to fetch single project details
  - **ProjectDetail Page**: Shows project info and task list with direct links to task details
  - **3-Level Navigation**: Projects List → Project Detail → Task Detail with back navigation
  - **React Query Integration**: All data fetching uses React Query for caching and automatic refetching