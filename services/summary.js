const { pool } = require('./database');

async function buildDailySummary(dateIso) {
  // Window: last 24h
  const since = `${dateIso}T00:00:00.000Z`;
  const until = `${dateIso}T23:59:59.999Z`;

  const q = (sql, params = []) => pool.query(sql, params).then(r => r.rows);

  const [overdue, dueToday, recent] = await Promise.all([
    q(`SELECT id, title, assignee_id, due_at FROM tasks
       WHERE due_at IS NOT NULL AND due_at < now() AND status NOT IN ('done','closed')
       ORDER BY due_at ASC LIMIT 50`),
    q(`SELECT id, title, assignee_id, due_at FROM tasks
       WHERE due_at::date = $1::date AND status NOT IN ('done','closed')
       ORDER BY due_at ASC LIMIT 50`, [dateIso]),
    q(`SELECT action, entity, created_at
       FROM audit_logs WHERE created_at BETWEEN $1 AND $2
       ORDER BY created_at DESC LIMIT 100`, [since, until]),
  ]);

  // Plain-text digest
  const lines = [];
  lines.push(`Eden Coordination — Daily Digest (${dateIso})`);
  lines.push("");
  lines.push("Overdue Tasks:");
  lines.push(overdue.length ? overdue.map(t => `- ${t.title} (due ${t.due_at})`).join("\n") : "- none");
  lines.push("");
  lines.push("Due Today:");
  lines.push(dueToday.length ? dueToday.map(t => `- ${t.title} (${t.id})`).join("\n") : "- none");
  lines.push("");
  lines.push("Recent Activity (last 24h):");
  lines.push(recent.length ? recent.map(e => `- ${e.created_at} • ${e.action} • ${e.entity}`).join("\n") : "- none");
  lines.push("");
  lines.push("— Sent automatically by Eden ERP");

  return { 
    text: lines.join("\n"), 
    counts: { 
      overdue: overdue.length, 
      dueToday: dueToday.length, 
      recent: recent.length 
    } 
  };
}

module.exports = {
  buildDailySummary
};
