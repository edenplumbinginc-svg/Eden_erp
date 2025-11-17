# Eden ERP – Dev Workflow

This document defines **how we work in this repo** so we can:

- Keep the codebase clean and safe.
- Make it easy for AI + automation to summarize work.
- Give Anhum + Architect a clear daily/weekly view.
- Build a long-term “hive mind” around Eden ERP.

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

Keep names short but meaningful.

---

## 2. Commit messages

Each commit message should:

- Start with a **type** and **scope**:  
  `feat(tasks): add SLA breach colors`  
  `fix(projects): correct ball-in-court fallback`  
  `chore(ci): update playwright config`

- Stay small and focused:
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
    - Problem / user story (what is broken / what is needed)
    - Acceptance criteria (when is it done?)
    - Any screenshots or domain notes from Anhum.

- While coding:
  - Reference the issue in commits and PRs:  
    `Closes #123` or `Refs #123`.

- When done:
  - Issue is moved to “Done” (or closed) **only via merged PR**.

This allows automation to see what actually moved each day.

---

## 4. Pull requests (PRs)

All changes go through a PR targeting `main`.

- Use the template in `.github/PULL_REQUEST_TEMPLATE.md`.
- PR title format:
  - `[feature] tasks: add SLA flags`
  - `[fix] projects: handle missing ball-in-court`
- Always fill in:
  - **Summary / What / Why**
  - **Screenshots** for UI changes
  - **DB changes** (migrations, schema, seeds)
  - **Tests** added/updated

Minimum rules:

1. No PR directly to `main` without review.
2. No merge with failing CI.
3. Prefer small PRs over huge ones.

---

## 5. Frontend vs Backend responsibilities

**Frontend (React / Vite – `apps/coordination_ui`):**

- Implements screens, forms, and navigation.
- Talks to backend only via documented `/api/...` endpoints.
- Does **not** implement core business rules that belong in the backend
  (e.g. SLA logic, ball-in-court transitions, permissions, audit logic).

**Backend (Node.js / Express – `server.js`, `routes/`, `services/`):**

- Owns:
  - Business rules (status transitions, ball-in-court logic, SLAs).
  - Validation of incoming data.
  - RBAC permission checks.
  - Notifications, audit logs.
- Frontend should stay thin:
  - Display data.
  - Collect input.
  - Call APIs.
  - Handle UI state / UX.

If there is doubt, **default to putting business logic in the backend.**

---

## 6. Error handling and monitoring

We use structured logging and error monitoring.

Backend:

- Use the shared logger (not `console.log`) for server logs.
- Do not swallow errors silently:
  - Either handle them explicitly with clear responses.
  - Or let them bubble to the global error middleware.
- For expected business errors (e.g. invalid status change):
  - Return clear HTTP status (400/403/etc) + a useful message.
- For unexpected errors:
  - Let the global error handler capture and forward to monitoring.

Frontend:

- Use the global error boundary for unhandled React errors.
- For API errors, show a user-friendly message, not stack traces or raw JSON.

Health:

- Keep the health endpoints working:
  - `/health`, `/live`, `/ready`, `/ops/health`, `/ops/metrics`.
- Do not remove or bypass health checks or metrics without discussion.

---

## 7. PR classification tags (modules, impact, risk)

To support AI summaries and “hive mind” learning, every PR must classify itself.

In the PR template, fill in:

### 7.1 Module(s)

Tick all that apply:

- [ ] Auth / RBAC
- [ ] Tasks
- [ ] Projects
- [ ] Notifications
- [ ] Reporting / Metrics
- [ ] Ops / Health / Observability
- [ ] UI Shell / Navigation
- [ ] Other: `__________`

### 7.2 Impact level

- [ ] Low  
  (cosmetic UI, copy changes, small refactors)

- [ ] Medium  
  (user-visible changes, moderate risk)

- [ ] High  
  (core business rules, DB schema, performance-sensitive code, security)

### 7.3 Risk / Complexity

- [ ] Straightforward  
- [ ] Needs careful review  
- [ ] Architecture-level change

These tags are used by automation and AI to:

- Group activity by module.
- Identify hot spots / high-risk areas.
- Feed the architect a focused view of where important changes are happening.

---

## 8. Daily automation and logs

The repo is wired to a **daily summary** workflow (n8n + AI).

At the end of each day, the automation:

1. Fetches:
   - All PRs that were **merged** in the last 24 hours.
   - All issues that were **closed/moved to Done** in the last 24 hours.
2. Passes them (plus module/impact/risk tags) to AI.
3. Generates a summary with four sections:
   - A) Architecture & Database  
   - B) Backend APIs & Business Logic  
   - C) Frontend / UI / UX  
   - D) Risks, TODOs, Questions
4. Sends this summary by email to:
   - Anhum  
   - Architect

### 8.1 Daily history log

In addition to email, the workflow appends the summary to a permanent log:

- Either:
  - A markdown file under `eden_history/daily/YYYY-MM-DD-daily-summary.md`, or
  - A Notion “Eden – Daily Dev Log” database entry.

Each entry contains:

- Date
- AI summary text
- List of merged PRs
- List of closed issues

This creates a chronological “brain” of Eden ERP’s evolution that AI and humans can read later.

---

## 9. Weekly reflection (“hive mind” growth)

Once per week, a separate workflow runs a **Weekly Reflection**:

1. Collects the last 7 daily summaries.
2. Sends them to AI with a prompt to derive:
   - Main architecture shifts.
   - Modules with highest risk / churn.
   - Repeated bugs or fragile areas.
   - Suggested next 3 refactors or technical investments.
3. Emails this **Weekly Engineering Brief** to:
   - Anhum  
   - Architect  
   - (Optionally) lead dev

This converts daily activity into long-term learning and guides where to improve next.

---

## 10. Decision log

Important architectural or business decisions should be captured in a **Decision Log**.

When a decision is made (in email, meeting, Notion), it should be written as a small, structured entry:

- Location (one of):
  - `eden_history/decisions/YYYY-MM-DD-XX-short-title.md`
  - Notion “Eden – Decision Log” database.

Recommended format:

```md
# Decision: <short title>
Date: YYYY-MM-DD
Decided by: <names>

Context:
- Why was this being discussed?
- What problem led to this decision?

Decision:
- Clear bullet points of what was decided.

Consequences:
- Constraints this creates (what we must respect)
- Known trade-offs.

Related PRs / Issues:
- #123, #130, ...
