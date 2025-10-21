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
- **Monitoring**: Comprehensive production monitoring system with health checks (quick, detailed, liveness, readiness, metrics), structured JSON logging with severity levels, and automated smoke tests.
- **Database Configuration Safety**: Multi-layered validation framework ensures the application connects to the correct database instance, preventing mismatches and providing detailed diagnostic information.
- **Database Diagnostics**: Full diagnostic infrastructure with retry/backoff logic, DNS resolution, comprehensive `/diag/db` endpoint, and fail-fast startup behavior. Reduces MTTR (Mean Time To Repair) from days to minutes by providing instant visibility into connection, TLS, DNS, and latency issues.
- **Automation**: Includes an automated job for sending idle task reminders, leveraging `last_activity_at` timestamps.

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