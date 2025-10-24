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

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **HTTP Client**: Axios
- **Styling**: Google Material Design (custom CSS)
- **Data Fetching**: React Query