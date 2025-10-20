#!/usr/bin/env bash
set -euo pipefail
export PSQL_PAGER=cat

echo "🛑 Stopping any running server..."
pkill -f "node server" 2>/dev/null || true
sleep 1

echo "🚀 Starting API..."
node server.js > /tmp/server.log 2>&1 & SERVER_PID=$!
echo "PID: $SERVER_PID"
sleep 3

echo "🩺 Health:"
curl -s http://localhost:3000/health | jq .

echo "📁 Projects (before):"
curl -s http://localhost:3000/api/projects -H "X-Dev-Email: admin@edenmep.ca" | jq 'length as $n | {count:$n}'

PROJECT_ID=$(curl -s -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" -H "X-Dev-Email: admin@edenmep.ca" \
  -d '{"name":"Prod Smoke Project","code":"PS-001"}' | jq -r '.id')

echo "PROJECT_ID: $PROJECT_ID"

TASK_JSON=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/tasks" \
  -H "Content-Type: application/json" -H "X-Dev-Email: admin@edenmep.ca" \
  -d '{"title":"Prod Smoke Task","priority":"high","description":"Smoke test"}')
echo "$TASK_JSON" | jq .
TASK_ID=$(echo "$TASK_JSON" | jq -r '.id')

echo "→ Task row:"
psql "$DATABASE_URL" -X -P pager=off -c "select id,title,status from tasks where id='$TASK_ID';"

echo "→ Notifications:"
psql "$DATABASE_URL" -X -P pager=off -c "select type, payload->>'title' as title from notifications where task_id='$TASK_ID' order by created_at desc limit 5;"

TASK_COUNT=$(psql "$DATABASE_URL" -X -t -A -c "select count(*) from tasks where id='$TASK_ID';")
NOTIF_COUNT=$(psql "$DATABASE_URL" -X -t -A -c "select count(*) from notifications where task_id='$TASK_ID';")

echo "📊 Summary:"
echo "Tasks=$TASK_COUNT, Notifications=$NOTIF_COUNT"
if [ "$TASK_COUNT" = "1" ] && [ "$NOTIF_COUNT" -ge "1" ]; then
  echo "✅✅✅ PASS: transactional writes & event bus verified."
else
  echo "❌ FAIL: expected task=1 and notifications>=1. Check /tmp/server.log"
  tail -50 /tmp/server.log
  exit 1
fi
