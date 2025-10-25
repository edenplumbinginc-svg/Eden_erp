// __tests__/escalation-security.test.js
// Comprehensive test suite for production-hardened escalation features

const crypto = require('crypto');
const { pool } = require('../services/database');
const { runEscalationTick, inCanary, generateEventHash } = require('../lib/escalation');
const { verifyHmac } = require('../lib/hmac');
const { requireOpsAdmin } = require('../lib/rbac');

describe('Escalation Security - Idempotency Tests', () => {
  let testIncidentId;
  let testIncidentKey;

  beforeEach(async () => {
    // Create a test incident (next_due_at is generated automatically)
    testIncidentKey = `TEST::idempotency_${Date.now()}`;
    const firstSeen = new Date(Date.now() - 10 * 60 * 1000);
    
    const result = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        testIncidentKey,
        'TEST /idempotency',
        'test',
        'critical',
        'open',
        firstSeen,
        new Date(),
        0,
      ]
    );
    testIncidentId = result.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testIncidentId) {
      await pool.query('DELETE FROM escalation_events WHERE incident_id = $1', [testIncidentId]);
      await pool.query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    }
  });

  test('should record escalation event once and reject duplicate', async () => {
    // Set feature flags for the test
    process.env.ESCALATION_WORKER_ENABLED = 'true';
    process.env.ESCALATION_V1 = 'true';
    process.env.ESC_CANARY_PCT = '100';
    process.env.ESC_DRY_RUN = 'false';
    process.env.ESC_SNOOZE_MIN = '0'; // Disable snooze for this test

    // First escalation - should succeed
    const firstCount = await runEscalationTick();
    expect(firstCount).toBeGreaterThan(0);

    // Verify escalation_events table has 1 row for this incident at L1
    const firstCheck = await pool.query(
      `SELECT COUNT(*) as count FROM escalation_events 
       WHERE incident_key = $1 AND escalation_level = 1`,
      [testIncidentKey]
    );
    expect(parseInt(firstCheck.rows[0].count)).toBe(1);

    // Verify incident was escalated to L1
    const incident = await pool.query(
      'SELECT escalation_level FROM incidents WHERE id = $1',
      [testIncidentId]
    );
    expect(incident.rows[0].escalation_level).toBe(1);

    // Second escalation attempt - should detect duplicate and skip
    const secondCount = await runEscalationTick();
    
    // Should still only have 1 event for L1 (idempotency working)
    const secondCheck = await pool.query(
      `SELECT COUNT(*) as count FROM escalation_events 
       WHERE incident_key = $1 AND escalation_level = 1`,
      [testIncidentKey]
    );
    expect(parseInt(secondCheck.rows[0].count)).toBe(1);

    // Verify event_hash is unique
    const eventHash = generateEventHash(testIncidentKey, 1);
    const hashCheck = await pool.query(
      'SELECT COUNT(*) as count FROM escalation_events WHERE event_hash = $1',
      [eventHash]
    );
    expect(parseInt(hashCheck.rows[0].count)).toBe(1);
  });
});

describe('Escalation Security - Canary Rollout Tests', () => {
  test('should consistently select same incidents for canary', () => {
    const testKey = 'TEST::canary_consistency';
    
    // Call inCanary() 10 times with same key
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(inCanary(testKey));
    }

    // All results should be identical
    const firstResult = results[0];
    expect(results.every(r => r === firstResult)).toBe(true);
  });

  test('should respect canary percentage boundaries', () => {
    const testKeys = ['TEST::boundary_1', 'TEST::boundary_2', 'TEST::boundary_3'];
    const originalPct = process.env.ESC_CANARY_PCT;

    // Test with ESC_CANARY_PCT=0 - no incidents should be in canary
    process.env.ESC_CANARY_PCT = '0';
    
    // Need to re-require the module to pick up new env variable
    delete require.cache[require.resolve('../lib/escalation')];
    const { inCanary: inCanary0 } = require('../lib/escalation');
    
    testKeys.forEach(key => {
      expect(inCanary0(key)).toBe(false);
    });

    // Test with ESC_CANARY_PCT=100 - all incidents should be in canary
    process.env.ESC_CANARY_PCT = '100';
    
    delete require.cache[require.resolve('../lib/escalation')];
    const { inCanary: inCanary100 } = require('../lib/escalation');
    
    testKeys.forEach(key => {
      expect(inCanary100(key)).toBe(true);
    });

    // Restore original value
    process.env.ESC_CANARY_PCT = originalPct;
    delete require.cache[require.resolve('../lib/escalation')];
  });
});

