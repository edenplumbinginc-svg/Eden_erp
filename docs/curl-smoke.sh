#!/bin/bash

# docs/curl-smoke.sh - Curl commands for smoke testing Phase 1A + 1B

BASE_URL="http://localhost:3000"
PROJECT_ID=""
TASK_ID=""
SUBTASK_ID=""
BLOCKER_ID=""

echo "🔥 Eden ERP Phase 1A + 1B - Curl Smoke Tests"
echo "============================================="
echo ""

# 1. Health check
echo "1. Health check:"
curl -s "$BASE_URL/health" | jq '.'
echo ""

# 2. Create a test project
echo "2. Create project:"
PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-Dev-User-Email: test@example.com" \
  -H "X-User-Id: test-user-123" \
  -H "X-User-Email: test@example.com" \
  -d '{"name":"Curl Test Project","code":"CURL-001"}')
echo "$PROJECT_RESPONSE" | jq '.'
PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.id')
echo "Project ID: $PROJECT_ID"
echo ""

# 3. Create task with tags and origin
echo "3. Create task with tags:"
TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects/$PROJECT_ID/tasks" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{
    "title":"Task with Tags",
    "description":"Testing enhanced features",
    "tags":["api","test","curl"],
    "origin":"curl-test",
    "priority":"high"
  }')
echo "$TASK_RESPONSE" | jq '.'
TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.id')
echo "Task ID: $TASK_ID"
echo ""

# 4. Add subtask
echo "4. Add subtask:"
SUBTASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/subtasks" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{"title":"Subtask from curl","order_index":1}')
echo "$SUBTASK_RESPONSE" | jq '.'
SUBTASK_ID=$(echo "$SUBTASK_RESPONSE" | jq -r '.id')
echo "Subtask ID: $SUBTASK_ID"
echo ""

# 5. List subtasks
echo "5. List subtasks:"
curl -s "$BASE_URL/api/tasks/$TASK_ID/subtasks" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

# 6. Update subtask to done
echo "6. Mark subtask as done:"
curl -s -X PATCH "$BASE_URL/api/tasks/subtasks/$SUBTASK_ID" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{"done":true}' | jq '.'
echo ""

# 7. Create blocker task
echo "7. Create blocker task:"
BLOCKER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects/$PROJECT_ID/tasks" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{"title":"Blocking Task","description":"This must complete first"}')
BLOCKER_ID=$(echo "$BLOCKER_RESPONSE" | jq -r '.id')
echo "Blocker Task ID: $BLOCKER_ID"
echo ""

# 8. Add dependency
echo "8. Add task dependency:"
curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/dependencies" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d "{\"blocks_task_id\":\"$BLOCKER_ID\"}" | jq '.'
echo ""

# 9. List dependencies
echo "9. List task dependencies:"
curl -s "$BASE_URL/api/tasks/$TASK_ID/dependencies" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

# 10. Test status transitions
echo "10. Test status transition (todo -> in_progress):"
curl -s -X PATCH "$BASE_URL/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{"status":"in_progress"}' | jq '.status'
echo ""

echo "11. Test status transition (in_progress -> review):"
curl -s -X PATCH "$BASE_URL/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{"status":"review"}' | jq '.status'
echo ""

echo "12. Test invalid transition (review -> todo) - should fail:"
curl -s -X PATCH "$BASE_URL/api/tasks/$TASK_ID" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{"status":"todo"}' | jq '.'
echo ""

# 13. Add comment
echo "13. Add comment:"
curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/comments" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{"body":"Test comment from curl","author_id":"test-user-123"}' | jq '.'
echo ""

# 14. Ball handoff
echo "14. Ball handoff:"
curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/ball" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -d '{
    "to_user_id":"user-456",
    "from_user_id":"test-user-123",
    "note":"Passing via curl test"
  }' | jq '.'
echo ""

# 15. Get ball history
echo "15. Get ball history:"
curl -s "$BASE_URL/api/tasks/$TASK_ID/ball" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

# 16. Run notification queue
echo "16. Run notification queue:"
curl -s -X POST "$BASE_URL/ops/notifications/run?limit=10" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -H "X-User-Role: Admin" | jq '.'
echo ""

# 17. Generate daily summary
echo "17. Generate daily summary:"
curl -s -X POST "$BASE_URL/ops/notifications/daily-summary" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -H "X-User-Role: Admin" | jq '.'
echo ""

# 18. Generate weekly digest
echo "18. Generate weekly digest:"
curl -s -X POST "$BASE_URL/ops/notifications/weekly-digest" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -H "X-User-Role: Admin" | jq '.'
echo ""

# 19. Test reports
echo "19. Tasks by status report:"
curl -s "$BASE_URL/api/reports/tasks/status" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

echo "20. Tasks by ball_in_court report:"
curl -s "$BASE_URL/api/reports/tasks/ball" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

echo "21. Tasks by priority report:"
curl -s "$BASE_URL/api/reports/tasks/priority" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

echo "22. Overdue tasks report:"
curl -s "$BASE_URL/api/reports/tasks/overdue" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

echo "23. Recent activity report:"
curl -s "$BASE_URL/api/reports/activity/recent" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

# 24. Cleanup - Delete subtask
echo "24. Delete subtask:"
curl -s -X DELETE "$BASE_URL/api/tasks/subtasks/$SUBTASK_ID" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

# 25. Cleanup - Remove dependency
echo "25. Remove dependency:"
curl -s -X DELETE "$BASE_URL/api/tasks/$TASK_ID/dependencies/$BLOCKER_ID" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

# 26. Soft delete task
echo "26. Soft delete task:"
curl -s -X DELETE "$BASE_URL/api/tasks/$TASK_ID" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" | jq '.'
echo ""

# 27. Delete project
echo "27. Delete project:"
curl -s -X DELETE "$BASE_URL/api/projects/$PROJECT_ID" \
  -H "X-Dev-User-Id: test-user-123" \
  -H "X-User-Id: test-user-123" \
  -H "X-User-Role: Admin" | jq '.'
echo ""

# 28. List all routes
echo "28. List all API routes:"
curl -s "$BASE_URL/routes" | jq '.'
echo ""

echo "✅ Smoke tests completed!"
echo ""
echo "Note: Install jq for better output formatting: apt-get install jq"