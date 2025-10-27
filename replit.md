# Eden ERP - Project Documentation

## Overview
Eden ERP is a monolithic ERP system for Eden Plumbing Inc., designed to streamline business operations, initially focusing on coordination and procurement. It provides a robust backend with a defined database schema and a basic REST API, serving as a scalable platform for future application modules to efficiently manage projects, tasks, and resources. The business vision is to create a comprehensive, scalable platform that integrates various operational aspects, improving efficiency and coordination.

## Recent Changes

### October 27, 2025 - Quality Gates Stabilization
**Status**: Production-ready with 6 automated quality gates running 204 tests

**Key Accomplishments**:
1. **Fixed Critical App.jsx Syntax Error** - Diagnosed and removed corrupted Main wrapper component (lines 373, 411-412) that was causing React build failures and breaking the application layout.

2. **Enhanced UI Coverage Checker** - Updated `scripts/check-ui-coverage.js` to properly handle multi-part route names (e.g., `/about/eden` → `AboutEden.jsx`), ensuring accurate detection of all 27 page components.

3. **Quality Gates Validation** - Verified local test suite passes completely:
   - ✅ UI Coverage: 27/27 pages found
   - ✅ Route Coverage: All routes in manifest
   - ✅ Accessibility: WCAG 2.0 A/AA compliance via axe-core
   - ✅ Visual Regression: Light/dark mode snapshots for all static routes

4. **Git Workflow Verification** - Confirmed autosync.sh successfully commits and pushes changes to GitHub every 5 minutes, maintaining continuous integration.

5. **GitHub Actions Status** - Fixes committed (d73e665, a90906c) and pushed to origin/main at 04:32:49. Manual workflow re-run required to pick up latest changes due to caching/timing issue.

**Decisions Made**:
- Maintain test-only authentication bypass (`VITE_E2E=true` or `?e2e=1` query param) for automated Playwright tests
- Continue using contract-driven UI coverage enforcement via `docs/ui-contract.yaml`
- Keep CI in manual-trigger mode per user preference

**Current State**:
- Local development environment: ✅ Fully operational
- Frontend (Modern UI): ✅ Building and serving on port 5000
- Backend: ✅ Running with health checks passing
- Quality Gates: ⏳ Awaiting manual GitHub Actions workflow trigger
- Test Suite: ✅ 204 tests ready (route coverage, accessibility, visual regression)

**Next Steps**:
- User to manually trigger `.github/workflows/quality-gates.yml` workflow in GitHub Actions
- Monitor CI results to confirm all 6 quality gates pass
- Consider notification system enhancements (email/SMS channels, user preferences, escalation rules)

### October 27, 2025 - Notification Capabilities Audit
**Status**: Debug endpoint deployed

**Key Accomplishments**:
1. **Created Notification Debug Endpoint** - Added `GET /api/notifications/debug` (Admin-only) to introspect current notification capabilities and provider configuration.

2. **Discovered Current Notification Infrastructure**:
   - ✅ In-app notifications: Fully implemented with bell UI, unread badge, mark-as-read
   - ✅ Email: Nodemailer with SMTP support (or console fallback in dev)
   - ✅ Slack escalation: Webhook-based incident escalation system
   - ✅ Queue system: In-memory job queue with handlers
   - ❌ SMS/Voice/WhatsApp: Not yet implemented

3. **Identified Enhancement Opportunities**:
   - Add Twilio adapter for SMS/WhatsApp/voice notifications
   - Implement user notification preferences (per-channel, per-event)
   - Add quiet hours and digest mode
   - Enable channel selection UI

**Files Modified**:
- `routes/notifications.debug.js` (created)
- `routes/notifications.js` (wired debug endpoint)

**How to Use**:
```bash
# Test the debug endpoint (requires Admin/System role):
curl -H "Authorization: Bearer <your-token>" http://localhost:3000/api/notifications/debug
```

