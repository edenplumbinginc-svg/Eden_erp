-- migrations/20251021_ball_owner_fields.sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS ball_owner_type TEXT CHECK (ball_owner_type IN ('user','vendor','dept','system')),
  ADD COLUMN IF NOT EXISTS ball_owner_id   UUID,
  ADD COLUMN IF NOT EXISTS ball_since      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS tasks_ball_owner_idx ON tasks (ball_owner_type, ball_owner_id);
