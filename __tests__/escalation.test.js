const { runEscalationTick } = require('../lib/escalation');
const { pool } = require('../services/database');

process.env.ESCALATION_WORKER_ENABLED = 'true';
process.env.ESCALATION_V1 = 'true';
process.env.ESC_CANARY_PCT = '100';

describe('Incident Escalation', () => {
  let testIncidentId;

  beforeAll(async () => {
    const firstSeen = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, next_due_at`,
      [
        'TEST::escalation_test',
        'TEST /escalation',
        'test',
        'critical',
        'open',
        firstSeen,
        new Date(),
        0,
        null,
      ]
    );
    testIncidentId = result.rows[0].id;
    console.log('[TEST] Created incident with next_due_at:', result.rows[0].next_due_at);
    console.log('[TEST] Current time:', new Date().toISOString());
    console.log('[TEST] first_seen:', firstSeen.toISOString());
  });

  afterAll(async () => {
    if (testIncidentId) {
      await pool.query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    }
  });

  test('should escalate unacknowledged critical incident after SLA breach', async () => {
    const debugQuery = await pool.query(
      `SELECT id, incident_key, severity, escalation_level, acknowledged_at, next_due_at, 
              now() as current_time, now() >= next_due_at as should_escalate
       FROM incidents WHERE id = $1`,
      [testIncidentId]
    );
    console.log('[TEST] Before escalation:', debugQuery.rows[0]);
    
    const escalatedCount = await runEscalationTick();
    console.log('[TEST] Escalated count:', escalatedCount);
    
    expect(escalatedCount).toBeGreaterThan(0);

    const result = await pool.query(
      'SELECT escalation_level, escalated_at FROM incidents WHERE id = $1',
      [testIncidentId]
    );

    const incident = result.rows[0];
    expect(incident.escalation_level).toBe(1);
    expect(incident.escalated_at).not.toBeNull();
  });

  test('should not escalate acknowledged incidents', async () => {
    await pool.query(
      `UPDATE incidents 
       SET acknowledged_at = now(), acknowledged_by = 'test_user'
       WHERE id = $1`,
      [testIncidentId]
    );

    const beforeEscalation = await pool.query(
      'SELECT escalation_level FROM incidents WHERE id = $1',
      [testIncidentId]
    );
    const levelBefore = beforeEscalation.rows[0].escalation_level;

    await runEscalationTick();

    const afterEscalation = await pool.query(
      'SELECT escalation_level FROM incidents WHERE id = $1',
      [testIncidentId]
    );
    const levelAfter = afterEscalation.rows[0].escalation_level;

    expect(levelAfter).toBe(levelBefore);
  });

  test('should escalate to higher levels based on time since first_seen', async () => {
    const firstSeen = new Date(Date.now() - 60 * 60 * 1000);
    
    const oldIncidentResult = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        'TEST::old_incident',
        'TEST /old',
        'test',
        'warning',
        'open',
        firstSeen,
        new Date(),
        2,
        null,
      ]
    );
    const oldIncidentId = oldIncidentResult.rows[0].id;

    try {
      await runEscalationTick();

      const result = await pool.query(
        'SELECT escalation_level FROM incidents WHERE id = $1',
        [oldIncidentId]
      );

      expect(result.rows[0].escalation_level).toBe(3);
    } finally {
      await pool.query('DELETE FROM incidents WHERE id = $1', [oldIncidentId]);
    }
  });

  test('should respect different SLA times for critical vs warning', async () => {
    const now = new Date();
    
    const criticalFirstSeen = new Date(now.getTime() - 6 * 60 * 1000);
    
    const criticalResult = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        'TEST::critical_sla',
        'TEST /critical',
        'test',
        'critical',
        'open',
        criticalFirstSeen,
        new Date(),
        0,
        null,
      ]
    );

    const warningFirstSeen = new Date(now.getTime() - 16 * 60 * 1000);
    
    const warningResult = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        'TEST::warning_sla',
        'TEST /warning',
        'test',
        'warning',
        'open',
        warningFirstSeen,
        new Date(),
        0,
        null,
      ]
    );

    const criticalId = criticalResult.rows[0].id;
    const warningId = warningResult.rows[0].id;

    try {
      await runEscalationTick();

      const criticalIncident = await pool.query(
        'SELECT escalation_level FROM incidents WHERE id = $1',
        [criticalId]
      );
      const warningIncident = await pool.query(
        'SELECT escalation_level FROM incidents WHERE id = $1',
        [warningId]
      );

      expect(criticalIncident.rows[0].escalation_level).toBe(1);
      expect(warningIncident.rows[0].escalation_level).toBe(1);
    } finally {
      await pool.query('DELETE FROM incidents WHERE id IN ($1, $2)', [
        criticalId,
        warningId,
      ]);
    }
  });
});
