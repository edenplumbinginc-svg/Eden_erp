#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TOKEN="${TOKEN:-$(node -e 'try{process.stdout.write(process.env.DEV_JWT||"")}catch(e){process.stdout.write("")}')}"

# Dev headers for local development
auth_hdr=(-H "X-Dev-User-Email: test@edenplumbing.com" -H "X-Dev-User-Id: 855546bf-f53d-4538-b8d5-cd30f5c157a2")
# If TOKEN is provided, use Bearer auth instead
if [[ -n "${TOKEN}" && "${USE_JWT:-false}" == "true" ]]; then 
  auth_hdr=(-H "Authorization: Bearer ${TOKEN}"); 
fi

pass() { echo "✅ $*"; }
fail() { echo "❌ $*"; exit 1; }
warn() { echo "⚠️  $*"; }

echo "🔎 Task API Audit @ ${BASE_URL}"

# 1) Health
curl -sS "${BASE_URL}/health" >/dev/null && pass "Health endpoint responds" || fail "Health endpoint down"

# 2) Unauth read should be 401 (or 403 if you gate everything)
code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/tasks")
if [[ "$code" == "401" || "$code" == "403" ]]; then pass "Protected reads enforce auth ($code)"; else warn "Reads may be public ($code)"; fi

# 3) Authenticated read (with dev headers or TOKEN)
if true; then  # Always run authenticated checks in dev mode
  body=$(curl -sS "${auth_hdr[@]}" "${BASE_URL}/api/tasks?limit=5&page=1&sort=due_date:asc&q=test")
  echo "$body" | jq -e '.items' >/dev/null 2>&1 && pass "Reads return {items,...} shape" || fail "Response is not paged {items,...}"
  # 3a) Pagination stable ordering
  pg1_ids=$(echo "$body" | jq -r '.items[].id' | tr '\n' ' ')
  body2=$(curl -sS "${auth_hdr[@]}" "${BASE_URL}/api/tasks?limit=5&page=2&sort=due_date:asc&q=test")
  pg2_ids=$(echo "$body2" | jq -r '.items[].id' | tr '\n' ' ')
  if [[ "$pg1_ids" != "$pg2_ids" ]]; then pass "Pagination returns distinct pages"; else warn "Pagination likely broken (duplicate IDs)"; fi

  # 3b) Unknown params must be rejected
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/tasks?foo=bar")
  if [[ "$code" == "400" ]]; then pass "Unknown params rejected (400)"; else warn "Unknown params not validated (code=$code)"; fi

  # 3c) Filter fields sanity
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/tasks?status=overdue,in_progress")
  [[ "$code" == "200" ]] && pass "Status filter accepted" || warn "Status filter not supported"

  # 3d) Text search sanity
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/tasks?q=pump")
  [[ "$code" == "200" ]] && pass "Text search accepted" || warn "Text search not supported"

  # 3e) RBAC on writes
  create_code=$(curl -s -o /dev/null -w "%{http_code}" "${auth_hdr[@]}" -H "Content-Type: application/json" \
    -d '{"title":"Audit Test","status":"in_progress"}' "${BASE_URL}/api/tasks")
  if [[ "$create_code" == "201" ]]; then pass "Create allowed for this token (has tasks:write)"; 
  elif [[ "$create_code" == "403" ]]; then pass "Create correctly blocked (RBAC enforced)"; 
  else warn "Create returned unexpected code ($create_code)"; fi
fi

echo "🧪 Audit complete."
