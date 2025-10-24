-- Create task checklist items table
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS task_checklist_items_task_id_position_idx 
  ON task_checklist_items(task_id, position);
  
CREATE INDEX IF NOT EXISTS task_checklist_items_task_id_is_done_idx 
  ON task_checklist_items(task_id, is_done);
