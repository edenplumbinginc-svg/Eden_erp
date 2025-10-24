-- drizzle/migrations/0019_add_sla_thresholds.sql
-- Add SLA thresholds configuration table

CREATE TABLE IF NOT EXISTS sla_thresholds (
  key text PRIMARY KEY,
  value_seconds integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO sla_thresholds (key, value_seconds)
VALUES ('unacknowledged_handoff_sla', 48*3600)
ON CONFLICT (key) DO UPDATE SET value_seconds = EXCLUDED.value_seconds, updated_at = now();
