# Task File Attachments

## Overview
The Task File Attachments system allows users to upload and manage file attachments on tasks with comprehensive RBAC enforcement and security validation.

## Features
- **File Upload**: POST `/api/tasks/:id/files` with multipart/form-data
- **File List**: GET `/api/tasks/:id/files` returns array of attachments
- **RBAC**: Two-tier permission system:
  - `tasks.files.create`: Upload files (Admin, Ops Lead, Field Ops, PM, Contributor, Office Admin)
  - `tasks.files.read`: View/list files (all roles)
- **Security**:
  - MIME type allowlist (PDF, JPEG, PNG, WebP, HEIC, HEIF, CSV, XLSX)
  - 10MB file size limit enforced by multer
  - Defense-in-depth: attachments_count field conditionally exposed based on permission
  - Automatic cleanup of rejected files
- **Storage**: Disk storage in `uploads/task-files/:taskId/:uuid.ext`
- **Database**: task_files table with ON DELETE CASCADE

## Endpoints

### POST /api/tasks/:id/files
Upload a file attachment.

**Auth**: Required  
**Permission**: tasks.files.create  
**Body**: multipart/form-data with `file` field

**Responses**:
- 201: `{ item: { id, taskId, url, filename, mime, size, createdAt, createdBy } }`
- 400: No file or disallowed MIME type
- 403: Missing permission
- 404: Task not found
- 413: File too large (>10MB)

### GET /api/tasks/:id/files
Get all file attachments for a task.

**Auth**: Required  
**Permission**: tasks.files.read

**Responses**:
- 200: `{ items: [...] }`
- 403: Missing permission
- 404: Task not found

## MIME Type Allowlist
- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/heic`
- `image/heif`
- `text/csv`
- `application/csv`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)

## Testing
All endpoints tested via cURL with the following scenarios:
- ✅ 201: Upload PDF
- ✅ 200: GET files list
- ✅ 400: Disallowed MIME type (.exe)
- ✅ 413: Oversize file (>10MB)
- ✅ 404: Task not found
- ✅ Defense-in-depth: attachments_count field visible only with permission

## Architect Review
**Status**: PASS  
**Date**: 2025-10-28  
**Findings**: No security issues. RBAC layering, endpoint behavior, and data integrity all confirmed correct.

## Future Work
- Download endpoint (GET /api/files/:taskId/:fileId)
- Delete endpoint (DELETE /api/files/:fileId)
- Automated regression tests
- Frontend UI components
