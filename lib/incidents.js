// lib/incidents.js - Incident correlation for alarms
const { pool } = require('../services/database');

const buildKey = (route, kind) => `${route}::${kind}`;

/**
 * Calculate next escalation due time based on SLA
 */
function calculateNextDueAt(firstSeen, severity, escalationLevel) {
  const CRIT_SLA_MIN = parseInt(process.env.ESC_CRIT_ACK_MIN || '5', 10);
  const WARN_SLA_MIN = parseInt(process.env.ESC_WARN_ACK_MIN || '15', 10);
  
  const slaMinutes = severity === 'critical' ? CRIT_SLA_MIN : WARN_SLA_MIN;
  const totalMinutes = slaMinutes * (escalationLevel + 1);
  
  const firstSeenDate = new Date(firstSeen);
  const dueDate = new Date(firstSeenDate.getTime() + totalMinutes * 60 * 1000);
  
  return dueDate.toISOString();
}

async function recordIncidentForAlarm(alarm) {
  const incidentKey = buildKey(alarm.route, alarm.kind);
  const now = new Date();

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check for existing incident
      const existingResult = await client.query(
        `SELECT * FROM incidents 
         WHERE incident_key = $1 
         ORDER BY last_seen DESC 
         LIMIT 1`,
        [incidentKey]
      );

      const baseMeta = {
        lastEvidence: alarm.evidence || {},
        sentryUrl: alarm.sentryUrl || null,
        lastHint: alarm.hint || null,
      };

      let result;

      if (existingResult.rows.length === 0) {
        // Create new incident
        const nextDue = calculateNextDueAt(now.toISOString(), alarm.severity, 0);
        const insertResult = await client.query(
          `INSERT INTO incidents (
            incident_key, route, kind, severity, status, 
            first_seen, last_seen, owner, metadata, next_due_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            incidentKey,
            alarm.route,
            alarm.kind,
            alarm.severity,
            'open',
            now.toISOString(),
            now.toISOString(),
            JSON.stringify(alarm.owner || null),
            JSON.stringify(baseMeta),
            nextDue,
          ]
        );
        result = insertResult.rows[0];
      } else {
        // Update existing incident
        const current = existingResult.rows[0];
        const newSeverity =
          current.severity === 'critical' || alarm.severity === 'critical'
            ? 'critical'
            : 'warning';
        
        const currentMeta = typeof current.metadata === 'object' ? current.metadata : {};
        const updatedMeta = { ...currentMeta, ...baseMeta };

        // Recalculate next_due_at if severity changed or if it's null
        const nextDue = calculateNextDueAt(
          current.first_seen,
          newSeverity,
          current.escalation_level || 0
        );

        const updateResult = await client.query(
          `UPDATE incidents 
           SET last_seen = $1, severity = $2, metadata = $3, next_due_at = $4
           WHERE id = $5
           RETURNING *`,
          [
            now.toISOString(),
            newSeverity,
            JSON.stringify(updatedMeta),
            nextDue,
            current.id,
          ]
        );
        result = updateResult.rows[0];
      }

      await client.query('COMMIT');
      
      // Parse JSONB fields back to objects and normalize column names
      if (result.owner && typeof result.owner === 'string') {
        result.owner = JSON.parse(result.owner);
      }
      if (result.metadata && typeof result.metadata === 'string') {
        result.metadata = JSON.parse(result.metadata);
      }
      
      // Map snake_case to camelCase for consistent API
      return {
        ...result,
        incidentKey: result.incident_key,
        firstSeen: result.first_seen,
        lastSeen: result.last_seen,
        acknowledgedBy: result.acknowledged_by,
        acknowledgedAt: result.acknowledged_at,
        escalationLevel: result.escalation_level,
        escalatedAt: result.escalated_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to record incident', {
      incidentKey,
      route: alarm.route,
      kind: alarm.kind,
      error: error.message,
    });
    throw error;
  }
}

module.exports = { recordIncidentForAlarm, buildKey };