describe('Escalation Security - Snooze Window Tests', () => {
  let testIncidentId;

  afterEach(async () => {
    if (testIncidentId) {
      await pool.query('DELETE FROM escalation_events WHERE incident_id = $1', [testIncidentId]);
      await pool.query('DELETE FROM incidents WHERE id = $1', [testIncidentId]);
    }
  });

  test('should skip escalation within snooze window', async () => {
    // Save original values
    const originalWorkerEnabled = process.env.ESCALATION_WORKER_ENABLED;
    const originalV1 = process.env.ESCALATION_V1;
    const originalSnooze = process.env.ESC_SNOOZE_MIN;
    const originalCanary = process.env.ESC_CANARY_PCT;
    const originalDryRun = process.env.ESC_DRY_RUN;

    // Set feature flags
    process.env.ESCALATION_WORKER_ENABLED = 'true';
    process.env.ESCALATION_V1 = 'true';
    process.env.ESC_SNOOZE_MIN = '30';
    process.env.ESC_CANARY_PCT = '100';
    process.env.ESC_DRY_RUN = 'false';

    // Re-require module to pick up new env vars
    delete require.cache[require.resolve('../lib/escalation')];
    const { runEscalationTick } = require('../lib/escalation');

    // Create incident with escalated_at = 1 minute ago (within snooze window)
    const testKey = `TEST::snooze_${Date.now()}`;
    const firstSeen = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const escalatedAt = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago

    const result = await pool.query(
      `INSERT INTO incidents (
        incident_key, route, kind, severity, status,
        first_seen, last_seen, escalation_level, escalated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        testKey,
        'TEST /snooze',
        'test',
        'critical',
        'open',
        firstSeen,
        new Date(),
        1, // Already at L1
        escalatedAt,
      ]
    );
    testIncidentId = result.rows[0].id;

    // Run escalation tick - should NOT escalate (within snooze window)
    await runEscalationTick();
    
    // Verify incident is still at L1
    const incidentBeforeSnooze = await pool.query(
      'SELECT escalation_level FROM incidents WHERE id = $1',
      [testIncidentId]
    );
    expect(incidentBeforeSnooze.rows[0].escalation_level).toBe(1);

    // Update escalated_at to 31 minutes ago (outside snooze window)
    await pool.query(
      `UPDATE incidents 
       SET escalated_at = $1
       WHERE id = $2`,
      [new Date(Date.now() - 31 * 60 * 1000), testIncidentId]
    );

    // Run escalation tick again - should escalate now
    await runEscalationTick();
    
    // Verify incident escalated to L2
    const incidentAfterSnooze = await pool.query(
      'SELECT escalation_level FROM incidents WHERE id = $1',
      [testIncidentId]
    );
    expect(incidentAfterSnooze.rows[0].escalation_level).toBe(2);

    // Restore original values
    process.env.ESCALATION_WORKER_ENABLED = originalWorkerEnabled;
    process.env.ESCALATION_V1 = originalV1;
    process.env.ESC_SNOOZE_MIN = originalSnooze;
    process.env.ESC_CANARY_PCT = originalCanary;
    process.env.ESC_DRY_RUN = originalDryRun;
    delete require.cache[require.resolve('../lib/escalation')];
  });
});

describe('Escalation Security - HMAC Verification Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalSecret;

  beforeEach(() => {
    // Set up HMAC secret for testing
    originalSecret = process.env.OPS_HMAC_SECRET;
    process.env.OPS_HMAC_SECRET = 'test-secret-key-for-hmac';

    mockReq = {
      headers: {},
      body: { test: 'data' },
      path: '/test/path',
      method: 'POST',
      id: 'test-req-id',
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalSecret) {
      process.env.OPS_HMAC_SECRET = originalSecret;
    }
  });

  test('should reject request with invalid HMAC signature', () => {
    mockReq.headers['x-signature'] = 'invalid-signature';

    verifyHmac(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid signature'
      }
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should reject request with missing signature', () => {
    // No x-signature header
    verifyHmac(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing X-Signature header'
      }
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should accept request with valid HMAC signature', () => {
    const body = JSON.stringify(mockReq.body);
    const validSignature = crypto
      .createHmac('sha256', process.env.OPS_HMAC_SECRET)
      .update(body)
      .digest('hex');

    mockReq.headers['x-signature'] = validSignature;

    verifyHmac(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  test('should handle empty body correctly', () => {
    mockReq.body = {};
    const body = JSON.stringify(mockReq.body);
    const validSignature = crypto
      .createHmac('sha256', process.env.OPS_HMAC_SECRET)
      .update(body)
      .digest('hex');

    mockReq.headers['x-signature'] = validSignature;

    verifyHmac(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('Escalation Security - RBAC Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      path: '/ops/test',
      method: 'GET',
      id: 'test-req-id',
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      },
      rbac: {
        roles: []
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should deny access to non-ops users', () => {
    mockReq.rbac.roles = ['user'];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'FORBIDDEN',
        message: expect.stringContaining('Access denied')
      }
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should deny access to users with no roles', () => {
    mockReq.rbac.roles = [];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should allow access to ops_admin users', () => {
    mockReq.rbac.roles = ['ops_admin'];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  test('should allow access to users with ops_admin among multiple roles', () => {
    mockReq.rbac.roles = ['user', 'ops_admin', 'other_role'];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should deny access to users with similar but incorrect role names', () => {
    mockReq.rbac.roles = ['ops', 'admin', 'ops-admin', 'opsadmin'];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
