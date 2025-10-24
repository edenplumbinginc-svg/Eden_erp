-- drizzle/migrations/0020_seed_policy_unack_sla.sql
-- Register the unacknowledged handoff SLA policy

INSERT INTO decision_policies (slug, name, description, enabled, dry_run)
VALUES (
  'escalate.unack_48h',
  'Escalate unacknowledged handoffs beyond SLA',
  'If a ball-in-court handoff is not acknowledged within the SLA window, notify the project owner/department lead.',
  false,
  true
)
ON CONFLICT (slug) DO NOTHING;
