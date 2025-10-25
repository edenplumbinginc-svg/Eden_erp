#!/usr/bin/env node
// Test script for config.js bug fixes

const { spawnSync } = require('child_process');

console.log('🧪 Testing config.js bug fixes...\n');

// Test 1: Missing boolean env vars should use defaults (not fail validation)
console.log('Test 1: Missing boolean env vars should use defaults');
const test1 = spawnSync('node', ['-e', `
  // Clear all boolean env vars
  delete process.env.ESCALATION_WORKER_ENABLED;
  delete process.env.ESCALATION_V1;
  delete process.env.ESC_DRY_RUN;
  
  // Set required env vars
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.OPS_HMAC_SECRET = 'test-secret-min-16-chars';
  
  const { cfg } = require('./lib/config.js');
  const c = cfg();
  
  console.log('✅ Config loaded successfully');
  console.log('ESCALATION_WORKER_ENABLED:', c.ESCALATION_WORKER_ENABLED, '(expected: false)');
  console.log('ESCALATION_V1:', c.ESCALATION_V1, '(expected: false)');
  console.log('ESC_DRY_RUN:', c.ESC_DRY_RUN, '(expected: true)');
  
  if (c.ESCALATION_WORKER_ENABLED === false && 
      c.ESCALATION_V1 === false && 
      c.ESC_DRY_RUN === true) {
    console.log('✅ Test 1 PASSED: Defaults applied correctly');
    process.exit(0);
  } else {
    console.log('❌ Test 1 FAILED: Defaults not applied correctly');
    process.exit(1);
  }
`], { stdio: 'inherit' });

if (test1.status !== 0) {
  console.log('\n❌ Test 1 FAILED\n');
  process.exit(1);
}

console.log('\n---\n');

// Test 2: Standard OS vars should NOT trigger unknown key warnings
console.log('Test 2: Standard OS vars should NOT trigger unknown key warnings');
const test2 = spawnSync('node', ['-e', `
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.OPS_HMAC_SECRET = 'test-secret-min-16-chars';
  
  // Add standard OS vars that should be ignored
  process.env.PATH = '/usr/bin:/bin';
  process.env.HOME = '/home/user';
  process.env.PWD = '/app';
  process.env.USER = 'testuser';
  process.env.SHELL = '/bin/bash';
  process.env.LANG = 'en_US.UTF-8';
  
  const { cfg } = require('./lib/config.js');
  const c = cfg();
  
  console.log('✅ Test 2 PASSED: No warnings for standard OS vars');
`], { stdio: 'pipe' });

const test2Output = test2.stderr.toString();
if (test2Output.includes('PATH') || 
    test2Output.includes('HOME') || 
    test2Output.includes('PWD') || 
    test2Output.includes('USER') || 
    test2Output.includes('SHELL')) {
  console.log('❌ Test 2 FAILED: Standard OS vars triggered warnings');
  console.log('Output:', test2Output);
  process.exit(1);
}
console.log('✅ Test 2 PASSED: Standard OS vars ignored correctly\n');

console.log('---\n');

// Test 3: Typos in relevant keys SHOULD trigger warnings
console.log('Test 3: Typos in relevant keys SHOULD trigger warnings');
const test3 = spawnSync('node', ['-e', `
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.OPS_HMAC_SECRET = 'test-secret-min-16-chars';
  
  // Add typos in relevant prefixes
  process.env.ESC_DRY_RU = 'true';  // Missing N
  process.env.ESCALATION_WORKR_ENABLED = 'true';  // Missing E
  process.env.SLAK_WEBHOOK_URL = 'http://example.com';  // Missing C
  
  const { cfg } = require('./lib/config.js');
  const c = cfg();
`], { stdio: 'pipe' });

const test3Output = test3.stderr.toString();
if (!test3Output.includes('ESC_DRY_RU') || 
    !test3Output.includes('ESCALATION_WORKR_ENABLED') ||
    !test3Output.includes('Unknown env keys')) {
  console.log('❌ Test 3 FAILED: Typos not detected');
  console.log('Output:', test3Output);
  process.exit(1);
}

// Should NOT warn about SLAK (doesn't start with SLACK_)
if (test3Output.includes('SLAK_WEBHOOK_URL')) {
  console.log('❌ Test 3 FAILED: False positive on SLAK_WEBHOOK_URL');
  console.log('Output:', test3Output);
  process.exit(1);
}

console.log('✅ Test 3 PASSED: Typos detected correctly');
console.log('Warnings:', test3Output.trim());

console.log('\n🎉 All tests passed!\n');
