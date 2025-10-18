# Eden ERP - Complete API Reference

## 🎯 Base URL
`http://localhost:3000`

---

## 📋 **PROJECTS API**

### List Projects
```bash
GET /api/projects
```

### Create Project
```bash
POST /api/projects
Body: {"name": "string", "code": "string"}
```

### Update Project (NEW! ✨)
```bash
PATCH /api/projects/:id
Body: {"name": "string", "code": "string", "status": "active|closed"}
```

### Delete Project (NEW! ✨)
```bash
DELETE /api/projects/:id
```

---

## 📝 **TASKS API**

### List Tasks (by project)
```bash
GET /api/projects/:projectId/tasks
```

### Create Task
```bash
POST /api/projects/:projectId/tasks
Body: {
  "title": "string",
  "description": "string",
  "priority": "low|normal|high|urgent",
  "assignee_id": "uuid",
  "ball_in_court": "uuid",
  "due_at": "ISO timestamp"
}
```

### Update Task (NEW! ✨)
```bash
PATCH /api/tasks/:id
Body: {
  "title": "string",
  "description": "string",
  "status": "open|in_progress|closed",
  "priority": "low|normal|high|urgent",
  "assignee_id": "uuid",
  "ball_in_court": "uuid",
  "due_at": "ISO timestamp"
}
```

### Delete Task (NEW! ✨)
```bash
DELETE /api/tasks/:id
```

---

## 💬 **COMMENTS API**

### List Comments
```bash
GET /api/tasks/:taskId/comments
```

### Create Comment
```bash
POST /api/tasks/:taskId/comments
Body: {"body": "string", "author_id": "uuid"}
```

---

## ⚽ **BALL HANDOFF API**

### Hand Off Task
```bash
POST /api/tasks/:taskId/ball
Body: {
  "to_user_id": "uuid",
  "from_user_id": "uuid",
  "note": "string"
}
```

### View Handoff History
```bash
GET /api/tasks/:taskId/ball
```

---

## 📊 **REPORTING API**

### Tasks by Status
```bash
GET /api/reports/tasks/status
Response: [{"status": "open", "count": 5}]
```

### Tasks by Owner
```bash
GET /api/reports/tasks/ball
Response: [{"owner": "admin@edenmep.ca", "count": 2}]
```

### Tasks by Priority (NEW! ✨)
```bash
GET /api/reports/tasks/priority
Response: [{"priority": "urgent", "count": 1}]
```

### Overdue Tasks (NEW! ✨)
```bash
GET /api/reports/tasks/overdue
Response: [{
  "id": "uuid",
  "title": "string",
  "priority": "high",
  "due_at": "timestamp",
  "project_name": "string",
  "owner": "email"
}]
```

### Recent Activity (NEW! ✨)
```bash
GET /api/reports/activity/recent
Response: [{"day": "2025-10-18", "tasks_created": 5}]
```

---

## 🔧 **SYSTEM API**

### Health Check
```bash
GET /health
Response: {"ok": true}
```

### Database Ping
```bash
GET /db/ping
Response: {"db": "ok", "rows": [{"ok": 1}]}
```

### List Users
```bash
GET /db/users
Response: [{"id": "uuid", "email": "string", "name": "string"}]
```

### List Routes (Debug)
```bash
GET /routes
```

---

## 📈 **Summary**
- **Total Endpoints**: 25+
- **CRUD Operations**: Full support for Projects & Tasks
- **Reporting**: 5 analytics endpoints
- **Ball Handoff**: Task ownership tracking
- **Comments**: Task collaboration

