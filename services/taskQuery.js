const { pool } = require('./database');

const ALLOWED_STATUS = ['open', 'todo', 'in_progress', 'review', 'done'];
const ALLOWED_PRIORITY = ['low', 'normal', 'high', 'urgent'];
const ALLOWED_SORT = new Set(['created_at', 'updated_at', 'due_at', 'title', 'status', 'priority']);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseList(val) {
  return String(val || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseQuery(qs = {}) {
  const allowed = new Set([
    'status', 'priority', 'assignee', 'project', 'department', 'bic', 
    'due_from', 'due_to', 'overdue', 'idle', 'q', 
    'page', 'limit', 'sort'
  ]);

  for (const k of Object.keys(qs)) {
    if (!allowed.has(k)) {
      const err = new Error(`Unknown query param: ${k}`);
      err.status = 400;
      throw err;
    }
  }

  const page = Math.max(1, parseInt(qs.page || '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(qs.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  let sortCol = 'updated_at';
  let sortDir = 'desc';
  if (qs.sort) {
    const [col, dir] = String(qs.sort).split(':');
    if (!ALLOWED_SORT.has(col)) {
      const err = new Error(`Invalid sort column: ${col}`);
      err.status = 400;
      throw err;
    }
    sortCol = col;
    sortDir = (dir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  }

  let status = [];
  if (qs.status) {
    const raw = parseList(qs.status);
    status = raw.map(s => {
      const found = ALLOWED_STATUS.find(x => x.toLowerCase() === s.toLowerCase());
      return found || s;
    });
  }

  let priority = [];
  if (qs.priority) {
    const raw = parseList(qs.priority);
    priority = raw.map(p => {
      const found = ALLOWED_PRIORITY.find(x => x.toLowerCase() === p.toLowerCase());
      return found || p;
    });
  }

  const filters = {
    status,
    priority,
    assignee: qs.assignee || null,
    project: qs.project || null,
    department: qs.department || null,
    bic: qs.bic || null,
    due_from: qs.due_from || null,
    due_to: qs.due_to || null,
    overdue: qs.overdue === 'true' || qs.overdue === '1',
    idle: qs.idle === 'true' || qs.idle === '1',
    q: qs.q || null,
    page,
    limit,
    sortCol,
    sortDir
  };
  return filters;
}

async function fetchTasks(filters) {
  const {
    status, priority, assignee, project, department, bic,
    due_from, due_to, overdue, idle, q,
    page, limit, sortCol, sortDir
  } = filters;

  const where = [];
  const vals = [];
  let i = 1;

  where.push('t.deleted_at IS NULL');

  if (status && status.length > 0) {
    where.push(`t.status = ANY($${i++})`);
    vals.push(status);
  }

  if (priority && priority.length > 0) {
    where.push(`t.priority = ANY($${i++})`);
    vals.push(priority);
  }

  if (assignee) {
    where.push(`t.assignee_id = $${i++}`);
    vals.push(assignee);
  }

  if (project) {
    where.push(`t.project_id = $${i++}`);
    vals.push(project);
  }

  if (department) {
    where.push(`t.department = $${i++}`);
    vals.push(department);
  }

  if (bic) {
    where.push(`t.ball_in_court = $${i++}`);
    vals.push(bic);
  }

  if (due_from) {
    where.push(`t.due_at >= $${i++}::timestamptz`);
    vals.push(due_from);
  }

  if (due_to) {
    where.push(`t.due_at <= $${i++}::timestamptz`);
    vals.push(due_to);
  }

  if (overdue) {
    where.push(`(
      t.is_overdue = true
      OR (
        t.due_at IS NOT NULL
        AND t.due_at < NOW()
        AND t.status NOT IN ('done')
      )
    )`);
  }

  if (idle) {
    where.push(`t.needs_idle_reminder = true`);
  }

  if (q) {
    where.push(`(t.title ILIKE $${i} OR t.description ILIKE $${i})`);
    vals.push(`%${q}%`);
    i++;
  }

  const offset = (page - 1) * limit;
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = `ORDER BY t.${sortCol} ${sortDir}, t.id ASC`;

  const sql = `
    SELECT 
      t.id, t.title, t.description, t.status, t.priority,
      t.assignee_id, t.ball_in_court, t.ball_owner_type, t.ball_owner_id,
      t.due_at, t.created_at, t.updated_at,
      t.tags, t.origin, t.project_id, t.department,
      t.is_overdue, t.needs_idle_reminder,
      CASE 
        WHEN t.status IN ('todo', 'open') AND t.ball_in_court IS NOT NULL 
             AND t.updated_at < now() - INTERVAL '3 days'
        THEN EXTRACT(DAY FROM now() - t.updated_at)::int
        ELSE 0
      END as stalled_days
    FROM public.tasks t
    ${whereSql}
    ${orderSql}
    LIMIT $${i++} OFFSET $${i++}
  `;
  vals.push(limit, offset);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM public.tasks t
    ${whereSql}
  `;

  const client = await pool.connect();
  try {
    const [rowsRes, countRes] = await Promise.all([
      client.query(sql, vals),
      client.query(countSql, vals.slice(0, vals.length - 2))
    ]);
    return {
      items: rowsRes.rows,
      total: countRes.rows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countRes.rows[0].total / limit)
    };
  } finally {
    client.release();
  }
}

module.exports = { parseQuery, fetchTasks };