The endpoint returns a comprehensive capabilities report including:
- Available notification channels (in-app, email, SMS, voice, WhatsApp, Slack)
- Provider configuration status (SMTP, Twilio, SendGrid, Resend, etc.)
- Infrastructure status (queue, escalation worker)
- Feature flags and recommended next steps

### October 27, 2025 - SMS Notification Channel Implementation
**Status**: SMS infrastructure deployed, ready for configuration

**Key Accomplishments**:
1. **Created Twilio SMS Provider Adapter** - Implemented `providers/sms.twilio.js` with feature flag support and comprehensive error handling.

2. **Enhanced Notifications Service** - Added SMS capability to `services/notifications.js`:
   - `sendSMSNotification({ to, body, template, data })` - Main SMS sending function
   - Template rendering system for common notification types (task_assigned, task_overdue, ball_handoff, urgent_alert)
   - Provider capabilities introspection for diagnostics

3. **Added Test Endpoint** - Created `POST /api/notifications/test-sms` (Admin/System only) for testing SMS delivery with template support.

4. **Updated Debug Endpoint** - Enhanced `/api/notifications/debug` to report SMS provider status, configuration, and feature flags.

5. **Installed Dependencies** - Added `twilio` package to support SMS/MMS messaging.

**Files Created/Modified**:
- `providers/sms.twilio.js` (created) - Twilio adapter with feature flag
- `services/notifications.js` (updated) - Added SMS methods and templates
- `routes/notifications.js` (updated) - Added test-sms endpoint
- `routes/notifications.debug.js` (updated) - SMS capability reporting
- `package.json` (updated) - Added twilio dependency

**How to Enable SMS**:
```bash
# Add to .env or configure as secrets:
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM=+1234567890
FEATURE_SMS=true
```

**Test SMS Sending**:
```bash
# Using raw body:
curl -X POST http://localhost:3000/api/notifications/test-sms \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","body":"Eden ERP: SMS channel online ✅"}'

# Using template:
curl -X POST http://localhost:3000/api/notifications/test-sms \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","template":"task_assigned","data":{"taskTitle":"Fix leak","projectName":"Main St Remodel"}}'
```

**Architecture Notes**:
- SMS provider is feature-flagged (FEATURE_SMS=true) for safe rollout
- Clean adapter pattern allows easy addition of WhatsApp/Voice channels
- Template system prevents message duplication across codebase
- All SMS operations return structured results: `{ ok, sid?, error? }`

**Next Steps**:
- Add Twilio credentials to enable SMS notifications
- Implement user notification preferences (channel selection per event type)
- Add quiet hours support (9 PM - 8 AM no notifications)
- Enable WhatsApp channel via Twilio (requires WhatsApp Business Account)

## User Preferences
I prefer iterative development, with a focus on delivering functional increments. Please ask before making major architectural changes or introducing new dependencies. I appreciate clear and concise explanations for complex topics. Ensure the codebase remains clean, well-documented, and adheres to established patterns.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with Vite, styled with Google Material Design and custom CSS, emulating a professional Google Workspace aesthetic. This includes a specific color palette (Emerald brand palette, hue 160°), Inter variable font, an 8px spacing grid, a 4-level elevation system, and smooth transitions (Framer Motion). A `DevAuthSwitcher` is implemented for development-time user role switching. API integration is handled via an Axios-based client. The project follows a monorepo structure with the frontend in `apps/coordination_ui/`.

A modern design token layer using CSS variables provides centralized control over colors, typography, spacing, radius, shadows, and motion, including automatic dark mode support and motion-reduced-safe animations. A `ThemeProvider` component provides persistent light/dark/auto theme selection with OS theme synchronization and keyboard shortcuts. Subtle Framer Motion-powered page transitions are implemented, respecting `prefers-reduced-motion`. A "premium visual polish" has been applied, including soft shadows, focus rings, and glass header effects.

