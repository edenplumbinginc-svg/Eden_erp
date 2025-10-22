import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' 
    ? { rejectUnauthorized: false } 
    : undefined
});

await client.connect();

try {
  console.log('🌱 Seeding sample data for Eden Plumbing...');

  const { rows: users } = await client.query('SELECT id, email FROM users ORDER BY email LIMIT 3');
  if (users.length === 0) {
    console.error('❌ No users found. Please create users first.');
    process.exit(1);
  }

  const [user1, user2, user3] = users;
  console.log(`👥 Found ${users.length} users: ${users.map(u => u.email).join(', ')}`);

  const sampleProjects = [
    {
      name: 'Downtown Office Renovation',
      description: 'Complete plumbing overhaul for 3-story office building including new bathrooms, kitchen, and water system.',
      status: 'active'
    },
    {
      name: 'Residential Complex - Phase 2',
      description: '15-unit residential building requiring full plumbing installation and fixture setup.',
      status: 'active'
    },
    {
      name: 'Emergency Response Team',
      description: 'Ongoing emergency plumbing services and rapid response coordination.',
      status: 'active'
    }
  ];

  console.log('📁 Creating sample projects...');
  const projectIds = [];
  
  for (const proj of sampleProjects) {
    const { rows: existing } = await client.query(
      'SELECT id FROM projects WHERE name = $1',
      [proj.name]
    );
    
    if (existing.length > 0) {
      projectIds.push(existing[0].id);
      console.log(`  ↻ Project already exists: ${proj.name}`);
    } else {
      const { rows } = await client.query(
        `INSERT INTO projects (name, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [proj.name, proj.description, proj.status]
      );
      projectIds.push(rows[0].id);
      console.log(`  ✓ Created project: ${proj.name}`);
    }
  }

  const sampleTasks = [
    {
      project_id: projectIds[0],
      title: 'Order copper piping and fixtures',
      description: 'Need to procure 200ft of copper piping, 15 bathroom fixtures, and installation materials for downtown office project.',
      status: 'in_progress',
      priority: 'high',
      assignee_id: user1.id,
      ball_in_court: user1.id,
      department: 'Procurement',
      tags: ['procurement', 'urgent'],
      due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      project_id: projectIds[0],
      title: 'Site inspection and measurement',
      description: 'Complete on-site inspection of all 3 floors, measure existing pipe runs, and create installation plan.',
      status: 'done',
      priority: 'high',
      assignee_id: user2.id,
      ball_in_court: user2.id,
      department: 'Operations',
      tags: ['fieldwork', 'planning']
    },
    {
      project_id: projectIds[0],
      title: 'Schedule city permit inspection',
      description: 'Contact city building department to schedule required plumbing permit inspection before we begin work.',
      status: 'todo',
      priority: 'medium',
      assignee_id: user3.id,
      ball_in_court: user3.id,
      department: 'Operations',
      tags: ['permits', 'compliance'],
      due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      project_id: projectIds[1],
      title: 'Install water heaters in Units 1-5',
      description: 'Install 5 new tankless water heaters in residential units. All units ready for installation.',
      status: 'in_progress',
      priority: 'high',
      assignee_id: user1.id,
      ball_in_court: user2.id,
      department: 'Operations',
      tags: ['installation', 'residential']
    },
    {
      project_id: projectIds[1],
      title: 'Review contractor bid for fixture installation',
      description: 'Evaluate bid from ABC Plumbing Supply for bulk fixture installation. Need decision by end of week.',
      status: 'review',
      priority: 'medium',
      assignee_id: user2.id,
      ball_in_court: user1.id,
      department: 'Procurement',
      tags: ['bidding', 'decision-needed'],
      due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      project_id: projectIds[2],
      title: 'Emergency call - burst pipe at 123 Main St',
      description: 'Customer reported burst pipe in basement. Water shut off, need immediate response team dispatch.',
      status: 'in_progress',
      priority: 'urgent',
      assignee_id: user3.id,
      ball_in_court: user3.id,
      department: 'Service',
      tags: ['emergency', 'response'],
      origin: 'email'
    },
    {
      project_id: projectIds[2],
      title: 'Order emergency van stock replenishment',
      description: 'Emergency van #2 is low on common parts (washers, gaskets, pipe tape). Restock before next shift.',
      status: 'todo',
      priority: 'medium',
      assignee_id: user1.id,
      ball_in_court: user1.id,
      department: 'Service',
      tags: ['inventory', 'emergency-prep']
    },
    {
      project_id: projectIds[0],
      title: 'Create 3D bathroom layout mockup',
      description: 'Design team needs 3D mockup of proposed bathroom layouts for client approval before ordering custom fixtures.',
      status: 'todo',
      priority: 'low',
      assignee_id: user2.id,
      ball_in_court: user2.id,
      department: 'Estimating',
      tags: ['design', 'client-facing']
    }
  ];

  console.log('📋 Creating sample tasks...');
  const taskIds = [];
  
  for (const task of sampleTasks) {
    const { rows } = await client.query(
      `INSERT INTO tasks 
       (project_id, title, description, status, priority, assignee_id, ball_in_court, 
        department, tags, due_at, origin, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id`,
      [
        task.project_id, 
        task.title, 
        task.description, 
        task.status, 
        task.priority,
        task.assignee_id,
        task.ball_in_court,
        task.department,
        task.tags || [],
        task.due_at || null,
        task.origin || 'UI'
      ]
    );
    taskIds.push(rows[0].id);
    console.log(`  ✓ Created task: ${task.title}`);
  }

  console.log('💬 Adding sample comments...');
  
  const sampleComments = [
    {
      task_id: taskIds[0],
      author_id: user1.id,
      body: 'Called supplier - they have everything in stock. Can deliver within 48 hours.'
    },
    {
      task_id: taskIds[0],
      author_id: user2.id,
      body: 'Great! Make sure to order the chrome fixtures, not brass. Client changed their mind.'
    },
    {
      task_id: taskIds[1],
      author_id: user2.id,
      body: 'Inspection complete. Uploaded measurements to shared drive. Ready for next phase.'
    },
    {
      task_id: taskIds[5],
      author_id: user3.id,
      body: 'Team dispatched. ETA 15 minutes. Customer confirmed they shut off main water valve.'
    }
  ];

  for (const comment of sampleComments) {
    await client.query(
      `INSERT INTO task_comments (task_id, author_id, body, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [comment.task_id, comment.author_id, comment.body]
    );
  }
  console.log(`  ✓ Added ${sampleComments.length} comments`);

  console.log('✅ Adding sample subtasks...');
  
  const sampleSubtasks = [
    {
      task_id: taskIds[0],
      title: 'Get quote from supplier A',
      done: true
    },
    {
      task_id: taskIds[0],
      title: 'Get quote from supplier B',
      done: true
    },
    {
      task_id: taskIds[0],
      title: 'Place order with best supplier',
      done: false
    },
    {
      task_id: taskIds[3],
      title: 'Unit 1 - Install water heater',
      done: true
    },
    {
      task_id: taskIds[3],
      title: 'Unit 2 - Install water heater',
      done: true
    },
    {
      task_id: taskIds[3],
      title: 'Unit 3 - Install water heater',
      done: false
    },
    {
      task_id: taskIds[3],
      title: 'Unit 4 - Install water heater',
      done: false
    },
    {
      task_id: taskIds[3],
      title: 'Unit 5 - Install water heater',
      done: false
    }
  ];

  for (const subtask of sampleSubtasks) {
    await client.query(
      `INSERT INTO subtasks (task_id, title, done, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [subtask.task_id, subtask.title, subtask.done]
    );
  }
  console.log(`  ✓ Added ${sampleSubtasks.length} subtasks`);

  const { rows: stats } = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM projects WHERE name IN ('Downtown Office Renovation', 'Residential Complex - Phase 2', 'Emergency Response Team')) as project_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = ANY($1)) as task_count,
      (SELECT COUNT(*) FROM task_comments WHERE task_id = ANY($2)) as comment_count,
      (SELECT COUNT(*) FROM subtasks WHERE task_id = ANY($2)) as subtask_count
  `, [projectIds, taskIds]);

  console.log('\n🎉 Sample data seeding complete!');
  console.log(`📊 Created: ${stats[0].project_count} projects, ${stats[0].task_count} tasks, ${stats[0].comment_count} comments, ${stats[0].subtask_count} subtasks`);
  console.log('\n💡 Tip: Your family testers will now see realistic plumbing company data when they log in!');

} catch (error) {
  console.error('❌ Sample data seeding failed:', error);
  console.error(error.stack);
  process.exit(1);
} finally {
  await client.end();
}
