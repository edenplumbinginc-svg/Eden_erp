#!/usr/bin/env node

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const DEV_EMAIL = 'test@edenplumbing.com';
const DEV_USER_ID = '855546bf-f53d-4538-b8d5-cd30f5c157a2';

async function jget(path, authenticated = true) {
  const headers = authenticated ? {
    'X-Dev-User-Email': DEV_EMAIL,
    'X-Dev-User-Id': DEV_USER_ID
  } : {};
  
  const res = await fetch(BASE + path, { headers });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

(async () => {
  try {
    console.log('🔍 Running API smoke tests...\n');

    const hz = await jget('/healthz', false);
    if (hz.status !== 'ok') throw new Error('healthz not ok');
    console.log('✓ Health check passed');

    const projects = await jget('/api/projects');
    if (!Array.isArray(projects) || projects.length < 1) throw new Error('no projects found');
    console.log(`✓ Projects endpoint (${projects.length} found)`);

    const firstProject = projects[0];
    const tasks = await jget(`/api/projects/${firstProject.id}/tasks`);
    if (!Array.isArray(tasks)) throw new Error('tasks not array');
    console.log(`✓ Tasks endpoint (${tasks.length} tasks in first project)`);

    const notifications = await jget('/api/notifications/recent');
    if (!Array.isArray(notifications)) throw new Error('notifications not array');
    console.log(`✓ Notifications endpoint (${notifications.length} recent)`);

    const reportStatus = await jget('/api/reports/tasks/status');
    if (!Array.isArray(reportStatus)) throw new Error('reports status not array');
    const totalTasks = reportStatus.reduce((sum, s) => sum + s.count, 0);
    console.log(`✓ Reports endpoint (${totalTasks} total tasks)`);

    console.log('\n✅ All smoke tests PASSED\n');
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Smoke tests FAILED:', e.message);
    process.exit(1);
  }
})();
