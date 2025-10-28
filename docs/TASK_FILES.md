# Task Files Feature - Technical Documentation

**Status:** 🚧 **Data Layer Complete** (API/RBAC/Frontend pending)  
**Date:** 2025-10-28  
**Branch:** `slice/tasks-attachments-v1`

---

## Overview

Generic file attachments for tasks, supporting PDF, JPG, PNG with 10MB size limit. Following the same defense-in-depth pattern as voice notes.

**Current Implementation:** ✅ Database schema only  
**Planned Layers:** API → RBAC → Frontend → Feature Flag → Tests → Docs

---

## Database Schema

### Table: `task_files`

```sql
CREATE TABLE task_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,        -- storage URL or path
  filename     TEXT NOT NULL,        -- original filename for UX
  mime         TEXT NOT NULL,        -- server-validated MIME type
  size         INTEGER NOT NULL,     -- bytes
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT task_files_size_max CHECK (size > 0 AND size <= 10485760)
);
```

### Indexes

**Hot path index** (list by task, newest-first):
```sql
CREATE INDEX idx_task_files_task_created_at
  ON task_files (task_id, created_at DESC);
```

**Quick count index** (for badge counts):
```sql
CREATE INDEX idx_task_files_task_id
  ON task_files (task_id);
```

### Constraints

**Size Limit (10 MB):**
```sql
CHECK (size > 0 AND size <= 10485760)
```

**Foreign Keys:**
- `task_id` → `tasks(id)` with `ON DELETE CASCADE` (no orphans)
- `created_by` → `users(id)` (uploader tracking)

---

## Design Decisions

### Why 10MB Limit?
- Balance between usability (large PDFs, high-res photos) and abuse prevention
- Enforced at **both** database and application layers (defense-in-depth)
- Server will reject uploads >10MB with **413 Payload Too Large**

### Why CASCADE DELETE?
- When a task is deleted, its files should disappear automatically
- Prevents orphaned files cluttering storage
- Matches voice notes pattern for consistency

### Why Store MIME Type?
- Server validates actual MIME (not just file extension)
- Prevents malicious file uploads disguised as PDFs
- Enables proper Content-Type headers on download/preview

### Why Separate Indexes?
1. **Hot path** (task_id, created_at DESC):
   - Used by `GET /api/tasks/:id/files` (list files for a task)
   - Chronological sorting without table scan
   
2. **Quick count** (task_id):
   - Used by task list badge query: `SELECT COUNT(*) WHERE task_id = ?`
   - Enables fast `attachments_count` subquery
   - Same pattern as `voice_notes_count`

---

## Migration

### Applied
✅ **2025-10-28:** Created `task_files` table with indexes and constraints

### Rollback (if needed)
```sql
DROP INDEX IF EXISTS idx_task_files_task_id;
DROP INDEX IF EXISTS idx_task_files_task_created_at;
DROP TABLE IF EXISTS task_files;
```

---

## Verification

### Table Structure
```bash
# Columns
id           | uuid                     | NOT NULL | gen_random_uuid()
task_id      | uuid                     | NOT NULL |
url          | text                     | NOT NULL |
filename     | text                     | NOT NULL |
mime         | text                     | NOT NULL |
size         | integer                  | NOT NULL |
created_by   | uuid                     | NOT NULL |
created_at   | timestamptz              | NOT NULL | now()
```

### Constraints
```
✅ task_files_size_max: CHECK ((size > 0) AND (size <= 10485760))
✅ task_files_task_id_fkey: FOREIGN KEY (task_id) → tasks(id) ON DELETE CASCADE
✅ task_files_created_by_fkey: FOREIGN KEY (created_by) → users(id)
```

### Indexes
```
✅ task_files_pkey (PRIMARY KEY on id)
✅ idx_task_files_task_created_at (task_id, created_at DESC)
✅ idx_task_files_task_id (task_id)
```

---

## Next Steps (Planned)

### Layer 2: API + RBAC
- [ ] `POST /api/tasks/:id/files` (multipart upload, 10MB limit)
- [ ] `GET /api/tasks/:id/files` (list files for task)
- [ ] `GET /api/tasks` enhancement (add `attachments_count` subquery)
- [ ] RBAC permissions: `tasks.files.create`, `tasks.files.read`
- [ ] Middleware: size validation, MIME filtering, 413/400/403 errors

### Layer 3: Frontend Components
- [ ] FileUpload.jsx (drag-drop, file picker, upload progress)
- [ ] FilesList.jsx (display, download, preview)
- [ ] TaskDetail.jsx integration (below comments)
- [ ] TaskItem.jsx badge (📎 N when attachments exist)

### Layer 4: Feature Flag
- [ ] `taskAttachments` in `features.json` (default OFF for safe rollout)
- [ ] FeatureGate wrapper for UI components

### Layer 5: Tests + Docs
- [ ] Curl tests (upload, list, size limit, RBAC)
- [ ] Frontend smoke tests
- [ ] Update CHANGELOG.md

---

**Definition of Done (for full vertical slice):**
- [x] Database schema created
- [ ] API endpoints functional (201/200/400/403/413)
- [ ] RBAC enforced (create/read permissions)
- [ ] Frontend uploads/lists files
- [ ] Badge shows count on task list
- [ ] Feature flag OFF by default
- [ ] All tests passing
- [ ] Documentation complete
