-- Migration 0017: Add acknowledgment tracking and hold-time view
-- Enables acknowledgment workflow and bottleneck visualization
-- Created: 2025-10-24

-- Add acknowledgment tracking columns
ALTER TABLE ball_in_court_events
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by_email TEXT;

COMMENT ON COLUMN ball_in_court_events.acknowledged_at IS 'Timestamp when recipient acknowledged receiving the ball';
COMMENT ON COLUMN ball_in_court_events.acknowledged_by_email IS 'Email of user who acknowledged the handoff';

-- Create view for hold-time calculation
CREATE OR REPLACE VIEW v_ball_hold_time AS
SELECT
  e.task_id,
  e.id AS event_id,
  e.from_role,
  e.to_role,
  e.created_at AS handed_at,
  e.acknowledged_at,
  LEAD(e.created_at) OVER (PARTITION BY e.task_id ORDER BY e.created_at) AS next_handoff_at,
  EXTRACT(EPOCH FROM (
    COALESCE(LEAD(e.created_at) OVER (PARTITION BY e.task_id ORDER BY e.created_at), now()) - e.created_at
  ))::bigint AS hold_seconds
FROM ball_in_court_events e;

COMMENT ON VIEW v_ball_hold_time IS 'Calculates hold time (in seconds) for each ball-in-court event';
