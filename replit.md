# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP shell designed for Eden Plumbing Inc., serving as a foundational scaffolding. Its primary purpose is to provide a robust backend with a well-defined database schema, organizational structure, and a basic REST API. The project aims to streamline business operations, starting with coordination and procurement, by offering a scalable and maintainable platform. This system is designed to be the backbone for future application modules, facilitating efficient management of projects, tasks, and resources within the company.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
The current focus is on backend development. A `ui/` directory is present for future frontend components, including reusable components, custom React hooks, and page layouts.

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
    - **Projects**: Full CRUD operations (`GET`, `POST`, `PATCH`, `DELETE` on `/api/projects`).
    - **Tasks**: Full CRUD operations for tasks associated with projects (`GET`, `POST`, `PATCH`, `DELETE` on `/api/projects/:projectId/tasks`).
    - **Reporting**: 5 specialized reporting endpoints (status, owner, priority, overdue, activity).
- **Notifications**: System supports `in_app`, `email`, and `push` notification channels.

### System Design Choices
- **Monolithic Architecture**: Designed as a single, cohesive unit to simplify initial development and deployment.
- **Scalable Database**: Utilizes PostgreSQL with a session pooler for efficient connection management and scalability.
- **Observability**: Built-in comprehensive monitoring, logging, and health check features are integral to the system design for robust production operation.
- **Secure by Design**: Enforced authentication on API routes and multi-layered database configuration validation.

## External Dependencies
- **Database**: Supabase PostgreSQL
- **Backend Framework**: Express.js
- **Database Driver**: `pg` (Node.js PostgreSQL client)
- **Environment Variables**: `dotenv`
- **ORM**: Drizzle ORM
- **PostgreSQL Extensions**: `pgcrypto`, `citext`