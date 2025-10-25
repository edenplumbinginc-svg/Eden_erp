#!/usr/bin/env node

const { execSync } = require('child_process');

const requiredEnvs = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
  OPS_HMAC_SECRET: '1234567890123456',
};

function testConfigValidation(testName, envOverrides, shouldFail = true) {
  console.log(`\n🧪 Test: ${testName}`);
  console.log('─'.repeat(60));
  
  const envVars = { ...requiredEnvs, ...envOverrides };
  const envString = Object.entries(envVars)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  
  const cmd = `${envString} node -e "require('./lib/config').loadConfig(); console.log('✅ Config loaded successfully');"`;
  
  try {
    const output = execSync(cmd, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (shouldFail) {
      console.log('❌ FAIL: Expected validation to fail, but it passed');
      console.log('Output:', output);
      return false;
    } else {
      console.log('✅ PASS: Config loaded successfully');
      return true;
    }
  } catch (err) {
    if (shouldFail) {
      const stderr = err.stderr || err.stdout || '';
      if (stderr.includes('Configuration validation failed')) {
        console.log('✅ PASS: Validation failed as expected');
        console.log('Error message:');
        console.log(stderr);
        return true;
      } else {
        console.log('❌ FAIL: Failed but with unexpected error');
        console.log(stderr);
        return false;
      }
    } else {
      console.log('❌ FAIL: Expected validation to pass, but it failed');
      console.log('Error:', err.stderr || err.stdout || err.message);
      return false;
    }
  }
}

console.log('\n🚀 Config Validation Test Suite');
console.log('═'.repeat(60));

const results = [];

results.push(testConfigValidation(
  'Invalid numeric string (ESC_CANARY_PCT="abc")',
  { ESC_CANARY_PCT: 'abc' },
  true
));

results.push(testConfigValidation(
  'Invalid numeric string (ESC_TICK_MS="xyz123")',
  { ESC_TICK_MS: 'xyz123' },
  true
));

results.push(testConfigValidation(
  'Invalid boolean string (ESCALATION_WORKER_ENABLED="maybe")',
  { ESCALATION_WORKER_ENABLED: 'maybe' },
  true
));

results.push(testConfigValidation(
  'Invalid boolean string (ESCALATION_V1="yes")',
  { ESCALATION_V1: 'yes' },
  true
));

results.push(testConfigValidation(
  'Valid config with defaults',
  {},
  false
));

results.push(testConfigValidation(
  'Valid config with explicit values',
  { 
    ESC_CANARY_PCT: '50',
    ESC_TICK_MS: '30000',
    ESCALATION_WORKER_ENABLED: 'true',
    ESCALATION_V1: 'false'
  },
  false
));

results.push(testConfigValidation(
  'Valid config with string "false" for boolean',
  { ESCALATION_WORKER_ENABLED: 'false' },
  false
));

console.log('\n' + '═'.repeat(60));
console.log('📊 Test Results Summary');
console.log('═'.repeat(60));

const passed = results.filter(r => r).length;
const failed = results.filter(r => !r).length;

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total:  ${results.length}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
