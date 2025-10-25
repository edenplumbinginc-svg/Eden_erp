#!/usr/bin/env node
// scripts/test-config-hardened.js - Test hardened config validation

const assert = require('assert');

console.log('🧪 Testing hardened config validation...\n');

// Helper to spawn a child process with custom env
function testConfig(envOverrides, expectFailure = false) {
  const { spawnSync } = require('child_process');
  const testEnv = { ...process.env, ...envOverrides };
  
  const result = spawnSync('node', ['-e', `
    Object.assign(process.env, ${JSON.stringify(envOverrides)});
    const { cfg, cfgSnapshot } = require('./lib/config');
    const c = cfg();
    process.stdout.write(JSON.stringify({ config: cfgSnapshot(), values: c }));
  `], {
    env: testEnv,
    encoding: 'utf8',
    timeout: 5000
  });
  
  return {
    exitCode: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr,
    success: result.status === 0
  };
}

// Test 1: Server starts with valid config (current env should work)
console.log('✅ Test 1: Valid config (server should start)');
try {
  const result = testConfig({});
  if (!result.success) {
    console.error('❌ FAILED: Valid config should not fail');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  console.log('   ✓ Server starts with valid config\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

// Test 2: Range validation - ESC_CANARY_PCT=150 should fail (max 100)
console.log('✅ Test 2: Range validation (ESC_CANARY_PCT=150 should fail)');
try {
  const result = testConfig({ ESC_CANARY_PCT: '150' });
  if (result.success) {
    console.error('❌ FAILED: ESC_CANARY_PCT=150 should be rejected (max 100)');
    process.exit(1);
  }
  if (!result.stderr.includes('must be <= 100')) {
    console.error('❌ FAILED: Error message should mention max value');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  console.log('   ✓ ESC_CANARY_PCT=150 correctly rejected');
  console.log('   ✓ Error message mentions max value\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

// Test 3: Range validation - ESC_CANARY_PCT=0 should pass (min 0)
console.log('✅ Test 3: Range validation (ESC_CANARY_PCT=0 should pass)');
try {
  const result = testConfig({ ESC_CANARY_PCT: '0' });
  if (!result.success) {
    console.error('❌ FAILED: ESC_CANARY_PCT=0 should be accepted');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  const data = JSON.parse(result.stdout);
  if (data.values.ESC_CANARY_PCT !== 0) {
    console.error('❌ FAILED: ESC_CANARY_PCT should be 0');
    process.exit(1);
  }
  console.log('   ✓ ESC_CANARY_PCT=0 correctly accepted\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

// Test 4: Case-insensitive booleans - "TRUE" should work
console.log('✅ Test 4: Case-insensitive boolean (ESCALATION_WORKER_ENABLED="TRUE")');
try {
  const result = testConfig({ ESCALATION_WORKER_ENABLED: 'TRUE' });
  if (!result.success) {
    console.error('❌ FAILED: Uppercase "TRUE" should be accepted');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  const data = JSON.parse(result.stdout);
  if (data.values.ESCALATION_WORKER_ENABLED !== true) {
    console.error('❌ FAILED: ESCALATION_WORKER_ENABLED should be boolean true');
    console.error('Got:', typeof data.values.ESCALATION_WORKER_ENABLED, data.values.ESCALATION_WORKER_ENABLED);
    process.exit(1);
  }
  console.log('   ✓ "TRUE" correctly parsed as boolean true');
  console.log('   ✓ Type is boolean, not string\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

// Test 5: Case-insensitive booleans - "False" should work
console.log('✅ Test 5: Case-insensitive boolean (ESC_DRY_RUN="False")');
try {
  const result = testConfig({ ESC_DRY_RUN: 'False' });
  if (!result.success) {
    console.error('❌ FAILED: Mixed case "False" should be accepted');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  const data = JSON.parse(result.stdout);
  if (data.values.ESC_DRY_RUN !== false) {
    console.error('❌ FAILED: ESC_DRY_RUN should be boolean false');
    console.error('Got:', typeof data.values.ESC_DRY_RUN, data.values.ESC_DRY_RUN);
    process.exit(1);
  }
  console.log('   ✓ "False" correctly parsed as boolean false');
  console.log('   ✓ Type is boolean, not string\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

// Test 6: Config snapshot returns proper types
console.log('✅ Test 6: Config snapshot returns proper types');
try {
  const result = testConfig({});
  if (!result.success) {
    console.error('❌ FAILED: Valid config should not fail');
    process.exit(1);
  }
  const data = JSON.parse(result.stdout);
  const snapshot = data.config;
  
  // Check that booleans are actually booleans
  if (typeof snapshot.ESCALATION_WORKER_ENABLED !== 'boolean') {
    console.error('❌ FAILED: ESCALATION_WORKER_ENABLED should be boolean');
    console.error('Got:', typeof snapshot.ESCALATION_WORKER_ENABLED);
    process.exit(1);
  }
  if (typeof snapshot.ESC_DRY_RUN !== 'boolean') {
    console.error('❌ FAILED: ESC_DRY_RUN should be boolean');
    console.error('Got:', typeof snapshot.ESC_DRY_RUN);
    process.exit(1);
  }
  
  // Check that numbers are actually numbers
  if (typeof snapshot.ESC_CANARY_PCT !== 'number') {
    console.error('❌ FAILED: ESC_CANARY_PCT should be number');
    console.error('Got:', typeof snapshot.ESC_CANARY_PCT);
    process.exit(1);
  }
  if (typeof snapshot.ESC_TICK_MS !== 'number') {
    console.error('❌ FAILED: ESC_TICK_MS should be number');
    console.error('Got:', typeof snapshot.ESC_TICK_MS);
    process.exit(1);
  }
  
  // Check that unknown_keys_note is present
  if (!snapshot.unknown_keys_note) {
    console.error('❌ FAILED: unknown_keys_note should be present in snapshot');
    process.exit(1);
  }
  
  console.log('   ✓ Booleans are boolean type (not strings)');
  console.log('   ✓ Numbers are number type (not strings)');
  console.log('   ✓ unknown_keys_note is present\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

// Test 7: Unknown key detection (should warn but not fail)
console.log('✅ Test 7: Unknown key detection');
try {
  const result = testConfig({ 
    ESCALATION_WORKR_ENABLED: 'true',  // Typo: WORKR instead of WORKER
    SOME_RANDOM_KEY: 'value'
  });
  if (!result.success) {
    console.error('❌ FAILED: Unknown keys should warn but not fail startup');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  if (!result.stderr.includes('Unknown env keys:')) {
    console.error('❌ FAILED: Should warn about unknown keys');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  if (!result.stderr.includes('ESCALATION_WORKR_ENABLED')) {
    console.error('❌ FAILED: Should mention ESCALATION_WORKR_ENABLED in warning');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  if (!result.stderr.includes('SOME_RANDOM_KEY')) {
    console.error('❌ FAILED: Should mention SOME_RANDOM_KEY in warning');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  console.log('   ✓ Unknown keys trigger warnings');
  console.log('   ✓ Warnings include key names');
  console.log('   ✓ Startup continues (doesn\'t fail)\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

// Test 8: Integer range - ESC_TICK_MS too small should fail
console.log('✅ Test 8: Integer range (ESC_TICK_MS=500 should fail, min 1000)');
try {
  const result = testConfig({ ESC_TICK_MS: '500' });
  if (result.success) {
    console.error('❌ FAILED: ESC_TICK_MS=500 should be rejected (min 1000)');
    process.exit(1);
  }
  if (!result.stderr.includes('must be >= 1000')) {
    console.error('❌ FAILED: Error message should mention min value');
    console.error('stderr:', result.stderr);
    process.exit(1);
  }
  console.log('   ✓ ESC_TICK_MS=500 correctly rejected');
  console.log('   ✓ Error message mentions min value\n');
} catch (err) {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
}

console.log('🎉 All hardened config tests passed!\n');
console.log('Summary:');
console.log('  ✓ Valid config works');
console.log('  ✓ Range validation (min/max) enforced');
console.log('  ✓ Case-insensitive booleans work');
console.log('  ✓ Config snapshot returns proper types');
console.log('  ✓ Unknown key detection warns');
console.log('  ✓ Clear error messages for validation failures');
