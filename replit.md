# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell designed for Eden Plumbing Inc., serving as a foundational scaffolding. Its primary purpose is to provide a robust backend with a well-defined database schema, organizational structure, and a basic REST API. The project aims to streamline business operations, starting with coordination and procurement, by offering a scalable and maintainable platform. This system is designed to be the backbone for future application modules, facilitating efficient management of projects, tasks, and resources within the company.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with Vite build system for fast development and hot module replacement.
- **Styling**: TailwindCSS for utility-first responsive design.
- **Development Authentication**: `DevAuthSwitcher` component provides quick user role switching (OPS, VIEWER, ADMIN) for testing RBAC permissions without full OAuth setup.
- **API Integration**: Axios-based API client (`services/api.js`) with request interceptors that automatically inject development auth headers (`X-Dev-User-Email`, `X-Dev-User-Id`).
- **Project Structure**: Monorepo with frontend in `apps/coordination_ui/` directory. Vite proxy forwards `/api` requests to backend on port 3000.

### Technical Implementations
- **Backend Framework**: Express.js for building RESTful APIs.
- **Database**: Supabase PostgreSQL (direct connection), with IPv4 add-on for Replit compatibility. Connection uses relaxed TLS mode (DB_SSL_REJECT_UNAUTHORIZED=false) for Supabase certificate handling.
- **Runtime**: Node.js 20.
- **Schema Management**: Drizzle ORM for database schema definition, introspection, and type safety, moving away from ad-hoc DDL on boot.
- **Authentication**: Global authentication enforced on all `/api/*` routes, supporting development headers and JWT bearer tokens (stubbed for future integration with Auth0/Clerk).
- **RBAC (Role-Based Access Control)**: Complete RBAC foundation with 4 normalized tables (roles, permissions, role_permissions, user_roles). Uses module-based permission naming convention `<module>:<action>` (e.g., "projects:write", "estimation:read"). Includes 9 baseline roles (admin, ops, estimator, procurement, coord, hr, marketing, precon, viewer) and 32 module-based permissions across 8 ERP sections. Permission middleware (`middleware/permissions.js`) provides `requirePerm()` for route protection and `hasPerm()` for programmatic checks. Admin fast-path: users with `admin:manage` bypass all permission checks. Seed script available via `npm run seed:rbac`.
- **Airtight Layer**: Production-grade middleware system providing six critical features: (1) Payload Validation with Zod schemas (`middleware/validate.js`), (2) Rate Limiting for auth/webhook endpoints (20 req/min auth, 60 req/min webhooks), (3) Audit Logs tracking all write operations (`utils/audit.js`, `audit_logs` table with user/action/entity/meta), (4) Idempotency protection for duplicate operations (`middleware/idempotency.js`, `idempotency` table), (5) Background Job Queue for async work (`services/queue.js`), (6) PII Scrubbing in Sentry logs (redacts passwords, tokens, secrets, emails). Action naming convention: `<module>.<action>` (e.g., "project.create", "po.approve"). See `AIRTIGHT_LAYER_GUIDE.md` for complete documentation.
- **Monitoring**: Comprehensive production monitoring system with health checks (quick, detailed, liveness, readiness, metrics), structured JSON logging with severity levels, and automated smoke tests. Integrated with Sentry for error tracking and performance monitoring (traces at 20%, profiling at 20%) with PII scrubbing. Includes uptime monitoring script (60-second health pings) and automated post-deploy gates to prevent bad deployments.
- **Database Configuration Safety**: Multi-layered validation framework ensures the application connects to the correct database instance, preventing mismatches and providing detailed diagnostic information.
- **Database Diagnostics**: Full diagnostic infrastructure with retry/backoff logic, DNS resolution, comprehensive `/diag/db` endpoint, and fail-fast startup behavior. Reduces MTTR (Mean Time To Repair) from days to minutes by providing instant visibility into connection, TLS, DNS, and latency issues.
- **Automation**: Includes an automated job for sending idle task reminders, leveraging `last_activity_at` timestamps. Background job queue supports async tasks (emails, syncs, exports).

