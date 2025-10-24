-- drizzle/migrations/0020_seed_policy_unack_sla.sql
-- Register the unacknowledged handoff SLA policy

INSERT INTO decision_policies (slug, description, enabled, dry_run, condition, action)
VALUES (
  'escalate.unack_48h',
  'If a ball-in-court handoff is not acknowledged within the SLA window, notify the project owner/department lead.',
  false,
  true,
  '{"type": "ball_unack_sla", "sla_key": "unacknowledged_handoff_sla"}'::jsonb,
  '{"effect": "notify", "channel": "inapp"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
