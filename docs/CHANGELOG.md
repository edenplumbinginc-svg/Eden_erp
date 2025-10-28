# EDEN ERP - CHANGELOG

## 2025-10-28 — Projects Module (Internal) — Vertical Slice COMPLETE
LAYER STATUS: Planning ✅  Data ✅  API ✅  RBAC ✅  Frontend ✅  Flags ✅  Test ✅  Docs ✅

Shipped
- Create Project: POST /api/projects (Zod validation, unique code, 201 on success).
- Edit Project: PATCH /api/projects/:id (partial update, 200; 409 on duplicate code).
- Read Project: GET /api/projects/:id returns name, code, client, startDate, notes, archived.
- Archive/Unarchive: PATCH archived true/false + "Archived" badge.
- Hard Delete (internal): DELETE /api/projects/:id (requires archived=true); atomic guard.
- Route guards: <RoutePermission> on /projects and /projects/:id (+ /projects/new, /projects/:id/edit).
- Component guards: <RequirePermission> on Archive/Unarchive/Edit/Delete controls.
- Feature flags: features.json with voiceToText=false, hardDeleteProjects=false, includeArchivedToggle=true.
- Include Archived toggle (list): URL-state persisted (?archived=1), hot-reload friendly.

Defense-in-Depth
1) Frontend UX cache (rbac.json) hides controls.
2) RoutePermission blocks entire pages.
3) Backend RBAC (DB policies) enforces on API.
4) DB constraints (unique code) + atomic DELETE WHERE archived=true.

Internal-Only Safeguards
- Dev auth headers enabled in API client; no public exposure.
- hardDeleteProjects flag DEFAULT OFF; enable only for internal testing.
- Voice-to-text reserved behind flag.

Smoke Evidence (abridged)
- Create (Admin): 201 → redirects to detail in UI.
- Duplicate code: 409 duplicate_code.
- Viewer create/edit/delete: 403 forbidden.
- Archive → Unarchive: PATCH flips archived and UI badge.
- Hard delete: 204 only when archived=true; 409 otherwise.

Docs Added
- ROUTE_PERMISSION_GUARDS.md
- INCLUDE_ARCHIVED_TOGGLE.md
- RBAC_TESTING.md

Notes
- Relative imports used to avoid Vite alias drift.
- URL helper fixed to write pathname+search to prevent "%3F" encoding.
- Keep flags coarse (capability-level), not widget-level.