### Feature Specifications
- **Core Modules**: `coordination` (projects, tasks, comments, attachments) and `procurement`.
- **Core Services**: Authentication, email, notifications, permissions, reporting, storage, and utilities.
- **API Endpoints**:
    - **System**: `/health`, `/db/ping`, `/db/users`, `/routes`.
    - **Projects**: Full CRUD operations (`GET`, `POST`, `PATCH`, `DELETE` on `/api/projects`). Nested task creation available at `/api/projects/:projectId/tasks` (POST).
    - **Tasks**: Full CRUD operations on `/api/tasks/:id` (GET, PATCH, DELETE). Comment management at `/api/tasks/:taskId/comments` (GET, POST). Ball handoff tracking, subtasks, and dependencies available.
    - **Guest Links**: Time-boxed shareable links (`POST /api/guest-links`) for tasks/projects with dual permission support (coord:manage OR projects:write). Uses crypto.randomUUID() tokens with configurable expiration (e.g., "7d", "24h"). Audit-logged with action `guest.invite`.
    - **Reporting**: 5 specialized reporting endpoints (status, owner, priority, overdue, activity).
- **Notifications**: System supports `in_app`, `email`, and `push` notification channels.
- **Frontend UI**: Basic coordination dashboard showing projects list with DevAuthSwitcher for RBAC testing. Built with React + Vite + TailwindCSS.

### System Design Choices
- **Monolithic Architecture**: Designed as a single, cohesive unit to simplify initial development and deployment.
- **Scalable Database**: Utilizes PostgreSQL with a session pooler for efficient connection management and scalability.
- **Observability**: Built-in comprehensive monitoring, logging, and health check features are integral to the system design for robust production operation.
- **Secure by Design**: Enforced authentication on API routes and multi-layered database configuration validation.

## External Dependencies
### Backend
- **Database**: Supabase PostgreSQL
- **Backend Framework**: Express.js
- **Database Driver**: `pg` (Node.js PostgreSQL client)
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
- **2025-10-22 (Latest)**: Completed Reports Page with Deep-Linking:
  - **React Query Integration**: Upgraded Reports component to use React Query for efficient data fetching
  - **Four Card Layout**: Tasks by Status, Tasks by Owner, Overdue Tasks, and Recent Activity (7 days)
  - **Deep-Linking**: "Open" buttons on overdue tasks navigate directly to `/task/:id` for quick access
  - **Live Data**: Shows real-time coordination stats (72 total tasks: 51 todo, 12 in_progress, 7 open, 2 review, 1 done)
  - **Owner Distribution**: Displays ball-in-court assignments (41 unassigned, 28 admin@edenmep.ca, 2 vendor1@example.com)
  - **Navigation**: Accessible via "Reports" tab in main navigation, works with all RBAC roles
  - Verified: All four reports load correctly, deep-linking works, data refreshes on navigation
- **2025-10-22 (Final)**: Completed Project → Task Navigation Flow:
  - **GET /api/projects/:id Endpoint**: Added missing backend endpoint to fetch single project details
  - **ProjectDetail Page**: Full-featured page showing project name, code, and task list with "Open" links
  - **API Helpers**: Added getProject() and listProjectTasks() methods to services/api.js
  - **Navigation Flow**: Complete 3-level navigation (Projects List → Project Detail → Task Detail)
  - **Routing**: Added /project/:projectId route to App.jsx with React Router integration
  - **UI Integration**: Updated ProjectList "View Tasks" buttons to use Link components for seamless navigation
  - Verified: Full navigation path works end-to-end, all RBAC permissions enforced correctly
- **2025-10-22 (Late)**: Completed Checklist Editor Integration:
  - **API Helpers**: Added subtask CRUD methods to `services/api.js` (listSubtasks, createSubtask, updateSubtask, deleteSubtask)
  - **ChecklistEditor Component**: Full-featured checklist editor with add/toggle/delete/rename functionality using React Query
  - **Task Detail Integration**: Replaced read-only Checklist component with interactive ChecklistEditor
  - **Real-time Updates**: Live UI updates with optimistic cache invalidation on create/toggle/delete
  - **Inline Editing**: Rename checklist items with instant persisting on keystroke
  - **RBAC**: All operations require `tasks:write` permission (enforced on backend)
  - **Audit Trail**: All operations (`subtask.create`, `subtask.update`, `subtask.delete`) logged to audit_logs
  - Verified: Create, toggle, rename, delete all work correctly; VIEWER users get 403 Forbidden; audit logs capture full history
