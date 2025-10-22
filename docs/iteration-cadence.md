# Iteration Cadence (Phase 2)

Daily Thin Slice:
- UI: 1 read + 1 write + 1 inline control on a single screen.
- Backend: 0–1 small rule or hook (idempotent, audited).

Weekly:
- Mon/Tue: Ship 2 slices (Dashboard, Tasks).
- Wed: One automation (e.g., auto-close parent, idle reminders).
- Thu: Reporting card/table upgrade (perf + pagination).
- Fri: Stabilize (smoke:api, error budgets, doc updates).

Exit Criteria per feature:
- cURL examples live in docs/api-contract.md.
- Smoke test green: `npm run smoke:api`.
- UI passes `docs/ui-definition-of-done.md`.

