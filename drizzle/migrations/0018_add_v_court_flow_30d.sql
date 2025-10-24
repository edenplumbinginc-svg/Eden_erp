-- Migration 0018: Add v_court_flow_30d view for department-level court-flow analytics
-- Provides 30-day metrics: passes in, acks, unacked, hold times per department
-- Created: 2025-10-24

-- Per-destination department metrics over last 30 days
CREATE OR REPLACE VIEW v_court_flow_30d AS
WITH base AS (
  SELECT
    e.id,
    e.task_id,
    e.from_role,
    e.to_role,
    e.created_at AS handed_at,
    e.acknowledged,
    e.acknowledged_at,
    COALESCE(EXTRACT(EPOCH FROM (
      COALESCE(LEAD(e.created_at) OVER (PARTITION BY e.task_id ORDER BY e.created_at),
               now()) - e.created_at
    )),0)::bigint AS hold_seconds
  FROM ball_in_court_events e
  WHERE e.created_at >= now() - INTERVAL '30 days'
)
SELECT
  to_role                                  AS dept,
  COUNT(*)                                 AS passes_in,
  SUM(CASE WHEN acknowledged THEN 1 ELSE 0 END) AS acks,
  SUM(CASE WHEN NOT acknowledged THEN 1 ELSE 0 END) AS unacked,
  ROUND(AVG(hold_seconds)::numeric,0)      AS avg_hold_s,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hold_seconds) AS p50_hold_s,
  MAX(hold_seconds)                        AS max_hold_s
FROM base
GROUP BY to_role;

COMMENT ON VIEW v_court_flow_30d IS 'Department-level court-flow metrics (30-day rolling window): passes, acknowledgments, and hold times';
