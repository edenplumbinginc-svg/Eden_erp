require('dotenv').config({ override:true });
const { Pool } = require('pg');
const crypto = require('crypto');

function deriveStableUUID(input){
  const h = crypto.createHash('sha256').update(String(input)).digest('hex');
  // v4-like UUID from hash (dev only)
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // --- users table (idempotent) ---
    await pool.query(`
      create table if not exists public.users (
        id uuid primary key,
        email text unique,
        name text,
        role text default 'User',
        department text,
        created_at timestamptz default now()
      );
    `);
    // In case table exists but columns don't
    await pool.query(`alter table public.users add column if not exists email text;`);
    await pool.query(`alter table public.users add column if not exists name text;`);
    await pool.query(`alter table public.users add column if not exists role text default 'User';`);
    await pool.query(`alter table public.users add column if not exists department text;`);
    await pool.query(`alter table public.users add column if not exists created_at timestamptz default now();`);

    // Seed dev user matching X-Dev-User-Id: test-user-123
    const devId = deriveStableUUID('test-user-123');
    await pool.query(
      `insert into public.users (id,email,name,role,department)
       values ($1,$2,$3,$4,$5)
       on conflict (id) do update set
         email=excluded.email, name=excluded.name, role=excluded.role, department=excluded.department`,
      [devId, 'test@example.com', 'Test Manager', 'Manager', 'Coordination']
    );

    // --- notifications table (idempotent) ---
    await pool.query(`
      create table if not exists public.notifications (
        id uuid primary key default gen_random_uuid(),
        user_id uuid,
        task_id uuid,
        type text,
        payload jsonb default '{}'::jsonb,
        status text default 'queued',
        scheduled_at timestamptz,
        sent_at timestamptz
      );
    `);
    // Back-compat: ensure columns exist
    await pool.query(`alter table public.notifications add column if not exists user_id uuid;`);
    await pool.query(`alter table public.notifications add column if not exists task_id uuid;`);
    await pool.query(`alter table public.notifications add column if not exists type text;`);
    await pool.query(`alter table public.notifications add column if not exists payload jsonb default '{}'::jsonb;`);
    await pool.query(`alter table public.notifications add column if not exists status text default 'queued';`);
    await pool.query(`alter table public.notifications add column if not exists scheduled_at timestamptz;`);
    await pool.query(`alter table public.notifications add column if not exists schedule_at timestamptz; -- legacy alias`);
    await pool.query(`alter table public.notifications add column if not exists sent_at timestamptz;`);
    await pool.query(`
      create index if not exists idx_notifications_status_sched
      on public.notifications(status, coalesce(scheduled_at, schedule_at));
    `);

    console.log('✅ Hotfix applied. Dev user:', devId);
  } catch (e) {
    console.error('❌ Hotfix error:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
