// services/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function bootstrapDatabase() {
  try {
    // UUIDs for gen_random_uuid()
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Projects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.projects (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        code text,
        status text DEFAULT 'active',
        created_at timestamptz DEFAULT now()
      );
    `);

    // Users table (ensure it exists for foreign keys)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        email text UNIQUE NOT NULL,
        name text,
        created_at timestamptz DEFAULT now()
      );
    `);

    // Extend users table with role and department
    await pool.query(`
      ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS role text DEFAULT 'User';
      ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS department text;
    `);

    // Tasks (ensure table, then ensure all columns exist)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        status text DEFAULT 'open',
        priority text DEFAULT 'normal',
        assignee_id uuid,
        ball_in_court uuid,
        due_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Add new columns to tasks
    await pool.query(`
      ALTER TABLE public.tasks
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
      ALTER TABLE public.tasks
        ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
      ALTER TABLE public.tasks
        ADD COLUMN IF NOT EXISTS origin text;
      ALTER TABLE public.tasks
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    `);

    // Subtasks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.subtasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        title text NOT NULL,
        done boolean DEFAULT false,
        order_index int DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Task dependencies
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.task_dependencies (
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        blocks_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, blocks_task_id)
      );
    `);

    // Attachments (stub for now)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.attachments (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        filename text,
        mime text,
        size_bytes int,
        storage_key text,
        uploaded_by uuid,
        created_at timestamptz DEFAULT now()
      );
    `);

    // Task comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.task_comments (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        author_id uuid,
        body text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Ball history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.ball_history (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
        from_user_id uuid,
        to_user_id uuid,
        note text,
        changed_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        type text,
        payload jsonb DEFAULT '{}'::jsonb,
        status text DEFAULT 'queued',
        scheduled_at timestamptz DEFAULT now(),
        sent_at timestamptz
      );
    `);

    // Add backward compatibility for schedule_at column (legacy alias)
    await pool.query(`
      ALTER TABLE public.notifications
        ADD COLUMN IF NOT EXISTS schedule_at timestamptz;
    `);

    // Activity log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.activity_log (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        actor_id uuid,
        entity_type text,
        entity_id uuid,
        action text,
        meta jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        ip text
      );
    `);

    // Performance metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.performance (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE UNIQUE,
        complexity int DEFAULT 1,
        speed int DEFAULT 0,
        collaboration int DEFAULT 0,
        quality int DEFAULT 0,
        updated_at timestamptz DEFAULT now()
      );
    `);

    // Permissions matrix
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.permissions_matrix (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        role text,
        can_view boolean DEFAULT true,
        can_edit boolean DEFAULT false,
        can_close boolean DEFAULT false
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_ball_in_court ON public.tasks(ball_in_court);
      CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status, COALESCE(scheduled_at, schedule_at));
      CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
    `);

    console.log('✅ Database schema ensured');
  } catch (e) {
    console.error('⚠️ Database bootstrap failed:', e.message);
  }
}

// Helper function to enqueue notification
async function enqueueNotification(userId, taskId, type, payload = {}) {
  try {
    await pool.query(
      `INSERT INTO public.notifications (user_id, task_id, type, payload, status, scheduled_at)
       VALUES ($1, $2, $3, $4, 'queued', now())`,
      [userId, taskId, type, JSON.stringify(payload)]
    );
  } catch (e) {
    console.error('Failed to enqueue notification:', e.message);
  }
}

module.exports = { pool, bootstrapDatabase, enqueueNotification };