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
