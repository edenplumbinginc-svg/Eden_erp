# EDEN ERP - Change Log

## 2025-10-28: Tasks → Attachments (Files)

### Added
- Task attachments (files): POST/GET /api/tasks/:id/files with 10MB limit and MIME allowlist.
- Tasks list `attachments_count` (RBAC-aware, no existence leak).
- Frontend AttachmentsPanel + 📎 badge behind `taskAttachments` flag.

### API Layer
- **POST /api/tasks/:id/files** - Upload file attachment
  - Multipart file upload with multer middleware
  - 10MB file size limit enforced
  - MIME type allowlist: pdf, jpg/jpeg, png, webp, heic/heif, csv, xlsx
  - Returns 201 on success, 400 (validation), 403 (permission), 404 (task not found), 413 (file too large)

- **GET /api/tasks/:id/files** - List file attachments
  - Returns array of attachments with id, taskId, url, filename, mime, size, createdAt, createdBy
  - Returns 200 on success, 403 (permission), 404 (task not found)

- **GET /api/tasks** - Enhanced task list
  - Added `attachments_count` field (conditionally exposed based on tasks.files.read permission)

### RBAC Layer
- **tasks.files.create permission:** Upload files (Admin, Ops Lead, Field Ops, PM, Contributor, Office Admin)
- **tasks.files.read permission:** View/list files (all 14 roles)

### Frontend Components
- **AttachmentsPanel.jsx**
  - Compact inline upload button
  - File list with download links
  - Upload states: loading ("Uploading…") and error handling
  - Protected by `<FeatureGate feature="taskAttachments">`
  - RoutePermission guard for tasks.files.read
  - RequirePermission guard for tasks.files.create on upload control

- **TaskItem.jsx Badge**
  - 📎 badge shows attachment count on task list
  - Feature-gated (taskAttachments flag) + RBAC-guarded (tasks.files.read permission)
  - Only visible when count > 0
  - Defense-in-depth: no existence leak for unauthorized users

### Feature Flag
- **taskAttachments:** Defaults to **TRUE** (internal testing)
- Configured in `apps/coordination_ui/src/config/features.json`

### Security
- Backend enforces RBAC for count exposure and endpoints.
- DB CHECK on `task_files.size` prevents oversize writes.
- Rejected files are deleted on-disk.
- Existence leak prevented: attachments_count omitted unless tasks.files.read.
- Size enforced by multer and DB CHECK.

### Documentation
- **Updated:** `docs/TASK_FILES.md` with complete API documentation and security notes

### Architect Review
✅ **Production-Ready** with compact inline UI design
- RBAC enforcement complete (frontend + backend)
- Query invalidation uses ["tasks", "list"] for proper cache management
- Compact inline layout matches specification
- All security patterns implemented correctly

---

## 2025-10-28: Tasks → Voice Notes (Flagged, Internal)

### Summary
Implemented comprehensive voice notes feature for Tasks module with MediaRecorder API, RBAC enforcement, and feature flag safety. This is an **internal-only** feature requiring manual flag activation.

### Database Layer
- **Added table:** `task_voice_notes`
  - `id` (uuid, primary key)
  - `task_id` (uuid, foreign key with CASCADE DELETE)
  - `file_url` (text, path to audio file)
  - `duration_seconds` (integer, 1-120 range)
  - `created_by` (uuid, foreign key to users)
  - `created_at` (timestamp)
- **Indexes:** task_id (performance), created_at DESC (chronological sorting)

### API Layer (Backend)
- **POST /api/tasks/:id/voice-notes** - Upload voice note
  - Multipart file upload with multer middleware
  - 5MB file size limit enforced
  - 120 second (2 minute) duration validation
  - Audio MIME type whitelist (webm, ogg, mp4, mpeg, wav)
  - Unique UUID filenames prevent conflicts
  - Files stored in `tmp_uploads/` directory
  - Returns 201 on success, 400 (validation), 403 (permission), 404 (task not found), 413 (file too large)

- **GET /api/tasks/:id/voice-notes** - List voice notes
  - Returns array of voice notes ordered by created_at DESC
  - Includes id, taskId, url, durationSeconds, createdAt, createdBy
  - Returns 200 on success, 403 (permission), 404 (task not found)

- **GET /api/tasks** - Enhanced task list
  - Added `voice_notes_count` field to each task item
  - Subquery counts voice notes per task (0 if none)
  - Enables frontend badge display without extra API calls

### RBAC Layer
- **voice.create permission:** Assigned to 7 roles
  - Admin, Ops Lead, Field Ops, Project Manager, Contributor, Office Admin, Estimator
  
- **voice.read permission:** Assigned to all 14 roles
  - All users can play/view voice notes if flag is enabled

