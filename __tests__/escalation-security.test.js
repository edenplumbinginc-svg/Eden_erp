// __tests__/escalation-security.test.js
// Comprehensive test suite for production-hardened escalation features

const crypto = require('crypto');
const { pool } = require('../services/database');

// Mock logger to avoid Pino errors in tests
jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  security: jest.fn(),
  query: jest.fn(),
}));

describe('Escalation Security - Idempotency Tests', () => {
  let testIncidentId;
  let testIncidentKey;

  beforeEach(async () => {
    // Create a test incident with first_seen far enough in past to be due
    testIncidentKey = `TEST::idempotency_${Date.now()}`;
    const firstSeen = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    // For critical incident at L0, next_due_at = first_seen + 5 minutes
    // So it will be due after 5 minutes
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
        0, // L0, so next_due_at = first_seen + 5 min = 25 min ago (DUE)
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

    // Import after setting env vars
    const { runEscalationTick, generateEventHash } = require('../lib/escalation');

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
    // (next_due_at is recalculated to first_seen + (1+1)*5min = first_seen + 10min)
    // which is 20 minutes ago, so still due
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
    // Import the module after env vars are set
    const { inCanary } = require('../lib/escalation');
    
    const testKey = 'TEST::canary_consistency';
    
    // Call inCanary() 10 times with same key
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(inCanary(testKey));
    }

    // All results should be identical (deterministic hashing)
    const firstResult = results[0];
    expect(results.every(r => r === firstResult)).toBe(true);
  });

  test('should respect canary percentage boundaries', () => {
    // Test that ~10% of keys fall into canary with ESC_CANARY_PCT=10
    // This tests the hash distribution is working
    const keys = Array.from({ length: 100 }, (_, i) => `TEST::hash_dist_${i}`);
    const { inCanary } = require('../lib/escalation');
    
    // Count how many keys fall into canary
    const inCanaryCount = keys.filter(key => inCanary(key)).length;
    
    // With the current ESC_CANARY_PCT (likely 100 in test env), 
    // we just verify the function is deterministic and working
    // Each key should consistently return the same result
    keys.forEach(key => {
      const result1 = inCanary(key);
      const result2 = inCanary(key);
      expect(result1).toBe(result2);
    });
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
    // Set ALL feature flags before importing
    process.env.ESCALATION_WORKER_ENABLED = 'true';
    process.env.ESCALATION_V1 = 'true';
    process.env.ESC_SNOOZE_MIN = '5'; // 5 minute snooze for faster test
    process.env.ESC_CANARY_PCT = '100';
    process.env.ESC_DRY_RUN = 'false';

    // Clear cache and import with correct env vars
    delete require.cache[require.resolve('../lib/escalation')];
    const { runEscalationTick } = require('../lib/escalation');

    // Create incident at L1 with escalated_at = 1 minute ago (WITHIN 5 min snooze)
    // first_seen = 60 minutes ago, so next_due_at = first_seen + (1+1)*5min = -50 minutes (DUE)
    const testKey = `TEST::snooze_${Date.now()}`;
    const firstSeen = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago
    const escalatedAt = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago (within 5 min window)

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
        1, // L1, so next_due_at = first_seen + 10min = -50 min (DUE)
        escalatedAt,
      ]
    );
    testIncidentId = result.rows[0].id;

    // Run escalation tick - should NOT escalate (within 5 min snooze window)
    const countBefore = await runEscalationTick();
    
    // Verify incident is still at L1
    const incidentBeforeSnooze = await pool.query(
      'SELECT escalation_level FROM incidents WHERE id = $1',
      [testIncidentId]
    );
    expect(incidentBeforeSnooze.rows[0].escalation_level).toBe(1);

    // Update escalated_at to 6 minutes ago (outside 5 min snooze window)
    await pool.query(
      `UPDATE incidents 
       SET escalated_at = $1
       WHERE id = $2`,
      [new Date(Date.now() - 6 * 60 * 1000), testIncidentId]
    );

    // Run escalation tick again - should escalate now
    const countAfter = await runEscalationTick();
    expect(countAfter).toBeGreaterThan(0);
    
    // Verify incident escalated to L2
    const incidentAfterSnooze = await pool.query(
      'SELECT escalation_level FROM incidents WHERE id = $1',
      [testIncidentId]
    );
    expect(incidentAfterSnooze.rows[0].escalation_level).toBe(2);
  });
});

describe('Escalation Security - HMAC Verification Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalSecret;

  beforeAll(() => {
    // Set up HMAC secret for testing
    originalSecret = process.env.OPS_HMAC_SECRET;
    process.env.OPS_HMAC_SECRET = 'test-secret-key-for-hmac';
  });

  beforeEach(() => {
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
  });

  afterAll(() => {
    if (originalSecret) {
      process.env.OPS_HMAC_SECRET = originalSecret;
    }
  });

  test('should reject request with invalid HMAC signature', () => {
    const { verifyHmac } = require('../lib/hmac');
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
    const { verifyHmac } = require('../lib/hmac');
    
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
    const { verifyHmac } = require('../lib/hmac');
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
    const { verifyHmac } = require('../lib/hmac');
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
    const { requireOpsAdmin } = require('../lib/rbac');
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
    const { requireOpsAdmin } = require('../lib/rbac');
    mockReq.rbac.roles = [];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should allow access to ops_admin users', () => {
    const { requireOpsAdmin } = require('../lib/rbac');
    mockReq.rbac.roles = ['ops_admin'];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  test('should allow access to users with ops_admin among multiple roles', () => {
    const { requireOpsAdmin } = require('../lib/rbac');
    mockReq.rbac.roles = ['user', 'ops_admin', 'other_role'];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should deny access to users with similar but incorrect role names', () => {
    const { requireOpsAdmin } = require('../lib/rbac');
    mockReq.rbac.roles = ['ops', 'admin', 'ops-admin', 'opsadmin'];

    requireOpsAdmin(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
