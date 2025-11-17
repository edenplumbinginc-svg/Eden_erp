# Eden ERP – Dev Workflow

This document defines **how we work in this repo** so we can:

- Keep the codebase clean and safe.
- Make it easy for AI + automation to summarize work.
- Give Anhum + Architect a clear daily/weekly view.

---

## 1. Branch strategy

### 1.1 Protected base branches

- `main` is **protected**:
  - No direct pushes.
  - Only merge via Pull Requests (PRs).
  - PRs must be approved + CI green.

### 1.2 Branch naming

Create branches from `main` using this pattern:

- Features:  
  `feature/<area>-<short-description>`  
  Example: `feature/tasks-sla-flags`

- Fixes:  
  `fix/<area>-<short-description>`  
  Example: `fix/projects-bic-routing`

- Chores / tooling:  
  `chore/<area>-<short-description>`  
  Example: `chore/ci-playwright-tuning`

---

## 2. Commit messages

Each commit message should:

- Start with a **type** and **scope**:  
  `feat(tasks): add SLA breach colors`  
  `fix(projects): correct ball-in-court fallback`  
  `chore(ci): update playwright config`

- Be small and focused:
  - One commit = one logical change.
  - Avoid “big dump” commits.

Types we use:

- `feat` = new feature
- `fix` = bug fix
- `chore` = tooling / refactor / non-user-visible
- `docs` = documentation-only

---

## 3. Issues and tasks

All work is linked to an issue.

- Before coding:
  - Create a GitHub Issue **or** pick an existing one.
  - In the issue, capture:
    - Problem / user story (what’s broken / what is needed)
    - Acceptance criteria (when is this done?)
    - Any screenshots / domain notes from Anhum

- While coding:
  - Reference the issue in commits and PRs:  
    `Closes #123` or `Refs #123`

- When done:
  - Issue is moved to “Done” (or closed) **only via merged PR**.

This is important so the daily automation can see what moved.

---

## 4. Pull requests (PRs)

All changes go through a PR targeting `main`.

- Use the template in `.github/PULL_REQUEST_TEMPLATE.md`.
- PR title format:
  - `[feature] tasks: add SLA flags`
  - `[fix] projects: handle missing ball-in-court`
- Always fill in:
  - **What / Why**
  - **Screenshots** for UI changes
  - **DB changes** (migrations, schema, seeds)
  - **Tests** added/updated

Minimum rules:

1. No PR directly to `main` without review.
2. No merge with failing CI.
3. Small PRs are preferred over huge PRs.

---

## 5. Frontend vs Backend responsibilities

**Frontend (React / Vite – `apps/coordination_ui`):**

- Implements screens, forms, and navigation.
- Talks to backend only via documented `/api/...` endpoints.
- Does not implement business rules that belong in the backend
  (e.g. SLA, ball-in-court transitions, permissions).

**Backend (Node.js / Express – `server.js` + `routes/` + `services/`):**

- Owns:
  - Business rules (status transitions, ball-in-court logic, SLAs).
  - Validation of incoming data.
  - RBAC permission checks.
  - Notifications, audit logs.
- Frontend should remain thin (display, call API, handle UI state).

---

## 6. Error handling & monitoring (how to behave)

We use structured logging + error monitoring (Sentry, etc).

Developer rules:

- Use the shared logger (not `console.log`) for server logs.
- Never swallow errors silently:
  - Either handle them
  - Or let them bubble to the error middleware.
- For expected business errors (e.g. invalid status change):
  - Return clear HTTP status (400/403/etc) + message.
- For unexpected errors:
  - Let the global error handler capture and send to Sentry.

Frontend:

- Use the global error boundary for unhandled React errors.
- For API errors, show a user-friendly message, not stack traces.

---

## 7. Automation and daily summary

Our daily automation (via n8n + AI) depends on:

- **Issues** that accurately reflect work.
- **PRs** with good titles and descriptions.
- **Commit messages** with clear types.

At the end of each day:

- Merged PRs and closed issues are summarized automatically.
- Anhum + Architect receive a daily email:
  - What changed in architecture / DB
  - What changed in backend APIs
  - What changed in frontend / UX
  - Risks, TODOs, open questions

Follow this workflow so those summaries are useful.

---

## 8. Optional: dev log notes

Optionally, devs may add a short daily dev log:

- Either:
  - A note in the Notion “Dev Log” database; or
  - A file under `dev-log/YYYY-MM-DD-<name>.md` with ~3 bullets:

Example:

```md
# 2025-11-17 – Ali

- Implemented SLA flag rendering on Task List.
- Added `/api/reports/sla` endpoint (p95 per department).
- Need guidance on how to handle tasks without BIC owner.