- **2025-10-22**: Completed Phase 1 Polish Sprint Step 4 - File Upload Progress UI:
  - **Alert Component**: Created reusable Alert component (`apps/coordination_ui/src/components/Alert.jsx`) with success/error variants and auto-dismiss functionality
  - **XMLHttpRequest Integration**: Replaced React Query mutation with XMLHttpRequest for granular upload.onprogress event tracking
  - **Progress Bar**: Real-time progress indicator with percentage display during file uploads
  - **State Management**: Added uploadProgress (0-100) and uploadError state to Attachments component
  - **User Feedback**: Success banner auto-dismisses after 3 seconds, error banners show friendly messages with retry option
  - **UI Polish**: Disabled upload button during active uploads to prevent duplicate submissions
  - Verified: UI renders correctly, progress tracking infrastructure in place
- **2025-10-21 (Night)**: Completed Ball-in-Court Refinement with Typed Owner + Days Badge:
  - **Database Schema**: Added `ball_owner_type` (user/vendor/dept/system), `ball_owner_id` (UUID), `ball_since` (timestamp) columns to tasks table
  - **Auto-Set Logic**: Backend automatically sets `ball_since` to current timestamp whenever ball owner changes (type or id)
  - **Audit Logging**: Captures `ball.owner_set` action with type/id/since metadata for full audit trail
  - **API Validation**: Extended Zod schema to accept `ballOwnerType` and `ballOwnerId` fields with enum validation
  - **Frontend UI**: Updated BallInCourt component to show amber badge with "vendor:a0535c10 • 0 days" format, live-updating days count
  - Verified: Owner changes trigger ball_since updates, audit logs capture full history, UI displays correctly
- **2025-10-21 (Late Evening - Final)**: Completed Phase 1 Polish Sprint Step 2 - Guest-Link Frontend Integration:
  - **API Helper**: Added `createGuestLink()` to `services/api.js` for calling POST /api/guest-links
  - **Countdown Component**: Live timer showing remaining time until link expiration (e.g., "6d 23h 59m 45s")
  - **TaskDetail UI**: Wired "Generate guest link" button with full state management (loading, error handling, success state)
  - **Link Display Panel**: Shows copyable URL with one-click copy-to-clipboard functionality
  - **End-to-End Verification**: OPS users can generate links, VIEWER users get 403 errors, DB/audit logs capture correctly
  - Frontend seamlessly integrates with backend RBAC and audit trail
- **2025-10-21 (Late Evening)**: Completed Phase 1 Polish Sprint Step 1 - Guest-Link Backend:
  - **POST /api/guest-links endpoint**: Generates time-boxed shareable links for tasks/projects with crypto.randomUUID() tokens
  - **Dual Permission Support**: Uses `hasPerm()` helper for OR-based checks (coord:manage OR projects:write), avoiding broken requirePerm chaining
  - **Database Schema**: Added `guest_links` table with scope/scope_id/token/expires_at/created_by columns via Drizzle
  - **Audit Logging**: Captures `guest.invite` action with expiresIn and tokenPreview metadata
  - **Base URL Logic**: Fixed to honor PUBLIC_BASE_URL env var, fallback to REPLIT_DEV_DOMAIN, then localhost:5000
  - Verified: Permission checks work (VIEWER denied, OPS/test users approved), URLs generate correctly, DB/audit entries created
- **2025-10-21 (Evening)**: Shipped Alpha UI Pack with:
  - **EdenHeader component**: Logo + "Coordination • Alpha" environment badge
  - **TaskDetail page**: Full-featured task view with Checklist, Comments (with live posting), Attachments (file upload via init/complete flow), Ball-in-Court badge, and Guest Invite stub
  - **React Query integration**: Optimistic updates and cache invalidation for comments/attachments
  - **Routing**: New `/task/:taskId` route for individual task views
  - Verified: Comments post successfully, auth headers work, all components render correctly
- **2025-10-21 (Afternoon)**: Added React frontend with DevAuthSwitcher for RBAC testing. Configured TailwindCSS styling and Axios API client with auth header interceptors. Verified end-to-end RBAC functionality: OPS users can create/update/comment on tasks, VIEWER users get 403 Forbidden errors as expected.