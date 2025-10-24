-- Migration: Add performance_events table for micro-telemetry
-- Purpose: Track "who finishes fast" for badges, points, and leaderboards

CREATE TABLE IF NOT EXISTS performance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id),
  actor_email text,
  task_id uuid NOT NULL REFERENCES tasks(id),
  checklist_item_id uuid NOT NULL REFERENCES task_checklist_items(id) ON DELETE CASCADE,
  action text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  duration_ms bigint NOT NULL,
  department text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS perf_events_actor_time_idx 
  ON performance_events (actor_id, created_at DESC);
  
CREATE INDEX IF NOT EXISTS perf_events_task_idx 
  ON performance_events (task_id);
  
CREATE INDEX IF NOT EXISTS perf_events_action_idx 
  ON performance_events (action);
