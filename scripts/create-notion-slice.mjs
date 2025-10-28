#!/usr/bin/env node
import { Client } from '@notionhq/client';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Notion not connected');
  }
  return accessToken;
}

async function getNotionClient() {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

async function findSlicesDatabase(notion) {
  console.log('Searching for Slices database...');
  
  // Search without filter to get all objects
  const response = await notion.search({
    query: 'Slices',
    page_size: 20
  });

  // Filter for databases manually
  const databases = response.results.filter(item => item.object === 'database');
  
  console.log(`Found ${databases.length} database(s) matching "Slices"`);
  
  const slicesDb = databases.find(db => {
    const title = db.title?.[0]?.plain_text || '';
    const hasModuleProperty = db.properties?.Module !== undefined;
    console.log(`  - ${title} (has Module property: ${hasModuleProperty})`);
    return title.includes('Slices') || hasModuleProperty;
  });

  if (slicesDb) {
    console.log(`✅ Found Slices database: ${slicesDb.title[0]?.plain_text || 'Slices'}`);
    return slicesDb.id;
  }

  console.log('\n⚠️  Could not auto-discover Slices database.');
  console.log('Please set NOTION_SLICES_DB_ID environment variable or provide it as an argument.');
  console.log('\nTo find your database ID:');
  console.log('1. Open your Slices database in Notion');
  console.log('2. Copy the URL (it contains the database ID)');
  console.log('3. The ID is the 32-character hex string in the URL');
  console.log('   Example: https://notion.so/myworkspace/DATABASE_ID?v=...');
  
  throw new Error('Could not find Slices database. Please provide NOTION_SLICES_DB_ID environment variable.');
}

async function createSlicePage(notion, databaseId) {
  console.log('Creating Tasks → Voice Notes slice page...');

  const acContent = `AC — Tasks: Voice Notes (Flagged, Internal)
1) Visibility & Guarding
   - Feature flag \`voiceToText\` must be ON for UI to appear.
   - Button block visible only if role has \`tasks.voice.create\`; playback requires \`tasks.voice.read\`.
   - Backend returns 403 for unauthorized create/read.

2) Recording & Upload (Internal)
   - UI provides Record → Stop → Save flow (MediaRecorder).
   - Accepts max 2 minutes OR 5 MB, whichever first; shows countdown.
   - On Save, uploads multipart to POST /api/tasks/:id/voice-notes; server returns {id, url, duration, createdAt}.

3) Playback & Listing
   - Task Detail shows a list of voice notes with timestamp, duration, and a Play control.
   - Task List shows a small badge "🎙️" when any voice notes exist (feature-flagged).
   - Delete/hard-delete NOT included in this slice.

4) Error & States
   - If mic permission denied → inline guidance; Save disabled.
   - Large/long recording → client blocks with message; server also enforces 413 (payload too large).
   - Network/server errors show non-blocking toast; no partial UI states linger.

5) API Contract (v1, internal)
   - POST /api/tasks/:id/voice-notes  (multipart: file, duration)
     → 201 { item: { id, taskId, url, duration, createdAt } }, 400/403/413 on error.
   - GET /api/tasks/:id/voice-notes
     → 200 { items: [ { id, url, duration, createdAt } ] }

6) Tests & Docs
   - Smoke: Admin can record+save+play; Viewer can play (if \`tasks.voice.read\`) but cannot record.
   - Feature flag OFF → no recording UI, no badge; direct endpoints still RBAC-enforced.
   - Add \`VOICE_NOTES.md\` with usage, limits, and RBAC notes.`;

  const testScriptContent = `Test — Voice Notes (Flagged, Internal)
Given: Flag ON, role = Admin
1) Open any Task Detail → "Record" visible.
2) Click Record → countdown starts; Stop within 10s.
3) Click Save → 201; note appears with duration; Play works.

Negative:
A) Flag OFF → "Record" hidden; badge hidden.
B) Viewer role → Play works (if \`tasks.voice.read\`), Record hidden; POST returns 403.
C) Over-limit (simulate >2min or >5MB) → client blocks; if forced, server 413.

Artifacts:
- 3 screenshots: recording UI, saved note list, Task List badge.`;

  const properties = {
    'Name': {
      title: [{ text: { content: 'Tasks — Voice Notes (Flagged, Internal)' } }]
    }
  };

  // Try to add optional properties if they exist in the database
  try {
    const dbInfo = await notion.databases.retrieve({ database_id: databaseId });
    
    if (dbInfo.properties['Module']) {
      properties['Module'] = { select: { name: 'Tasks' } };
    }
    if (dbInfo.properties['Status']) {
      properties['Status'] = { select: { name: 'Planned' } };
    }
    if (dbInfo.properties['Flag?']) {
      properties['Flag?'] = { checkbox: true };
    }
    if (dbInfo.properties['Pages Impacted']) {
      properties['Pages Impacted'] = {
        multi_select: [
          { name: 'Task Detail' },
          { name: 'Task List' },
          { name: 'Task API' }
        ]
      };
    }
    if (dbInfo.properties['RBAC Impact']) {
      properties['RBAC Impact'] = {
        rich_text: [{ text: { content: 'tasks.voice.create, tasks.voice.read (frontend hides; backend enforces)' } }]
      };
    }
    if (dbInfo.properties['Backend Changes']) {
      properties['Backend Changes'] = {
        rich_text: [{ text: { content: 'POST /api/tasks/:id/voice-notes (multipart, max 2 min / 5 MB, webm/ogg/mp4), GET list; store file URL + duration; no external transcription yet.' } }]
      };
    }
    if (dbInfo.properties['Frontend Changes']) {
      properties['Frontend Changes'] = {
        rich_text: [{ text: { content: 'Record/Stop/Save UI on Task Detail behind <FeatureGate feature="voiceToText">; show waveform placeholder; playback list with duration; badge on Task List when task has voice notes.' } }]
      };
    }
  } catch (err) {
    console.warn('⚠️  Could not retrieve database properties, using basic properties only');
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Acceptance Criteria' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          language: 'plain text',
          rich_text: [{ text: { content: acContent } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Test Scripts' } }]
        }
      },
      {
        object: 'block',
        type: 'code',
        code: {
          language: 'plain text',
          rich_text: [{ text: { content: testScriptContent } }]
        }
      }
    ]
  });

  console.log('✅ Slice page created successfully!');
  console.log(`📄 Page URL: ${response.url}`);
  return response;
}

async function main() {
  try {
    const notion = await getNotionClient();
    
    const databaseId = process.env.NOTION_SLICES_DB_ID || await findSlicesDatabase(notion);
    
    const page = await createSlicePage(notion, databaseId);
    
    console.log('\n🎉 SUCCESS: Tasks → Voice Notes slice card created in Notion!');
    console.log(`Visit: ${page.url}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure Notion integration is connected');
    console.error('2. Provide NOTION_SLICES_DB_ID environment variable if auto-discovery fails');
    console.error('3. Ensure the Notion integration has access to your ERP Master Plan workspace');
    process.exit(1);
  }
}

main();
