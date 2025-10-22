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