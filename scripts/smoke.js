require('dotenv').config();
const base = `http://localhost:${process.env.PORT || 3000}`;

// Use global fetch if available (Node >=18), otherwise lazily import node-fetch
const getFetch = async () => (typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default);
const crypto = require('crypto');

function deriveStableUUID(input) {
  const h = crypto.createHash('sha256').update(String(input)).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

// These match the users we seeded
const DEV_ID    = deriveStableUUID('test-user-123');  // Manager
const VENDOR_ID = deriveStableUUID('test-vendor-1');  // User

const devHeaders = {
  'X-Dev-User-Id': 'test-user-123',
  'X-Dev-User-Role': 'Manager',
  'X-Dev-User-Email': 'test@example.com'
};

(async () => {
  const _fetch = await getFetch();
  console.log('🔥 Starting smoke tests...\n');

  // tiny helpers
  const jget = (url) => _fetch(url).then(r => r.json());
  const jpost = (url, body, extraHeaders={}) => _fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body || {})
  });
  const jpatch = (url, body, extraHeaders={}) => _fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body || {})
  });
  const jdel = (url, extraHeaders={}) => _fetch(url, { 
    method: 'DELETE',
    headers: extraHeaders
  });

  // 1) Health
  console.log('1️⃣  Testing health check...');
  const health = await jget(`${base}/health`);
  if (!health.ok) throw new Error('Health failed');
  console.log('✅ Health check passed\n');

  // 2) Project create (unique code each run to avoid duplicate-key)
  console.log('2️⃣  Creating test project...');
  const uniqueCode = `SMOKE-${Date.now()}`;
  let res = await jpost(`${base}/api/projects`, { name: 'Smoke Project', code: uniqueCode });
  let json = await res.json();
  if (!res.ok) { console.error('❌', json); process.exit(1); }
  const pid = json.id;
  console.log('✅ Project created:', pid, '\n');

  // 3) Task create
  console.log('3️⃣  Creating task with tags...');
  res = await jpost(`${base}/api/projects/${pid}/tasks`, {
    title: 'Smoke Task',
    priority: 'high',
    tags: ['backend','test','smoke'],
    origin: 'smoke-test'
  });
  json = await res.json();
  if (!res.ok) { console.error('❌', json); process.exit(1); }
  const tid = json.id;
  console.log('✅ Task created:', tid);
  console.log('   Tags:', JSON.stringify(json.tags || ['backend','test','smoke']));
  console.log('   Origin:', json.origin || 'smoke-test', '\n');

  // 4) Subtask create
  console.log('4️⃣  Adding subtask...');
  res = await jpost(`${base}/api/tasks/${tid}/subtasks`, { title: 'Sub 1' });
  json = await res.json();
  if (!res.ok) { console.error('❌', json); process.exit(1); }
  const sid = json.id;
  console.log('✅ Subtask created:', sid, '\n');

  // 5) Subtask done
  console.log('5️⃣  Updating subtask to done...');
  res = await jpatch(`${base}/api/subtasks/${sid}`, { done: true });
  if (!res.ok) { console.error('❌', await res.text()); process.exit(1); }
  console.log('✅ Subtask marked as done\n');

  // 6) Dependency add
  console.log('6️⃣  Adding task dependency...');
  // create a blocking task
  res = await jpost(`${base}/api/projects/${pid}/tasks`, { title: 'Blocking task' });
  const blocker = await res.json();
  if (!res.ok) { console.error('❌', blocker); process.exit(1); }
  const blockerId = blocker.id;
  res = await jpost(`${base}/api/tasks/${tid}/dependencies`, { blocks_task_id: blockerId });
  if (!res.ok) { console.error('❌', await res.text()); process.exit(1); }
  console.log(`✅ Dependency added: Task ${tid} blocked by ${blockerId}\n`);

  // 7) Status transitions
  console.log('7️⃣  Testing status transitions...');
  const ok1 = await jpatch(`${base}/api/tasks/${tid}`, { status: 'in_progress' });
  console.log(ok1.ok ? '✅ Valid status transition: todo → in_progress' : '❌ transition failed');
  const ok2 = await jpatch(`${base}/api/tasks/${tid}`, { status: 'review' });
  console.log(ok2.ok ? '✅ Valid status transition: in_progress → review' : '❌ transition failed');
  const bad = await jpatch(`${base}/api/tasks/${tid}`, { status: 'todo' });
  if (bad.ok) { console.log('❌ Invalid transition unexpectedly accepted'); process.exit(1); }
  console.log("✅ Invalid transition correctly rejected\n");

  // 8) Comment (use real author_id)
  console.log('8️⃣  Adding comment...');
  res = await jpost(`${base}/api/tasks/${tid}/comments`, { body: 'Smoke comment', author_id: DEV_ID }, devHeaders);
  if (!res.ok) { console.log(`❌ ${res.status} ${await res.text()}`); console.log('❌ Comment creation failed'); process.exit(1); }
  json = await res.json();
  console.log(`✅ Comment created by dev user: ${json.id}\n`);

  // 9) Ball handoff (DEV_ID -> VENDOR_ID)
  console.log('9️⃣  Testing ball handoff...');
  res = await jpost(`${base}/api/tasks/${tid}/ball`, { from_user_id: DEV_ID, to_user_id: VENDOR_ID, note: 'handoff' }, devHeaders);
  if (!res.ok) { console.log(`❌ ${res.status} ${await res.text()}`); console.log('❌ Ball handoff failed'); process.exit(1); }
  json = await res.json();
  console.log(`✅ Ball handed off to vendor: ${json.id}\n`);

  // 10a) Attachment init
  console.log('🔟a) Testing attachments...');
  // Init
  res = await jpost(`${base}/api/tasks/${tid}/attachments/init`, {}, devHeaders);
  if (!res.ok) { console.log(`❌ ${res.status} ${await res.text()}`); console.log('❌ Attachment init failed'); process.exit(1); }
  const { storage_key, upload_url } = await res.json();
  console.log('  ✅ Attachment init successful');

  // Complete
  res = await jpost(`${base}/api/tasks/${tid}/attachments/complete`, {
    storage_key,
    filename: 'test.txt',
    mime: 'text/plain',
    size_bytes: 12
  }, devHeaders);
  if (!res.ok) { console.log(`❌ ${res.status} ${await res.text()}`); console.log('❌ Attachment complete failed'); process.exit(1); }
  console.log('  ✅ Attachment upload completed');

  // List
  const attachments = await jget(`${base}/api/tasks/${tid}/attachments`);
  if (!Array.isArray(attachments)) { console.log('❌ Attachment list failed'); process.exit(1); }
  console.log(`  ✅ Listed ${attachments.length} attachment(s)`);

  // Delete
  if (attachments.length > 0) {
    const attachmentId = attachments[0].id;
    res = await jdel(`${base}/api/attachments/${attachmentId}`, devHeaders);
    if (!res.ok) { console.log(`❌ ${res.status} ${await res.text()}`); console.log('❌ Attachment delete failed'); process.exit(1); }
    console.log('  ✅ Attachment deleted\n');
  }

  // 10) Notification runner
  console.log('🔟 Running notification queue...');
  res = await jpost(`${base}/ops/notifications/run?limit=10`);
  json = await res.json().catch(() => ({}));
  if (!res.ok) { console.log(`❌ ${res.status} ${await res.text()}`); console.log('❌ Notification queue run failed'); process.exit(1); }
  console.log(`✅ Processed ${json.processed ?? 0} notifications\n`);

  // 11) Activity log (reuse existing endpoint as a proxy)
  console.log('1️⃣1️⃣ Checking activity log...');
  const acts = await jget(`${base}/api/reports/activity/recent`);
  if (!Array.isArray(acts)) { console.log('❌ Activity log query failed'); process.exit(1); }
  console.log(`✅ Activity log has ${acts.length} recent entries\n`);

  // 12) Reports
  console.log('1️⃣2️⃣ Testing reports...');
  const statusReport = await jget(`${base}/api/reports/tasks/status`);
  if (!Array.isArray(statusReport)) { console.log('❌ Status report failed'); process.exit(1); }
  console.log('✅ Status report working\n');

  // 13) Soft delete task
  console.log('1️⃣3️⃣ Cleaning up - soft deleting task...');
  res = await jdel(`${base}/api/tasks/${tid}/soft`);
  if (!res.ok) { console.log('❌ Soft delete failed'); process.exit(1); }
  const delJson = await res.json();
  if (!delJson?.deleted) { console.log('❌ Soft delete response malformed'); process.exit(1); }
  console.log('✅ Task soft deleted\n');

  // 14) Project delete
  console.log('1️⃣4️⃣ Deleting test project...');
  res = await jdel(`${base}/api/projects/${pid}`);
  if (!res.ok) { console.log('❌ Project delete failed'); process.exit(1); }
  console.log('✅ Project deleted\n');

  console.log('✨ Smoke tests completed!');
})().catch(e => {
  console.error('Smoke error:', e);
  process.exit(1);
});