### Frontend Components
- **VoiceRecorder.jsx**
  - MediaRecorder API integration
  - Real-time countdown timer (2:00 → 0:00)
  - Audio preview before upload
  - Microphone permission handling with user-friendly error messages
  - 5MB file size check before upload
  - Disabled state during upload
  - Smooth transitions with Framer Motion

- **VoiceNotesList.jsx**
  - Display all voice notes for a task
  - Play/Pause controls
  - Duration formatting (M:SS format, e.g., "1:34")
  - Relative timestamps (e.g., "2 hours ago")
  - Loading and error states

- **TaskDetail.jsx Integration**
  - Voice Notes section added below Comments
  - Protected by `<FeatureGate feature="voiceToText">`
  - Separate RBAC guards for record (voice.create) and view (voice.read)
  - Auto-refresh list after successful upload

- **TaskItem.jsx Badge**
  - 🎙️ badge shows voice note count on task list
  - Feature-gated (voiceToText flag) + RBAC-guarded (voice.read permission)
  - Only visible when task has voice notes (count > 0)
  - Styled with primary color theme
  - Defense-in-depth: no existence leak for unauthorized users

### Feature Flag
- **voiceToText:** Defaults to **FALSE** (internal-only)
- Must be manually enabled in `apps/coordination_ui/src/config/features.json`
- Requires frontend restart after flag change

### Security & Validation
- **Triple-layer protection:**
  1. Feature flag OFF by default
  2. Frontend RBAC guards hide UI
  3. Backend RBAC enforcement blocks unauthorized API calls

- **File upload security:**
  - File size limit (5MB)
  - MIME type validation
  - UUID filename generation (prevents path traversal)
  - Parameterized SQL queries (prevents injection)

- **Duration validation:**
  - Client: Auto-stops at 2 minutes
  - Server: Returns 400 if duration > 120 seconds

### Documentation
- **Created:** `docs/VOICE_NOTES.md`
  - User guide (recording, playback)
  - API documentation
  - RBAC permissions table
  - Error handling guide
  - Troubleshooting section
  - Security considerations
  - Future enhancements roadmap

### Testing
- Backend tests verify all scenarios (passing)
- Frontend components implement all validation guards
- Architect review: **PASS** (production-ready)

### Architect Review
✅ **Production-Ready** with flag OFF by default
- No security vulnerabilities detected
- RBAC enforcement complete (frontend + backend)
- Multer configuration secure
- Validation sufficient (5MB, 120s, MIME types)
- No SQL injection vulnerabilities
- Error handling comprehensive

### Future Enhancements (Not in v1.0)
- Automatic transcription (OpenAI Whisper API)
- Waveform visualization
- Delete/edit voice notes
- Search transcribed notes
- 🎙️ badge on Task List (requires backend voice_notes_count field)
- Server-side audio compression

---

## 2025-10-27: Projects Module - Hard Delete UI

### Summary
Completed Projects vertical slice with hard delete functionality behind feature flag and triple-layer protection.

### Frontend Layer
- **ProjectDetail.jsx** - Added "Delete Permanently" button
  - Feature-flagged: `hardDeleteProjects` (defaults to OFF)
  - RBAC guard: `projects.delete` permission required
  - Status guard: Only shows for archived projects
  - Confirmation modal with destructive styling

### API Helper Fix
- **Fixed:** `del()` helper in `apps/coordination_ui/src/services/api.js`
  - Now uses axios instance (not raw fetch)
  - Properly inherits JWT Bearer token
  - Inherits Sentry tracing headers
  - Inherits dev bypass headers (x-dev-user-email)

### Backend Layer
- **DELETE /api/projects/:id** - Atomic hard delete
  - Uses `WHERE id=$1 AND archived=true` to prevent race conditions
  - Returns 400 if project not archived
  - Returns 404 if project not found
  - CASCADE deletes related data automatically

### Security
- **Triple-layer protection:**
  1. Feature flag OFF by default (internal-only)
  2. RBAC guard (only roles with projects.delete)
  3. Status check (must be archived first)

### Atomic Pattern
- Single SQL query with combined WHERE clause
- Prevents race conditions between archive check and delete
- Clean error handling with meaningful messages

---

## Previous Work
- Comprehensive 14-role RBAC system
- Projects module (CRUD, list, filters)
- Tasks module (CRUD, comments, checklists)
- Ball-in-court analytics
- Velocity metrics dashboard
- SLO evaluation and release guard
- Incident management with ChatOps
- Route coverage with automated testing
- Accessibility testing (axe-core WCAG 2.0 A/AA)
- Dark mode with design tokens
- Performance optimization (localStorage cache, ETag, delta sync)
