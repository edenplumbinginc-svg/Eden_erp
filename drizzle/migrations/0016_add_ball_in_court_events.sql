-- Migration 0016: Add ball_in_court_events table for comprehensive handoff analytics
-- Tracks department handoffs, policy triggers, and acknowledgments
-- Created: 2025-10-24

CREATE TABLE IF NOT EXISTS ball_in_court_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_role TEXT,
  to_role TEXT,
  from_user_email TEXT,
  to_user_email TEXT,
  reason TEXT,
  triggered_by_policy TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_bice_task_time ON ball_in_court_events(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_bice_policy ON ball_in_court_events(triggered_by_policy) WHERE triggered_by_policy IS NOT NULL;

COMMENT ON TABLE ball_in_court_events IS 'Comprehensive audit trail for ball-in-court handoffs and responsibility transfers';
COMMENT ON COLUMN ball_in_court_events.from_role IS 'Source department or role';
COMMENT ON COLUMN ball_in_court_events.to_role IS 'Destination department or role';
COMMENT ON COLUMN ball_in_court_events.triggered_by_policy IS 'Decision policy slug if automated (e.g., handoff.estimation_to_procurement)';
COMMENT ON COLUMN ball_in_court_events.acknowledged IS 'Whether the recipient has acknowledged receiving the ball';
