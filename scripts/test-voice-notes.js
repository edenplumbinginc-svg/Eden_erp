#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_TASK_ID = process.argv[2] || 'becb1851-0a90-4a7e-9401-631cf8bd3a9c';

// Test user with Admin role (has voice.create and voice.read)
const TEST_HEADERS = {
  'x-dev-user-email': 'admin@edenplumbing.com',
  'x-dev-user-role': 'Admin',
  'x-dev-user-id': 'test-admin-123'
};

console.log('🧪 Voice Notes API Test Suite');
console.log('================================\n');

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 3000),
      path: url.pathname + url.search,
      headers: {
        ...TEST_HEADERS,
        ...headers
      }
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      if (body.pipe) {
        body.pipe(req);
      } else {
        req.write(JSON.stringify(body));
        req.end();
      }
    } else {
      req.end();
    }
  });
}

async function test1_GetVoiceNotes() {
  console.log('📋 Test 1: GET /api/tasks/:id/voice-notes (should return empty array initially)');
  const response = await makeRequest('GET', `/api/tasks/${TEST_TASK_ID}/voice-notes`);
  
  if (response.status === 200 && response.data.ok === true && Array.isArray(response.data.items)) {
    console.log('   ✅ PASS: Status 200, ok: true, items is array');
    console.log(`   Found ${response.data.items.length} voice note(s)\n`);
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 200 with {ok: true, items: []}, got ${response.status}:`, response.data);
    return false;
  }
}

async function test2_UploadVoiceNote() {
  console.log('📤 Test 2: POST /api/tasks/:id/voice-notes (upload valid voice note)');
  
  // Create a test audio file (simple buffer to simulate audio)
  const testAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....', 'utf8');
  const testFilePath = path.join(__dirname, '../tmp_uploads/test-audio.webm');
  fs.writeFileSync(testFilePath, testAudioBuffer);
  
  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath), {
    filename: 'test-audio.webm',
    contentType: 'audio/webm'
  });
  form.append('duration_seconds', '45');
  
  const response = await makeRequest('POST', `/api/tasks/${TEST_TASK_ID}/voice-notes`, form.getHeaders(), form);
  
  // Clean up test file
  fs.unlinkSync(testFilePath);
  
  if (response.status === 201 && response.data.ok === true && response.data.item) {
    const item = response.data.item;
    if (item.id && item.taskId === TEST_TASK_ID && item.url && item.durationSeconds === 45) {
      console.log('   ✅ PASS: Status 201, voice note created successfully');
      console.log(`   Voice Note ID: ${item.id}`);
      console.log(`   Duration: ${item.durationSeconds}s\n`);
      return item.id;
    } else {
      console.log('   ❌ FAIL: Response missing required fields:', item);
      return null;
    }
  } else {
    console.log(`   ❌ FAIL: Expected 201 with voice note, got ${response.status}:`, response.data);
    return null;
  }
}

async function test3_ValidationDurationTooLong() {
  console.log('⏱️  Test 3: POST with duration > 120 seconds (should return 400)');
  
  const testAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....', 'utf8');
  const testFilePath = path.join(__dirname, '../tmp_uploads/test-audio-long.webm');
  fs.writeFileSync(testFilePath, testAudioBuffer);
  
  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath), {
    filename: 'test-audio-long.webm',
    contentType: 'audio/webm'
  });
  form.append('duration_seconds', '150');
  
  const response = await makeRequest('POST', `/api/tasks/${TEST_TASK_ID}/voice-notes`, form.getHeaders(), form);
  
  fs.unlinkSync(testFilePath);
  
  if (response.status === 400 && response.data.error && response.data.error.includes('120')) {
    console.log('   ✅ PASS: Status 400, duration validation working\n');
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 400 with duration error, got ${response.status}:`, response.data);
    return false;
  }
}

async function test4_TaskNotFound() {
  console.log('🔍 Test 4: GET with non-existent task ID (should return 404)');
  const fakeTaskId = '00000000-0000-0000-0000-000000000000';
  const response = await makeRequest('GET', `/api/tasks/${fakeTaskId}/voice-notes`);
  
  if (response.status === 404) {
    console.log('   ✅ PASS: Status 404, task not found handling working\n');
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 404, got ${response.status}:`, response.data);
    return false;
  }
}

async function test5_RBACEnforcement() {
  console.log('🔒 Test 5: RBAC enforcement (Viewer role - has voice.read, no voice.create)');
  
  const viewerHeaders = {
    'x-dev-user-email': 'viewer@edenplumbing.com',
    'x-dev-user-role': 'Viewer',
    'x-dev-user-id': 'test-viewer-123'
  };
  
  // Viewer should be able to GET (has voice.read)
  const getResponse = await makeRequest('GET', `/api/tasks/${TEST_TASK_ID}/voice-notes`, viewerHeaders);
  
  if (getResponse.status !== 200) {
    console.log(`   ❌ FAIL: Viewer should be able to GET voice notes, got ${getResponse.status}`);
    return false;
  }
  
  // Viewer should NOT be able to POST (lacks voice.create)
  const testAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....', 'utf8');
  const testFilePath = path.join(__dirname, '../tmp_uploads/test-audio-rbac.webm');
  fs.writeFileSync(testFilePath, testAudioBuffer);
  
  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath), {
    filename: 'test-audio-rbac.webm',
    contentType: 'audio/webm'
  });
  form.append('duration_seconds', '30');
  
  const postResponse = await makeRequest('POST', `/api/tasks/${TEST_TASK_ID}/voice-notes`, 
    { ...viewerHeaders, ...form.getHeaders() }, form);
  
  fs.unlinkSync(testFilePath);
  
  if (postResponse.status === 403) {
    console.log('   ✅ PASS: RBAC enforcement working (403 for voice.create)\n');
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 403 for Viewer POST, got ${postResponse.status}:`, postResponse.data);
    return false;
  }
}

async function runTests() {
  const results = [];
  
  try {
    results.push(await test1_GetVoiceNotes());
    results.push(await test2_UploadVoiceNote());
    results.push(await test3_ValidationDurationTooLong());
    results.push(await test4_TaskNotFound());
    results.push(await test5_RBACEnforcement());
  } catch (err) {
    console.error('\n❌ Test suite failed with error:', err.message);
    process.exit(1);
  }
  
  const passed = results.filter(r => r === true).length;
  const total = results.length;
  
  console.log('================================');
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

runTests();
