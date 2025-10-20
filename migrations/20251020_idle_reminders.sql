-- Migration: Add idle task reminder infrastructure
-- Created: 2025-10-20

-- Step 1: Backfill last_activity_at from activity_log or fallback to updated_at
-- Note: The column will be added by Drizzle's db:push
DO $$
BEGIN
  -- Check if last_activity_at column exists (it will after db:push)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasks' AND column_name='last_activity_at'
  ) THEN
    -- Backfill from activity_log where entity_type='task'
    UPDATE tasks t
    SET last_activity_at = COALESCE((
      SELECT MAX(a.created_at) 
      FROM activity_log a 
      WHERE a.entity_type = 'task' AND a.entity_id = t.id
    ), t.updated_at, t.created_at)
    WHERE t.last_activity_at IS NULL;
    
    RAISE NOTICE 'Backfilled last_activity_at for tasks';
  END IF;
END$$;

-- Step 2: Create trigger function to update last_activity_at when activity_log changes
CREATE OR REPLACE FUNCTION trg_task_touch_on_activity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only update if this is a task activity
  IF NEW.entity_type = 'task' THEN
    UPDATE tasks 
    SET last_activity_at = NEW.created_at 
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END$$;

-- Step 3: Attach trigger to activity_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'activity_touch'
  ) THEN
    CREATE TRIGGER activity_touch
    AFTER INSERT ON activity_log
    FOR EACH ROW 
    EXECUTE FUNCTION trg_task_touch_on_activity();
    
    RAISE NOTICE 'Created activity_touch trigger';
  ELSE
    RAISE NOTICE 'Trigger activity_touch already exists';
  END IF;
END$$;

-- Step 4: Create index for efficient idle task queries (if not created by Drizzle)
CREATE INDEX IF NOT EXISTS idx_tasks_last_activity 
ON tasks (last_activity_at);
