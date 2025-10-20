# Eden ERP - Project Documentation

## Overview
Monolithic ERP shell for Eden Plumbing Inc. This is a foundation scaffolding (Track B) with database schema, organizational structure, and a basic REST API backend running on port 3000.

**Created**: October 18, 2025  
**Status**: Backend API Running - Foundation Phase

## Project Structure

### Core Directories
- **`apps/`** - Application modules
  - `coordination/` - Project and task coordination
  - `procurement/` - Procurement management
  
- **`core/`** - Core services and utilities
  - `auth/` - Authentication services
  - `email/` - Email functionality
  - `notifications/` - Notification system
  - `permissions/` - Permission management
  - `reporting/` - Reporting tools
  - `storage/` - File storage
  - `utils/` - Shared utilities

- **`ui/`** - Frontend components (not implemented)
  - `components/` - Reusable UI components
  - `hooks/` - Custom React hooks
  - `layouts/` - Page layouts

- **`db/`** - Database schema and migrations
  - `schema.sql` - PostgreSQL schema with users, roles, permissions, projects, tasks, notifications
  - `seed.sql` - Database seed data
  - `migrations/` - Future migration files

## Technology Stack
- **Backend**: Express.js REST API (port 3000)
- **Database**: Supabase PostgreSQL (Session pooler, IPv4 compatible)
- **Runtime**: Node.js 20
- **Dependencies**: express, pg, dotenv
- **Extensions**: pgcrypto, citext

## Database Schema
The schema includes:
- **Auth/ACL**: users, roles, permissions, user_roles, role_permissions
- **Coordination**: projects, tasks, task_comments, task_attachments
- **Notifications**: notifications table with channels (in_app, email, push)
- **Ball History**: Tracking task ownership transitions

## Environment Variables
See `.env.example` for required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- SMTP configuration for email
- `INBOUND_WEBHOOK_SECRET` - Webhook authentication

## API Endpoints
The backend server provides the following endpoints:

### System & Database
- `GET /health` - Health check (returns `{"ok": true}`)
- `GET /db/ping` - Database connectivity test
- `GET /db/users` - List all users from Supabase (returns array: id, email, name)
- `GET /routes` - Debug endpoint showing registered routes

### Projects API
- `GET /api/projects` - List all projects (ordered by created_at desc)
- `POST /api/projects` - Create new project
  - Body: `{"name": "string", "code": "string"}`
  - Returns: Created project with id, name, code, status, created_at

### Tasks API
- `GET /api/projects/:projectId/tasks` - List tasks for a specific project
- `POST /api/projects/:projectId/tasks` - Create task for a project
  - Body: `{"title": "string", "description": "string", "priority": "normal|high|urgent", "assignee_id": "uuid", "ball_in_court": "uuid", "due_at": "ISO date"}`
  - Returns: Created task with all fields

## Running the Project
- **Start server**: `npm run dev` (runs on port 3000)
- **Verify setup**: `npm run verify`

## Recent Changes
- **Oct 20, 2025 (Latest)**: Drizzle ORM Migration - Removed Boot-Time DDL
  - **Schema Management**: Replaced ad-hoc CREATE/ALTER statements with Drizzle ORM
  - **Introspection**: Successfully captured 17 tables, 111 columns, 22 foreign keys
  - **Clean Startup**: Server no longer creates schema on boot (200+ lines of DDL removed)
  - **Type Safety**: Generated TypeScript schema with full type definitions
  - **NPM Scripts**: Added db:push, db:generate, db:introspect, db:studio commands
  - **Files**: `drizzle/schema.ts`, `drizzle/relations.ts`, `drizzle.config.ts`
  - **Approach**: Using schema-first (db:push) for now, migration-first recommended for production
  - Addresses Architect's #2 critical issue (database lifecycle management)
  
- **Oct 20, 2025**: Database Contract Enforcement & Configuration Safety
  - **Single-Database Contract**: Added fail-fast validation to prevent dual-database issues
  - **Boot-Time Validation**: Server validates DATABASE_URL host at startup before pool creation
  - **Configuration Guard**: Optional EXPECTED_DB_HOST environment variable enforces strict host matching
  - **Legacy Detection**: Warns about SUPABASE_* environment variables to prevent confusion
  - **Clear Errors**: Exits immediately with detailed mismatch information if wrong database detected
  - **File**: `lib/config-db.js` - Reusable database configuration validation utilities
  - Prevents the Neon↔Supabase mix-up that caused uuid/bigint type errors
  
- **Oct 20, 2025**: Global Authentication Enforcement
  - **Security**: Enforced authentication on all /api/* routes
  - **Development Mode**: Dev headers (X-Dev-Email, X-Dev-User-Id) work in development
  - **Production Mode**: JWT Bearer token required (stub implementation, ready for Auth0/Clerk)
  - **Public Endpoints**: Health checks (/health, /api/health, /db/ping) remain public
  - **Error Format**: Structured error responses with code and message
  - **Middleware**: requireAuth and requireRole functions for granular access control
  - All 25+ API endpoints now protected against unauthorized access
  
- **Oct 18, 2025**: Major API Enhancements - Full CRUD + Advanced Reporting
  - **CRUD Operations**: Added UPDATE (PATCH) and DELETE for both projects and tasks
  - **Enhanced Reporting**: 5 reporting endpoints (status, owner, priority, overdue, activity)
  - **Performance**: Added database indexes for status and ball_in_court
  - **Schema Bootstrap**: Consolidated all table creation into single async function
  - **Quality**: Added updated_at column to tasks with automatic timestamp
  - **Validation**: Proper error handling and 404 responses
  - Total: 25+ API endpoints fully functional
  
- **Oct 18, 2025**: Projects and Tasks API Implementation
  - Added full CRUD API for projects (GET/POST /api/projects)
  - Added tasks API with project relationship (GET/POST /api/projects/:id/tasks)
  - Implemented auto-table creation for projects and tasks on server startup
  - Tables auto-create with proper foreign keys and constraints
  - Successfully tested all endpoints with Supabase database
  
- **Oct 18, 2025**: Backend API and Supabase Connection
  - Migrated from Replit Neon to Supabase PostgreSQL database
  - Using Supabase Session pooler (aws-1-us-east-2.pooler.supabase.com:5432) for IPv4 compatibility
  - Created Express.js server with connection pooling
  - Configured dotenv with override:true to prioritize .env file
  - Set up health check and database ping endpoints
  - Created directory structure for apps, core, ui, db
  - Defined PostgreSQL schema with auth, coordination, and notification tables
  - Verified connection to existing Supabase data (admin@edenmep.ca user)

## Next Steps
This is a foundation/scaffolding project. Future development would include:
1. Implement authentication service
2. Build REST API or GraphQL endpoints
3. Create frontend UI components
4. Set up database migrations workflow
5. Implement core business logic for coordination and procurement
