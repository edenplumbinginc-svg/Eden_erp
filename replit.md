# EDEN - Project Documentation

## Overview
EDEN ERP is a monolithic ERP system for EDEN (formerly Eden Plumbing Inc.), designed to streamline business operations, initially focusing on coordination and procurement. It provides a robust backend with a defined database schema and a basic REST API. The business vision is to create a comprehensive, scalable platform that integrates various operational aspects, improving efficiency and coordination.

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with Vite, styled with Google Material Design and custom CSS, emulating a professional Google Workspace aesthetic. This includes a specific color palette (Emerald brand palette, hue 160°), Inter variable font, an 8px spacing grid, a 4-level elevation system, and smooth transitions (Framer Motion). A `DevAuthSwitcher` is implemented for development-time user role switching. API integration is handled via an Axios-based client. The project follows a monorepo structure with the frontend in `apps/coordination_ui/`.

A modern design token layer using CSS variables provides centralized control over colors, typography, spacing, radius, shadows, and motion, including automatic dark mode support and motion-reduced-safe animations. A `ThemeProvider` component provides persistent light/dark/auto theme selection with OS theme synchronization and keyboard shortcuts. Subtle Framer Motion-powered page transitions are implemented, respecting `prefers-reduced-motion`. In-app documentation includes a `/styleguide` page, a `/showcase` page for visual testing, and an `/about/eden` page.

### Technical Implementations
The backend is built with Express.js, Node.js 20, and uses Supabase PostgreSQL with Drizzle ORM. Authentication relies on Supabase Auth with JWT verification and a comprehensive RBAC system enforced via middleware and a permission-aware UI. A five-layer performance optimization stack includes localStorage caching, ETag-based conditional requests, warm-boot preloading, and a delta sync mechanism. A "realtime-lite" change beacon system uses polling. Middleware handles Zod schema validation, rate limiting, audit logs, and idempotency. The system includes an in-app notification system, user preferences, automated overdue/idle task tracking, and auto-completion of parent tasks, with recent additions for SMS capabilities via Twilio.

Core modules include `coordination` (projects, tasks, comments, attachments, voice notes, file attachments) and `procurement`. The API provides CRUD operations for Projects and Tasks, nested task creation, comment management, and specialized reporting with server-side filtering, pagination, and sorting. Reporting features include dashboard cards, a performance leaderboard with CSV export, and a guest view for public read-only access. A complete department ball handoff workflow is implemented with an audit trail and notifications. An Admin RBAC UI (`/admin/rbac`) provides user management.

Key features include a full-featured checklist system with RBAC-protected endpoints, drag-and-drop reordering, optimistic updates. A voice notes system (flagged, internal-only) allows recording and playback of audio notes on tasks with MediaRecorder API, triple-layer security (flag + frontend RBAC + backend RBAC), 🎙️ badge on task lists, and 5MB/120s limits. A file attachments system provides secure file uploads to tasks with multer disk storage, MIME type allowlist (PDF, images, CSV, XLSX), 10MB limit, RBAC enforcement (tasks.files.create/read), and defense-in-depth security (attachments_count field conditionally exposed). A micro-telemetry system logs completion metrics for performance analytics. An automated low-risk decision engine (Auto-Decisions v0) runs every 5 minutes, evaluating policies and logging executions. A comprehensive handoff tracking and bottleneck analysis system ("Ball-in-Court Analytics") provides metrics via a REST API and UI components.

A production-grade observability stack includes Sentry for error monitoring, Pino for structured JSON logging, robust health probes, and auto-restart resilience guards. Velocity Metrics provide lightweight per-route telemetry with a real-time Velocity Dashboard UI, p95 regression detection, and Sentry correlation. Machine-Readable Alarms (`/ops/alarms`) automate detection of operational issues, and a Slack Alerter sends critical-severity alarms to Slack. Historical Metrics Persistence snapshots KPIs to a Postgres table. Release Impact API/UI, SLO Evaluation API/UI, and Release Guard API/UI provide deployment safety and performance validation. Incident Management uses a dedicated table to track, acknowledge, and escalate incidents, with an Incident Escalation Worker and ChatOps integration for incident acknowledgment.

A TypeScript-based Route Coverage Map (`/routes`) provides a visual inventory of all 34 application routes with metadata. The manifest (`src/routes.manifest.ts`) serves as a single source of truth for route documentation and automated smoke testing. Playwright tests verify each route mounts successfully. Quality gates include automated accessibility testing via axe-core (WCAG 2.0 Level A/AA compliance) and light/dark mode visual regression snapshots for all static routes. A test-only authentication bypass (`VITE_E2E=true` or `?e2e=1` query param) allows automated testing. Production-grade environment variable validation with Zod schemas is implemented, along with a config health endpoint. User Profile Management is available via an API for optional user fields. An automated UI Coverage Gate enforces complete page coverage based on a contract (`docs/ui-contract.yaml`). CI Quality Gates (`.github/workflows/quality-gates.yml`) automate quality enforcement.

### System Design Choices
The project adopts a monolithic architecture with a scalable PostgreSQL database. It emphasizes observability through monitoring, logging, and health checks, and is designed for security with enforced authentication and multi-layered database validation. An `autosync.sh` script automates Git commits and pushes.

## External Dependencies

### Backend
- **Database**: Supabase PostgreSQL
- **Backend Framework**: Express.js
- **ORM**: Drizzle ORM
- **PostgreSQL Extensions**: `pgcrypto`, `citext`
- **Email**: Nodemailer
- **SMS**: Twilio
- **Scheduling**: `node-cron`
- **Error Monitoring**: Sentry
- **Logging**: Pino

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **HTTP Client**: Axios
- **Data Fetching**: React Query
- **Error Monitoring**: @sentry/react