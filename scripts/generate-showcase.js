const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const specPath = path.join(process.cwd(), 'docs/ui-contract.yaml');
const outDir = path.join(process.cwd(), 'apps/coordination_ui/src/showcase');
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
