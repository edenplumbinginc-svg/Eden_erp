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
- **Database**: PostgreSQL (Neon) with SSL
- **Runtime**: Node.js 20
- **Dependencies**: express, pg
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
- `GET /health` - Health check (returns `{"ok": true}`)
- `GET /db/ping` - Database connectivity test
- `GET /db/users` - List all users (returns array of users with id, email, name)

## Running the Project
- **Start server**: `npm run dev` (runs on port 3000)
- **Verify setup**: `npm run verify`

## Recent Changes
- **Oct 18, 2025**: Backend API and database setup
  - Created Express.js server with PostgreSQL integration
  - Initialized database with schema (users, roles, permissions, projects, tasks, etc.)
  - Configured SSL for Neon database connection
  - Set up health check and database endpoints
  - Created directory structure for apps, core, ui, db
  - Defined PostgreSQL schema with auth, coordination, and notification tables

## Next Steps
This is a foundation/scaffolding project. Future development would include:
1. Implement authentication service
2. Build REST API or GraphQL endpoints
3. Create frontend UI components
4. Set up database migrations workflow
5. Implement core business logic for coordination and procurement
