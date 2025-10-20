const { Client } = require("pg");
require("dotenv").config();

const DAYS = parseInt(process.env.REMIND_IDLE_AFTER_DAYS || "2", 10);

(async () => {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const q = `
    with candidates as (
      select
        t.id as task_id,
        t.title,
        t.assignee_id,
        t.ball_in_court,
        t.project_id,
        now() - coalesce(t.last_activity_at, t.updated_at, t.created_at) as idle_for,
        extract(day from now() - coalesce(t.last_activity_at, t.updated_at, t.created_at))::int as idle_days
      from tasks t
      where coalesce(t.status,'') not in ('done','closed','cancelled')
        and t.deleted_at is null
        and coalesce(t.due_at, now() + interval '100 years') >= now() - interval '365 days'
        and coalesce(t.last_activity_at, t.updated_at, t.created_at) <= now() - ($1::int || ' days')::interval
    ),
    dedup as (
      select c.*
      from candidates c
      left join notifications n
        on n.task_id = c.task_id
       and n.type = 'idle_reminder'
       and n.created_at >= (now()::date)
      where n.id is null
    )
    insert into notifications (task_id, project_id, type, channel, event_code, payload)
    select
      d.task_id,
      d.project_id,
      'idle_reminder',
      'system',
      'task_idle',
      jsonb_build_object(
        'title', 'Task idle reminder',
        'message', 'No updates in ' || d.idle_days || ' days',
        'idle_days', d.idle_days,
        'task_title', d.title,
        'ball_in_court', d.ball_in_court,
        'suggested_action', 'Post an update or reassign ball-in-court'
      )
    from dedup d
    returning id, task_id;
  `;

  const { rows } = await client.query(q, [DAYS]);
  console.log(`✅ Inserted ${rows.length} idle reminders (threshold: ${DAYS} days).`);
  if (rows.length > 0) {
    console.table(rows);
  }

  await client.end();
})().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
