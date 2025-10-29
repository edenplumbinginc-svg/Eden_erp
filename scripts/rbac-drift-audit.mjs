#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RBAC_JSON_PATH = path.join(__dirname, '../apps/coordination_ui/src/config/rbac.json');

const args = process.argv.slice(2);
const FIX_MODE = args.includes('--fix');

async function connectDB() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

async function getDBPermissionMatrix(client) {
  const query = `
    SELECT 
      r.name as role,
      p.code as permission
    FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
    ORDER BY r.name, p.code;
  `;
  
  const result = await client.query(query);
  
  const matrix = {};
  for (const row of result.rows) {
    if (!matrix[row.role]) {
      matrix[row.role] = [];
    }
    matrix[row.role].push(row.permission);
  }
  
  return matrix;
}

async function loadRBACJson() {
  const content = await fs.readFile(RBAC_JSON_PATH, 'utf-8');
  return JSON.parse(content);
}

function flattenRBACJson(rbac) {
  const matrix = {};
  
  for (const [role, resources] of Object.entries(rbac)) {
    matrix[role] = [];
    
    for (const [resource, actions] of Object.entries(resources)) {
      for (const [action, value] of Object.entries(actions)) {
        if (value === true) {
          matrix[role].push(`${resource}.${action}`);
        }
      }
    }
    
    matrix[role].sort();
  }
  
  return matrix;
}

function unflattenToRBACJson(dbMatrix) {
  const rbac = {};
  
  for (const [role, permissions] of Object.entries(dbMatrix)) {
    rbac[role] = {};
    
    for (const perm of permissions) {
      const [resource, action] = perm.split('.');
      if (!resource || !action) continue;
      
      if (!rbac[role][resource]) {
        rbac[role][resource] = {};
      }
      
      rbac[role][resource][action] = true;
    }
  }
  
  return rbac;
}

function detectDrift(dbMatrix, jsonMatrix) {
  const drift = {
    missingInDB: {},
    extraInDB: {},
    missingInJSON: {},
    extraInJSON: {}
  };
  
  const allRoles = new Set([...Object.keys(dbMatrix), ...Object.keys(jsonMatrix)]);
  
  for (const role of allRoles) {
    const dbPerms = new Set(dbMatrix[role] || []);
    const jsonPerms = new Set(jsonMatrix[role] || []);
    
    const missingInDB = [...jsonPerms].filter(p => !dbPerms.has(p));
    const extraInDB = [...dbPerms].filter(p => !jsonPerms.has(p));
    
    if (missingInDB.length > 0) {
      drift.missingInDB[role] = missingInDB;
    }
    if (extraInDB.length > 0) {
      drift.extraInDB[role] = extraInDB;
    }
  }
  
  const rolesOnlyInJSON = [...Object.keys(jsonMatrix)].filter(r => !dbMatrix[r]);
  const rolesOnlyInDB = [...Object.keys(dbMatrix)].filter(r => !jsonMatrix[r]);
  
  if (rolesOnlyInJSON.length > 0) {
    drift.rolesOnlyInJSON = rolesOnlyInJSON;
  }
  if (rolesOnlyInDB.length > 0) {
    drift.rolesOnlyInDB = rolesOnlyInDB;
  }
  
  return drift;
}

function hasDrift(drift) {
  return (
    Object.keys(drift.missingInDB).length > 0 ||
    Object.keys(drift.extraInDB).length > 0 ||
    drift.rolesOnlyInJSON?.length > 0 ||
    drift.rolesOnlyInDB?.length > 0
  );
}

function printDriftReport(drift) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RBAC DRIFT AUDIT REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!hasDrift(drift)) {
    console.log('✅ No drift detected. rbac.json is in sync with database.\n');
    return;
  }
  
  console.log('⚠️  DRIFT DETECTED\n');
  
  if (drift.rolesOnlyInJSON?.length > 0) {
    console.log('🔴 Roles in rbac.json but NOT in database:');
    for (const role of drift.rolesOnlyInJSON) {
      console.log(`   - ${role}`);
    }
    console.log('');
  }
  
  if (drift.rolesOnlyInDB?.length > 0) {
    console.log('🟡 Roles in database but NOT in rbac.json:');
    for (const role of drift.rolesOnlyInDB) {
      console.log(`   - ${role}`);
    }
    console.log('');
  }
  
  if (Object.keys(drift.extraInDB).length > 0) {
    console.log('🟢 Permissions in database but MISSING in rbac.json:');
    for (const [role, perms] of Object.entries(drift.extraInDB)) {
      console.log(`   ${role}:`);
      for (const perm of perms) {
        console.log(`     + ${perm}`);
      }
    }
    console.log('');
  }
  
  if (Object.keys(drift.missingInDB).length > 0) {
    console.log('🔴 Permissions in rbac.json but MISSING in database:');
    for (const [role, perms] of Object.entries(drift.missingInDB)) {
      console.log(`   ${role}:`);
      for (const perm of perms) {
        console.log(`     - ${perm}`);
      }
    }
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function fixRBACJson(dbMatrix) {
  const newRBAC = unflattenToRBACJson(dbMatrix);
  await fs.writeFile(RBAC_JSON_PATH, JSON.stringify(newRBAC, null, 2) + '\n', 'utf-8');
  console.log(`✅ Fixed: Wrote ${RBAC_JSON_PATH} from database state\n`);
}

async function main() {
  console.log('🔍 RBAC Drift Auditor\n');
  
  const client = await connectDB();
  
  try {
    console.log('📊 Fetching database permission matrix...');
    const dbMatrix = await getDBPermissionMatrix(client);
    console.log(`   Found ${Object.keys(dbMatrix).length} roles in database\n`);
    
    console.log('📄 Loading rbac.json...');
    const rbacJson = await loadRBACJson();
    const jsonMatrix = flattenRBACJson(rbacJson);
    console.log(`   Found ${Object.keys(jsonMatrix).length} roles in rbac.json\n`);
    
    console.log('🔎 Comparing...');
    const drift = detectDrift(dbMatrix, jsonMatrix);
    
    printDriftReport(drift);
    
    if (FIX_MODE) {
      if (hasDrift(drift)) {
        console.log('🔧 Fix mode enabled. Syncing rbac.json from database...');
        await fixRBACJson(dbMatrix);
      } else {
        console.log('ℹ️  Fix mode enabled but no drift detected. Nothing to fix.\n');
      }
    } else if (hasDrift(drift)) {
      console.log('💡 Tip: Run with --fix to sync rbac.json from database\n');
    }
    
    await client.end();
    
    process.exit(hasDrift(drift) ? 2 : 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

main();
