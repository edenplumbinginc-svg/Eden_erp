// scripts/smoke.js - Smoke tests for Phase 1A + 1B implementation
require('dotenv').config({ override: true });

const baseURL = 'http://localhost:3000';

// Utility to make HTTP requests
async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Use new X-Dev-User-* headers
      'X-Dev-User-Id': 'test-user-123',
      'X-Dev-User-Email': 'test@example.com',
      'X-Dev-User-Role': 'Admin',
      // Keep old headers for backward compatibility
      'X-User-Id': 'test-user-123',
      'X-User-Email': 'test@example.com',
      'X-User-Role': 'Admin'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${baseURL}${path}`, options);
    const data = await response.text();
    
    if (!response.ok) {
      console.error(`❌ ${method} ${path} failed with status ${response.status}: ${data}`);
      return { error: data, status: response.status };
    }
    
    try {
      return { data: JSON.parse(data), status: response.status };
    } catch (e) {
      return { data: data, status: response.status };
    }
  } catch (error) {
    console.error(`❌ ${method} ${path} request failed:`, error.message);
    return { error: error.message };
  }
}

async function runSmoke() {
  console.log('🔥 Starting smoke tests...\n');
  
  let projectId;
  let taskId;
  let subtaskId;
  
  // 1. Health check
  console.log('1️⃣  Testing health check...');
  const health = await request('GET', '/health');
  if (health.data?.ok) {
    console.log('✅ Health check passed');
  } else {
    console.log('❌ Health check failed');
  }
  
  // 2. Create project
  console.log('\n2️⃣  Creating test project...');
  const project = await request('POST', '/api/projects', {
    name: 'Smoke Test Project',
    code: 'SMOKE-001'
  });
  if (project.data?.id) {
    projectId = project.data.id;
    console.log(`✅ Project created: ${projectId}`);
  } else {
    console.log('❌ Project creation failed');
  }
  
  // 3. Create task with tags
  console.log('\n3️⃣  Creating task with tags...');
  const task = await request('POST', `/api/projects/${projectId}/tasks`, {
    title: 'Test Task with Tags',
    description: 'Testing enhanced features',
    tags: ['backend', 'test', 'smoke'],
    origin: 'smoke-test',
    priority: 'high'
  });
  if (task.data?.id) {
    taskId = task.data.id;
    console.log(`✅ Task created: ${taskId}`);
    console.log(`   Tags: ${JSON.stringify(task.data.tags)}`);
    console.log(`   Origin: ${task.data.origin}`);
  } else {
    console.log('❌ Task creation failed');
  }
  
  // 4. Add subtask
  console.log('\n4️⃣  Adding subtask...');
  const subtask = await request('POST', `/api/tasks/${taskId}/subtasks`, {
    title: 'Test Subtask',
    order_index: 1
  });
  if (subtask.data?.id) {
    subtaskId = subtask.data.id;
    console.log(`✅ Subtask created: ${subtaskId}`);
  } else {
    console.log('❌ Subtask creation failed');
  }
  
  // 5. Update subtask
  console.log('\n5️⃣  Updating subtask to done...');
  const updatedSubtask = await request('PATCH', `/api/tasks/subtasks/${subtaskId}`, {
    done: true
  });
  if (updatedSubtask.data?.done === true) {
    console.log('✅ Subtask marked as done');
  } else {
    console.log('❌ Subtask update failed');
  }
  
  // 6. Add dependency
  console.log('\n6️⃣  Adding task dependency...');
  // Create another task to be dependency
  const blocker = await request('POST', `/api/projects/${projectId}/tasks`, {
    title: 'Blocking Task',
    description: 'This blocks the main task'
  });
  if (blocker.data?.id) {
    const dependency = await request('POST', `/api/tasks/${taskId}/dependencies`, {
      blocks_task_id: blocker.data.id
    });
    if (dependency.data?.blocks_task_id) {
      console.log(`✅ Dependency added: Task ${taskId} blocked by ${blocker.data.id}`);
    } else {
      console.log('❌ Dependency creation failed');
    }
  }
  
  // 7. Test status transitions
  console.log('\n7️⃣  Testing status transitions...');
  // Try valid transition: todo -> in_progress
  const statusUpdate1 = await request('PATCH', `/api/tasks/${taskId}`, {
    status: 'in_progress'
  });
  if (statusUpdate1.data?.status === 'in_progress') {
    console.log('✅ Valid status transition: todo → in_progress');
  } else {
    console.log('❌ Status transition failed');
  }
  
  // Try another valid transition: in_progress -> review
  const statusUpdate2 = await request('PATCH', `/api/tasks/${taskId}`, {
    status: 'review'
  });
  if (statusUpdate2.data?.status === 'review') {
    console.log('✅ Valid status transition: in_progress → review');
  } else {
    console.log('❌ Status transition failed');
  }
  
  // Try invalid transition (should fail): review -> todo
  const statusUpdate3 = await request('PATCH', `/api/tasks/${taskId}`, {
    status: 'todo'
  });
  if (statusUpdate3.error) {
    console.log('✅ Invalid transition correctly rejected');
  } else {
    console.log('❌ Invalid transition was not rejected');
  }
  
  // 8. Add comment (should trigger notification)
  console.log('\n8️⃣  Adding comment...');
  const comment = await request('POST', `/api/tasks/${taskId}/comments`, {
    body: 'This is a smoke test comment',
    author_id: 'test-user-123'
  });
  if (comment.data?.id) {
    console.log(`✅ Comment added: ${comment.data.id}`);
  } else {
    console.log('❌ Comment creation failed');
  }
  
  // 9. Ball handoff
  console.log('\n9️⃣  Testing ball handoff...');
  const ballHandoff = await request('POST', `/api/tasks/${taskId}/ball`, {
    to_user_id: 'user-456',
    from_user_id: 'test-user-123',
    note: 'Passing the ball in smoke test'
  });
  if (ballHandoff.data?.ball_in_court === 'user-456') {
    console.log('✅ Ball handoff successful');
  } else {
    console.log('❌ Ball handoff failed');
  }
  
  // 10. Run notification queue
  console.log('\n🔟 Running notification queue...');
  const notifications = await request('POST', '/ops/notifications/run?limit=10');
  if (notifications.data?.processed !== undefined) {
    console.log(`✅ Processed ${notifications.data.processed} notifications`);
  } else {
    console.log('❌ Notification queue run failed');
  }
  
  // 11. Check activity log
  console.log('\n1️⃣1️⃣ Checking activity log...');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  
  try {
    const logs = await pool.query(
      `SELECT entity_type, action, created_at 
       FROM public.activity_log 
       WHERE created_at > now() - INTERVAL '5 minutes'
       ORDER BY created_at DESC 
       LIMIT 5`
    );
    if (logs.rows.length > 0) {
      console.log(`✅ Activity log has ${logs.rows.length} recent entries`);
      logs.rows.forEach(log => {
        console.log(`   - ${log.action} ${log.entity_type}`);
      });
    } else {
      console.log('⚠️  No recent activity log entries found');
    }
  } catch (e) {
    console.log('❌ Could not query activity log:', e.message);
  } finally {
    await pool.end();
  }
  
  // 12. Test reports
  console.log('\n1️⃣2️⃣ Testing reports...');
  const statusReport = await request('GET', '/api/reports/tasks/status');
  if (statusReport.data && Array.isArray(statusReport.data)) {
    console.log('✅ Status report working');
  } else {
    console.log('❌ Status report failed');
  }
  
  // 13. Cleanup - soft delete task
  console.log('\n1️⃣3️⃣ Cleaning up - soft deleting task...');
  const deleteTask = await request('DELETE', `/api/tasks/${taskId}`);
  if (deleteTask.data?.deleted) {
    console.log('✅ Task soft deleted');
  } else {
    console.log('❌ Task deletion failed');
  }
  
  // 14. Delete project
  console.log('\n1️⃣4️⃣ Deleting test project...');
  const deleteProject = await request('DELETE', `/api/projects/${projectId}`);
  if (deleteProject.data?.deleted) {
    console.log('✅ Project deleted');
  } else {
    console.log('❌ Project deletion failed');
  }
  
  console.log('\n✨ Smoke tests completed!\n');
}

// Check if server is running first
fetch(`${baseURL}/health`)
  .then(response => {
    if (!response.ok) {
      console.error('❌ Server is not running. Please start it with: npm run dev');
      process.exit(1);
    }
    return runSmoke();
  })
  .catch(error => {
    console.error('❌ Cannot connect to server at', baseURL);
    console.error('   Please start the server with: npm run dev');
    process.exit(1);
  });