#!/usr/bin/env node
// scripts/prod-smoke-test.js
// Comprehensive production smoke test suite
// Validates all critical API endpoints, authentication, and business workflows

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const DEV_EMAIL = process.env.TEST_DEV_EMAIL || 'admin@edenmep.ca';
const DEV_USER_ID = process.env.TEST_DEV_USER_ID || '00000000-0000-0000-0000-000000000000';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Dev-Email': DEV_EMAIL,
      'X-Dev-User-Id': DEV_USER_ID,
      ...headers
    };
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: defaultHeaders,
      rejectUnauthorized: false // For self-signed certs in dev
    };
    
    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Test helper functions
function recordTest(name, passed, error = null) {
  results.tests.push({ name, passed, error });
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
    if (error) console.log(`   Error: ${error}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test suites
async function testHealthChecks() {
  console.log('\n📋 Testing Health Checks...');
  
  try {
    const res = await makeRequest('GET', '/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.status === 'ok', 'Health check failed');
    recordTest('Health Check (Legacy)', true);
  } catch (e) {
    recordTest('Health Check (Legacy)', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/health/quick');
    assert(res.status === 200 || res.status === 503, `Unexpected status: ${res.status}`);
    assert(typeof res.body.healthy === 'boolean', 'Missing healthy field');
    recordTest('Quick Health Check', res.body.healthy, res.body.healthy ? null : 'Service unhealthy');
  } catch (e) {
    recordTest('Quick Health Check', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/health/detailed');
    assert(res.status === 200 || res.status === 503, `Unexpected status: ${res.status}`);
    assert(res.body.checks, 'Missing checks object');
    assert(res.body.checks.api, 'Missing API check');
    assert(res.body.checks.system, 'Missing system check');
    recordTest('Detailed Health Check', true);
  } catch (e) {
    recordTest('Detailed Health Check', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/health/live');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.alive === true, 'Liveness check failed');
    recordTest('Liveness Probe', true);
  } catch (e) {
    recordTest('Liveness Probe', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/health/ready');
    assert(res.status === 200 || res.status === 503, `Unexpected status: ${res.status}`);
    recordTest('Readiness Probe', res.status === 200);
  } catch (e) {
    recordTest('Readiness Probe', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/health/metrics');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.requests, 'Missing requests metrics');
    assert(res.body.responseTime, 'Missing response time metrics');
    recordTest('Metrics Endpoint', true);
  } catch (e) {
    recordTest('Metrics Endpoint', false, e.message);
  }
}

async function testDatabaseConnectivity() {
  console.log('\n📋 Testing Database Connectivity...');
  
  try {
    const res = await makeRequest('GET', '/db/ping');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    recordTest('Database Ping', res.body.db === 'ok', res.body.db !== 'ok' ? res.body.error : null);
  } catch (e) {
    recordTest('Database Ping', false, e.message);
  }
}

async function testAuthentication() {
  console.log('\n📋 Testing Authentication...');
  
  try {
    const res = await makeRequest('GET', '/api/projects', null, {
      'X-Dev-Email': DEV_EMAIL,
      'X-Dev-User-Id': DEV_USER_ID
    });
    assert(res.status !== 401, 'Authentication failed with dev headers');
    recordTest('Authentication (Dev Headers)', true);
  } catch (e) {
    recordTest('Authentication (Dev Headers)', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/projects', null, {});
    assert(res.status === 401, 'Should reject requests without auth');
    recordTest('Authentication (No Headers)', true);
  } catch (e) {
    recordTest('Authentication (No Headers)', false, e.message);
  }
}

async function testProjectsAPI() {
  console.log('\n📋 Testing Projects API...');
  
  let testProjectId = null;
  
  try {
    const res = await makeRequest('GET', '/api/projects');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array of projects');
    recordTest('List Projects', true);
  } catch (e) {
    recordTest('List Projects', false, e.message);
  }
  
  try {
    const res = await makeRequest('POST', '/api/projects', {
      name: `Smoke Test Project ${Date.now()}`,
      code: `TEST-${Date.now()}`
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.id, 'Missing project ID');
    testProjectId = res.body.id;
    recordTest('Create Project', true);
  } catch (e) {
    recordTest('Create Project', false, e.message);
  }
  
  if (testProjectId) {
    try {
      const res = await makeRequest('PATCH', `/api/projects/${testProjectId}`, {
        name: 'Updated Smoke Test Project'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.name === 'Updated Smoke Test Project', 'Project not updated');
      recordTest('Update Project', true);
    } catch (e) {
      recordTest('Update Project', false, e.message);
    }
    
    try {
      const res = await makeRequest('DELETE', `/api/projects/${testProjectId}`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      recordTest('Delete Project', true);
    } catch (e) {
      recordTest('Delete Project', false, e.message);
    }
  }
}

async function testTasksAPI() {
  console.log('\n📋 Testing Tasks API...');
  
  let testProjectId = null;
  let testTaskId = null;
  
  try {
    const res = await makeRequest('POST', '/api/projects', {
      name: `Task Test Project ${Date.now()}`,
      code: `TASK-${Date.now()}`
    });
    testProjectId = res.body.id;
    recordTest('Create Test Project for Tasks', res.status === 201);
  } catch (e) {
    recordTest('Create Test Project for Tasks', false, e.message);
    return;
  }
  
  if (testProjectId) {
    try {
      const res = await makeRequest('POST', `/api/projects/${testProjectId}/tasks`, {
        title: 'Smoke Test Task',
        description: 'This is a test task',
        priority: 'normal'
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.id, 'Missing task ID');
      testTaskId = res.body.id;
      recordTest('Create Task', true);
    } catch (e) {
      recordTest('Create Task', false, e.message);
    }
    
    try {
      const res = await makeRequest('GET', `/api/projects/${testProjectId}/tasks`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body), 'Expected array of tasks');
      recordTest('List Tasks', true);
    } catch (e) {
      recordTest('List Tasks', false, e.message);
    }
    
    if (testTaskId) {
      try {
        const res = await makeRequest('PATCH', `/api/tasks/${testTaskId}`, {
          status: 'in_progress'
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        recordTest('Update Task', true);
      } catch (e) {
        recordTest('Update Task', false, e.message);
      }
      
      try {
        const res = await makeRequest('DELETE', `/api/tasks/${testTaskId}`);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        recordTest('Delete Task', true);
      } catch (e) {
        recordTest('Delete Task', false, e.message);
      }
    }
    
    try {
      await makeRequest('DELETE', `/api/projects/${testProjectId}`);
    } catch (e) {
      // Cleanup
    }
  }
}

async function testReportsAPI() {
  console.log('\n📋 Testing Reports API...');
  
  try {
    const res = await makeRequest('GET', '/api/reports/tasks/status');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array');
    recordTest('Tasks by Status Report', true);
  } catch (e) {
    recordTest('Tasks by Status Report', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/reports/tasks/ball');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array');
    recordTest('Tasks by Owner Report', true);
  } catch (e) {
    recordTest('Tasks by Owner Report', false, e.message);
  }
  
  try {
    const res = await makeRequest('GET', '/api/reports/tasks/priority');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected array');
    recordTest('Tasks by Priority Report', true);
  } catch (e) {
    recordTest('Tasks by Priority Report', false, e.message);
  }
}

// Main execution
async function runAllTests() {
  console.log('🚀 Starting Production Smoke Tests');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`👤 Test User: ${DEV_EMAIL}`);
  console.log('='.repeat(50));
  
  await testHealthChecks();
  await testDatabaseConnectivity();
  await testAuthentication();
  await testProjectsAPI();
  await testTasksAPI();
  await testReportsAPI();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`📈 Total: ${results.tests.length}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.error || 'Unknown error'}`);
    });
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('💥 Fatal error running tests:', err);
  process.exit(1);
});