In-app documentation includes a `/styleguide` page showcasing the token-driven Material Design system and a `/showcase` page providing visual testing and single-click navigation for all routes. A `/about/eden` page documents workflow and differentiation for stakeholders.

### Technical Implementations
The backend is built with Express.js, Node.js 20, and uses Supabase PostgreSQL with Drizzle ORM. Authentication relies on Supabase Auth with JWT verification and a comprehensive RBAC system enforced via middleware and a permission-aware UI. A five-layer performance optimization stack includes localStorage caching, ETag-based conditional requests, warm-boot preloading, and a delta sync mechanism. A "realtime-lite" change beacon system uses polling. Middleware handles Zod schema validation, rate limiting, audit logs, and idempotency. The system includes an in-app notification system, user preferences, automated overdue/idle task tracking, and auto-completion of parent tasks.

Core modules include `coordination` (projects, tasks, comments, attachments) and `procurement`. The API provides CRUD operations for Projects and Tasks, nested task creation, comment management, and specialized reporting with server-side filtering, pagination, and sorting. Reporting features include dashboard cards, a performance leaderboard with CSV export, and a guest view for public read-only access. A complete department ball handoff workflow is implemented with an audit trail and notifications. An Admin RBAC UI (`/admin/rbac`) provides user management.

Key features include a full-featured checklist system with RBAC-protected endpoints, drag-and-drop reordering, and optimistic updates. A micro-telemetry system logs completion metrics for performance analytics. An automated low-risk decision engine (Auto-Decisions v0) runs every 5 minutes, evaluating policies and logging executions. A comprehensive handoff tracking and bottleneck analysis system ("Ball-in-Court Analytics") provides metrics via a REST API and UI components.

A production-grade observability stack includes Sentry for error monitoring, Pino for structured JSON logging, robust health probes, and auto-restart resilience guards. Velocity Metrics provide lightweight per-route telemetry with a real-time Velocity Dashboard UI, p95 regression detection, and Sentry correlation. Machine-Readable Alarms (`/ops/alarms`) automate detection of operational issues, and a Slack Alerter sends critical-severity alarms to Slack. Historical Metrics Persistence snapshots KPIs to a Postgres table. Release Impact API/UI, SLO Evaluation API/UI, and Release Guard API/UI provide deployment safety and performance validation. Incident Management uses a dedicated table to track, acknowledge, and escalate incidents, with an Incident Escalation Worker and ChatOps integration for incident acknowledgment.

A TypeScript-based Route Coverage Map (`/routes`) provides a visual inventory of all 34 application routes with metadata (title, owner, criticality). The manifest (`src/routes.manifest.ts`) serves as a single source of truth for route documentation and automated smoke testing. Playwright tests verify each route mounts successfully, with stricter validation for critical routes.

Quality gates include automated accessibility testing via axe-core (WCAG 2.0 Level A/AA compliance) and light/dark mode visual regression snapshots for all static routes. Tests run via `npm run test:a11y` for accessibility, `npm run test:visual` for visual regression, and `npm run test:quality` for the complete suite. The system ensures routes are not only present but also usable and visually stable.

A test-only authentication bypass allows automated tests to mount routes without requiring login credentials. The bypass is explicitly opt-in via environment variable (`VITE_E2E=true`) or query parameter (`?e2e=1`), ensuring production security while enabling comprehensive route testing. Motion-freeze CSS reduces visual test flakiness by minimizing animation variance.

Production-grade environment variable validation with Zod schemas is implemented, along with a config health endpoint. User Profile Management is available via an API for optional user fields. An automated UI Coverage Gate enforces complete page coverage based on a contract (`docs/ui-contract.yaml`), preventing half-built features. A contract-driven Playwright test suite (`Navigation Smoke Test`) validates all routes, including authenticated ones, and integrates with CI/CD. CI Quality Gates (`.github/workflows/quality-gates.yml`) automate quality enforcement, including builds, UI coverage checks, and smoke tests, on every PR and push to main.

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