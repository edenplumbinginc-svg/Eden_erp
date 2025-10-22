const fs = require('fs');
const path = require('path');
const file = path.join('server','index.js');
let src = fs.readFileSync(file, 'utf8');

// Match the /tasks route block
const routeRe = /app\.get\(\s*['"]\/tasks['"]\s*,[\s\S]*?=>\s*\{\s*try\s*\{([\s\S]*?)\}\s*catch\s*\(e\)\s*\{\s*([\s\S]*?)\}\s*\}\s*\)\s*;?/m;

if (!routeRe.test(src)) {
  console.error('Could not locate /tasks route in server/index.js');
  process.exit(1);
}

src = src.replace(routeRe, (full, tryBody, catchBody) => {
  // Replace the res.json in try{} with standardized envelope + header
  let newTry = tryBody
    .replace(/const\s+filters\s*=\s*parseQuery\(req\.query\);\s*const\s+result\s*=\s*await\s*fetchTasks\(filters\);\s*res\.json\([\s\S]*?\);\s*/m,
`const filters = parseQuery(req.query);
const result = await fetchTasks(filters);
// Standard paged envelope + header for tooling
res.setHeader('X-Total-Count', String(result.total ?? 0));
res.json({
  items: result.items ?? [],
  total: result.total ?? 0,
  page: result.page ?? 1,
  limit: result.limit ?? 20
});
`)
    // Fallback: if previous pattern didn't match, try replacing a basic res.json with result
    .replace(/res\.json\(\{\s*ok:\s*true[^}]*\}\);/m,
`res.setHeader('X-Total-Count', String(result.total ?? 0));
res.json({
  items: result.items ?? [],
  total: result.total ?? 0,
  page: result.page ?? 1,
  limit: result.limit ?? 20
});`
);

  // Normalize error path to `{ error }` for non-2xx
  let newCatch = catchBody
    .replace(/if\s*\(e\.status\)\s*return\s*res\.status\(e\.status\)\.json\(\{\s*ok:\s*false,\s*error:\s*e\.message\s*\}\);\s*/m,
           `if (e.status) return res.status(e.status).json({ error: e.message });`);

  return full.replace(tryBody, newTry).replace(catchBody, newCatch);
});

fs.writeFileSync(file, src, 'utf8');
console.log('Patched /tasks handler in server/index.js');
