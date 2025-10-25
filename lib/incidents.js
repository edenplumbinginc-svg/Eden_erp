// lib/incidents.js - Incident correlation for alarms
const { pool } = require('../services/database');

const buildKey = (route, kind) => `${route}::${kind}`;

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
        const insertResult = await client.query(
          `INSERT INTO incidents (
            incident_key, route, kind, severity, status, 
            first_seen, last_seen, owner, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

        const updateResult = await client.query(
          `UPDATE incidents 
           SET last_seen = $1, severity = $2, metadata = $3
           WHERE id = $4
           RETURNING *`,
          [
            now.toISOString(),
            newSeverity,
            JSON.stringify(updatedMeta),
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
