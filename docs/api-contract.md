# API Contract - EDEN ERP

## Overview
This document describes the core API endpoints for the EDEN ERP Coordination module.

**Base URL (development):** `http://localhost:3000`  
**Authentication:** Dev headers (`X-Dev-User-Email`, `X-Dev-User-Id`) or JWT Bearer tokens

---

## Smoke Test

Run a quick health check against the live API:

```bash
BASE_URL="http://localhost:3000" npm run smoke:api
```

### Pass Criteria
- `/healthz` returns `{ status: "ok" }`
- `/api/projects` returns an array (≥1)
- `/api/projects/:id/tasks` returns an array
- `/api/notifications/recent` returns an array
- `/api/reports/tasks/status` returns task counts by status

---

## Core Endpoints

### Health Check
```bash
GET /healthz
# Response: { status: "ok", db: true, ... }
```

### Projects
```bash
# List all projects
GET /api/projects
Header: X-Dev-User-Email: test@edenplumbing.com
Header: X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2

# Get single project
GET /api/projects/:id

# Create project
POST /api/projects
Body: { "name": "Project Name", "description": "..." }
```

### Tasks
```bash
# List tasks for a project
GET /api/projects/:projectId/tasks

# Get single task
GET /api/tasks/:id

# Create task
POST /api/projects/:projectId/tasks
Body: { "title": "Task Title", "status": "todo" }

# Update task
PATCH /api/tasks/:id
Body: { "status": "done" }
```

### Subtasks
```bash
# Create subtask
POST /api/tasks/:taskId/subtasks
Body: { "title": "Subtask Title", "done": false }

# Update subtask
PATCH /api/tasks/subtasks/:id
Body: { "done": true }
```

### Notifications
```bash
# Get recent notifications
GET /api/notifications/recent
```

### Reports
```bash
# Tasks by status
GET /api/reports/tasks/status
# Response: [{ status: "todo", count: 10 }, ...]

# Tasks by owner (ball in court)
GET /api/reports/tasks/ball
# Response: [{ owner: "user@example.com", count: 5 }, ...]

# Tasks by priority
GET /api/reports/tasks/priority
# Response: [{ priority: "high", count: 3 }, ...]

# Overdue tasks
GET /api/reports/tasks/overdue
# Response: [{ id, title, priority, due_at, project_name, owner }, ...]

# Recent activity (last 7 days)
GET /api/reports/activity/recent
# Response: [{ day: "2025-10-22", tasks_created: 8 }, ...]
```

### Guest Links
```bash
# Resolve guest token
GET /api/guest/resolve?token=UUID
# Public endpoint (no auth required)
```

### User Preferences
```bash
# Get current user preferences
GET /api/me/preferences
Header: X-Dev-User-Email: test@edenplumbing.com
Header: X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2

# Response:
{
  "ok": true,
  "data": {
    "user_id": "855546bf-f53d-4538-b8d5-cd30f5c157a2",
    "default_project_id": "proj-123",
    "tasks_group_by": "status",
    "updated_at": "2025-10-22T15:30:00Z"
  }
}

# Update user preferences
PUT /api/me/preferences
Header: X-Dev-User-Email: test@edenplumbing.com
Header: X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2
Content-Type: application/json
Body: {
  "default_project_id": "proj-456",
  "tasks_group_by": "due"
}

# Response:
{
  "ok": true,
  "data": {
    "user_id": "855546bf-f53d-4538-b8d5-cd30f5c157a2",
    "default_project_id": "proj-456",
    "tasks_group_by": "due",
    "updated_at": "2025-10-22T15:35:00Z"
  }
}
```

**Valid `tasks_group_by` options:** `status`, `due`, `none`

### Operations (Admin)
```bash
# Recompute overdue flags for all tasks
POST /api/ops/overdue/recompute
Header: X-Dev-User-Email: test@edenplumbing.com
Header: X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2

# Response:
{
  "ok": true,
  "set_true": 5,    // Tasks marked as overdue
  "set_false": 2    // Tasks cleared from overdue
}

# Example cURL:
curl -X POST http://localhost:3000/api/ops/overdue/recompute \
  -H "X-Dev-User-Email: test@edenplumbing.com" \
  -H "X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2"
```

**Automation:** This endpoint is automatically called daily at 3:00 AM (America/Toronto timezone) via node-cron. Manual triggers are available via the "Refresh Overdue" button in the Modern UI dashboard.

**Audit Logging:** Each recompute writes an audit log entry with action `"system.overdue.recompute"`.

```bash
# Recompute idle reminder flags for all tasks
POST /api/ops/idle/recompute
Header: X-Dev-User-Email: test@edenplumbing.com
Header: X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2

# Response:
{
  "ok": true,
  "set_true": 10,   // Tasks marked as needing idle reminders
  "set_false": 7    // Tasks cleared from idle reminders
}

# Example cURL:
curl -X POST http://localhost:3000/api/ops/idle/recompute \
  -H "X-Dev-User-Email: test@edenplumbing.com" \
  -H "X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2"
```

**Automation:** This endpoint is automatically called daily at 9:05 AM (America/Toronto timezone) via node-cron.

**Idle Logic:** Tasks are marked as idle if:
- `updated_at` is older than N days (default 3, configurable via `IDLE_DAYS` env var)
- Status is NOT 'done' or 'cancelled'
- Not currently snoozed (idle_snoozed_until < now())

**Audit Logging:** Each recompute writes an audit log entry with action `"system.idle.recompute"`.

```bash
# Snooze idle reminder for a specific task
PUT /api/tasks/:id/snooze_idle
Header: X-Dev-User-Email: test@edenplumbing.com
Header: X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2
Content-Type: application/json
Body: {
  "days": 3
}

# Response:
{
  "ok": true,
  "data": {
    "id": "task-123",
    "idle_snoozed_until": "2025-10-25T12:00:00Z",
    "needs_idle_reminder": false
  }
}

# Example cURL:
curl -X PUT http://localhost:3000/api/tasks/<TASK_ID>/snooze_idle \
  -H "X-Dev-User-Email: test@edenplumbing.com" \
  -H "X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2" \
  -H "Content-Type: application/json" \
  -d '{"days": 3}'
```

**Validation:** Days must be between 1 and 30.

**UI Integration:** The "Snooze 3d" button appears next to tasks with the "Idle" badge in the Modern UI.

**Audit Logging:** Each snooze writes an audit log entry with action `"task.idle.snooze"`.

---

## Auto-Actions

### Parent Task Auto-Complete
When all subtasks of a parent task are marked `done: true`, the parent automatically transitions to `status: "done"`.

**Audit Log Entry:**
```json
{
  "action": "task.autoclose",
  "details": { "reason": "all_subtasks_done", "old_status": "todo", "new_status": "done" }
}
```

**Manual Override:** Set `status_locked: true` on a task to prevent auto-status updates.

---

## Dev Authentication

For local development, use these headers on all `/api/*` routes:

```
X-Dev-User-Email: test@edenplumbing.com
X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2
```

For production, use JWT Bearer tokens:
```
Authorization: Bearer <jwt_token>
```

---

## Error Handling

All endpoints return standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (duplicate/constraint violation)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message",
  "details": { /* validation errors if applicable */ }
}
```
