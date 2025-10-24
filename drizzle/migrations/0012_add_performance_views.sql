-- Migration: Create performance views for leaderboards and analytics
-- Purpose: Provide fast queries for performance metrics

-- View: Top performers by fastest average completion time (last 7 days)
CREATE OR REPLACE VIEW v_perf_fastest_week AS
SELECT
  actor_id,
  actor_email,
  count(*) AS items_done,
  avg(duration_ms) AS avg_ms,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms
FROM performance_events
WHERE action = 'checklist.done'
  AND created_at >= now() - interval '7 days'
GROUP BY actor_id, actor_email
ORDER BY p50_ms ASC
LIMIT 20;

-- View: Department performance (last 30 days)
CREATE OR REPLACE VIEW v_perf_dept_month AS
SELECT
  department,
  count(*) AS items_done,
  avg(duration_ms) AS avg_ms,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  min(duration_ms) AS min_ms,
  max(duration_ms) AS max_ms
FROM performance_events
WHERE action = 'checklist.done'
  AND created_at >= now() - interval '30 days'
  AND department IS NOT NULL
GROUP BY department
ORDER BY p50_ms ASC;

-- View: Recent performance events (last 100)
CREATE OR REPLACE VIEW v_perf_recent AS
SELECT
  pe.id,
  pe.actor_email,
  pe.task_id,
  pe.checklist_item_id,
  pe.action,
  pe.duration_ms,
  pe.department,
  pe.created_at,
  t.name AS task_name,
  tci.label AS checklist_item_label
FROM performance_events pe
LEFT JOIN tasks t ON t.id = pe.task_id
LEFT JOIN task_checklist_items tci ON tci.id = pe.checklist_item_id
WHERE pe.action = 'checklist.done'
ORDER BY pe.created_at DESC
LIMIT 100;
