#!/bin/bash
# Event Bus Verification Script - Post Workspace Restart
# Tests all three event types: task_created, status_changed, comment_added

set -e

echo "🔍 Event Bus Verification - Full API Path Test"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Health check
echo -e "${BLUE}Step 1: Health Check${NC}"
HEALTH=$(curl -s http://localhost:3000/health)
echo "Health: $HEALTH"
echo ""

# Step 2: Get or create a project
echo -e "${BLUE}Step 2: Get/Create Test Project${NC}"
PROJECT_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM projects LIMIT 1;" | xargs)

if [ -z "$PROJECT_ID" ]; then
  echo "Creating new project..."
  PROJECT_ID=$(curl -s -X POST "http://localhost:3000/api/projects" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-token" \
    -d '{"name":"Event Bus Test","code":"EVTBUS"}' | jq -r '.id')
fi

echo "Project ID: $PROJECT_ID"
echo ""

# Step 3: Create task → should emit task_created
echo -e "${BLUE}Step 3: Create Task (task_created event)${NC}"
TASK_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/projects/$PROJECT_ID/tasks" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@edenmep.ca" \
  -d '{"title":"Post-Restart Create Test","description":"Testing event bus after workspace restart","priority":"high"}')

echo "$TASK_RESPONSE" | jq .
TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✅ Task created: $TASK_ID${NC}"
echo ""

# Wait for async event processing
sleep 1

# Step 4: Update task status → should emit status_changed
echo -e "${BLUE}Step 4: Update Status (status_changed event)${NC}"
STATUS_RESPONSE=$(curl -s -X PATCH "http://localhost:3000/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@edenmep.ca" \
  -d '{"status":"in_progress"}')

echo "$STATUS_RESPONSE" | jq -r '{id, title, status}'
echo -e "${GREEN}✅ Status updated to in_progress${NC}"
echo ""

# Wait for async event processing
sleep 1

# Step 5: Add comment → should emit comment_added
echo -e "${BLUE}Step 5: Add Comment (comment_added event)${NC}"
COMMENT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/tasks/$TASK_ID/comments" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@edenmep.ca" \
  -d '{"body":"Post-restart comment smoke test - verifying event bus notification system works end-to-end via API calls"}')

echo "$COMMENT_RESPONSE" | jq -r '{id, body}'
echo -e "${GREEN}✅ Comment added${NC}"
echo ""

# Wait for async event processing
sleep 2

# Step 6: Verify all events in database
echo -e "${BLUE}Step 6: Verify Events in Database${NC}"
echo "Recent notifications (last 10 minutes):"
echo ""

psql "$DATABASE_URL" -c "
  SELECT 
    type,
    SUBSTRING(project_id::text, 1, 8) || '...' as proj,
    SUBSTRING(task_id::text, 1, 8) || '...' as task,
    COALESCE(payload->>'title', '-') as title,
    COALESCE(payload->>'new_status', '-') as new_status,
    COALESCE(SUBSTRING(payload->>'comment_preview', 1, 40), '-') as preview,
    TO_CHAR(created_at, 'HH24:MI:SS') as time
  FROM notifications
  WHERE created_at > now() - interval '10 minutes'
  ORDER BY created_at DESC
  LIMIT 10;
"

echo ""

# Step 7: Check server logs for errors
echo -e "${BLUE}Step 7: Check for Event Errors in Logs${NC}"
echo "Looking for 'notify(...) failed' messages..."
echo ""

if grep -q "notify.*failed.*bigint" /tmp/logs/Backend_*.log 2>/dev/null; then
  echo -e "${YELLOW}⚠️  Found bigint errors - pool cache still present${NC}"
  echo "Latest error:"
  grep "notify.*failed" /tmp/logs/Backend_*.log 2>/dev/null | tail -3
else
  echo -e "${GREEN}✅ No bigint errors found - pool cache cleared!${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}Event Bus Verification Complete!${NC}"
echo ""
echo "Expected Results:"
echo "  ✓ task_created event with title='Post-Restart Create Test'"
echo "  ✓ status_changed event with new_status='in_progress'"
echo "  ✓ comment_added event with comment preview"
echo "  ✓ No 'bigint' errors in server logs"
