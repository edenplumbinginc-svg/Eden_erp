const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Find root directory (where package.json with name "eden_erp" exists)
let rootDir = process.cwd();
while (!fs.existsSync(path.join(rootDir, 'docs/ui-contract.yaml'))) {
  const parent = path.dirname(rootDir);
  if (parent === rootDir) {
    // Reached filesystem root without finding it
    throw new Error('Could not find docs/ui-contract.yaml in parent directories');
  }
  rootDir = parent;
}

const specPath = path.join(rootDir, 'docs/ui-contract.yaml');
const outDir = path.join(rootDir, 'apps/coordination_ui/src/showcase');
const outFile = path.join(outDir, 'routes.json');

const doc = yaml.load(fs.readFileSync(specPath, 'utf8'));
const set = new Set();

for (const res of doc.resources || []) {
  for (const r of res.required_pages || []) {
    // inflate /path/[id] → /path/123 for demo navigation
    set.add(String(r).replace(/\[.*?\]/g, '123'));
  }
}

const routes = [...set].sort().map(route => ({
  route,
  label: route === '/' ? 'Home' : route
}));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify({ routes }, null, 2), 'utf8');
console.log(`✅ Wrote ${outFile} with ${routes.length} routes.`);
