/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const roots = ['src/pages', 'apps/coordination_ui/src/pages', 'apps/coordination_ui/src/app'];

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = roots.flatMap(r => walk(r));
const offenders = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // crude but effective: <h1>   </h1>
  if (/<h1[^>]*>\s*<\/h1>/i.test(src)) offenders.push(f);
}

if (offenders.length) {
  console.error('❌ Empty <h1> detected in:');
  for (const f of offenders) console.error(' -', f);
  process.exit(1);
} else {
  console.log('✅ No empty <h1> tags found.');
}
