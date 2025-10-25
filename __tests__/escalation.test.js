const { runEscalationTick } = require('../lib/escalation');
const { pool } = require('../services/database');

/**
 * Helper: Calculate next escalation due time for tests
 */
function calculateNextDueAt(firstSeen, severity, escalationLevel) {
  const CRIT_SLA_MIN = 5;
  const WARN_SLA_MIN = 15;
  const slaMinutes = severity === 'critical' ? CRIT_SLA_MIN : WARN_SLA_MIN;
  const totalMinutes = slaMinutes * (escalationLevel + 1);
  const firstSeenDate = new Date(firstSeen);
  return new Date(firstSeenDate.getTime() + totalMinutes * 60 * 1000);
}

describe('Incident Escalation', () => {
  let testIncidentId;

  beforeAll(async () => {
    // Create a test incident that should be escalated
    const firstSeen = new Date(Date.now() - 10 * 60 * 1000);
    const nextDue = calculateNextDueAt(firstSeen, 'critical', 0);
    
    const result = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at, next_due_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        'TEST::escalation_test',
        'TEST /escalation',
        'test',
        'critical',
        'open',
        firstSeen,
        new Date(),
        0,
        null, // Not acknowledged
        nextDue,
      ]
    );
    testIncidentId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test incident
    if (testIncidentId) {
      await pool.query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    }
  });

  test('should escalate unacknowledged critical incident after SLA breach', async () => {
    // Critical incidents should escalate after 5 minutes by default
    const escalatedCount = await runEscalationTick();
    
    expect(escalatedCount).toBeGreaterThan(0);

    // Verify the test incident was escalated
    const result = await pool.query(
      'SELECT escalation_level, escalated_at FROM incidents WHERE id = $1',
      [testIncidentId]
    );

    const incident = result.rows[0];
    expect(incident.escalation_level).toBe(1);
    expect(incident.escalated_at).not.toBeNull();
  });

  test('should not escalate acknowledged incidents', async () => {
    // Acknowledge the incident
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

    // Level should not change for acknowledged incidents
    expect(levelAfter).toBe(levelBefore);
  });

  test('should escalate to higher levels based on time since first_seen', async () => {
    // Create an incident that's been open for a long time and already at L2
    const firstSeen = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago
    const nextDue = calculateNextDueAt(firstSeen, 'warning', 2); // L2 -> L3
    
    const oldIncidentResult = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at, next_due_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        'TEST::old_incident',
        'TEST /old',
        'test',
        'warning',
        'open',
        firstSeen,
        new Date(),
        2, // Already at L2
        null,
        nextDue,
      ]
    );
    const oldIncidentId = oldIncidentResult.rows[0].id;

    try {
      await runEscalationTick();

      const result = await pool.query(
        'SELECT escalation_level FROM incidents WHERE id = $1',
        [oldIncidentId]
      );

      // Warning incidents escalate when time >= SLA * (level + 1)
      // At L2, needs 45 minutes (15 * 3) to escalate to L3
      // At 60 minutes with L2, it should escalate to L3
      expect(result.rows[0].escalation_level).toBe(3);
    } finally {
      await pool.query('DELETE FROM incidents WHERE id = $1', [oldIncidentId]);
    }
  });

  test('should respect different SLA times for critical vs warning', async () => {
    const now = new Date();
    
    // Create a critical incident just past 5-minute SLA
    const criticalFirstSeen = new Date(now.getTime() - 6 * 60 * 1000);
    const criticalNextDue = calculateNextDueAt(criticalFirstSeen, 'critical', 0);
    
    const criticalResult = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at, next_due_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        criticalNextDue,
      ]
    );

    // Create a warning incident just past 15-minute SLA
    const warningFirstSeen = new Date(now.getTime() - 16 * 60 * 1000);
    const warningNextDue = calculateNextDueAt(warningFirstSeen, 'warning', 0);
    
    const warningResult = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, acknowledged_at, next_due_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        warningNextDue,
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

      // Both should have escalated
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
