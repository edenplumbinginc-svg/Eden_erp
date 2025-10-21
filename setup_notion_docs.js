// Create ERP Development Log in Notion
const { Client } = require('@notionhq/client');

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
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

async function createERPDocumentation() {
  const notion = await getNotionClient();
  
  // Search for existing pages or create in default workspace
  const response = await notion.search({
    query: 'ERP Development Log',
    filter: { property: 'object', value: 'page' }
  });

  if (response.results.length > 0) {
    console.log('✅ Found existing ERP Development Log page');
    console.log('   URL:', response.results[0].url);
    return response.results[0];
  }

  // Get the first available parent (workspace or page)
  const search = await notion.search({ page_size: 1 });
  
  if (!search.results || search.results.length === 0) {
    throw new Error('No workspace found. Please create a page in Notion first, then run this again.');
  }

  const parentId = search.results[0].id;

  // Create the main documentation page
  const page = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: 'emoji', emoji: '🏗️' },
    properties: {
      title: [{ text: { content: 'ERP Development Log' } }]
    },
    children: [
      {
        heading_1: {
          rich_text: [{ text: { content: '🔧 Current Setup' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Database: Supabase (Direct Connection)' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Host: db.jwehjdggkskmjrmoqibk.supabase.co' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Password Location: Replit Secrets > DATABASE_URL' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Backend: Port 3000' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Frontend: Port 5000' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ 
            text: { 
              content: 'GitHub Repos: Eden_erp (main), Eden_CoordinationApp (UI)' 
            } 
          }]
        }
      },
      {
        divider: {}
      },
      {
        heading_1: {
          rich_text: [{ text: { content: '📅 Change Log' } }]
        }
      },
      {
        paragraph: {
          rich_text: [
            { text: { content: 'Date: ', style: { bold: true } } },
            { text: { content: 'Oct 21, 2025' } }
          ]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Change: Switched from pooler to direct connection' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Why: IPv4 support needed for Replit compatibility' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Password: lFkDpqEBYT2v65yX' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Fixed by: Replit Agent' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Learned: Direct connections need IPv4 add-on ($4/mo)' } }]
        }
      },
      {
        divider: {}
      },
      {
        heading_1: {
          rich_text: [{ text: { content: '🐛 Issue Tracker' } }]
        }
      },
      {
        heading_2: {
          rich_text: [{ text: { content: 'Issue #1: TLS Certificate Errors ✅ SOLVED' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Date: Oct 21, 2025' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Problem: "self-signed certificate in certificate chain"' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'Solution: Added HEALTH_TLS_RELAX=1 to Backend workflow' } }]
        }
      },
      {
        bulleted_list_item: {
          rich_text: [{ text: { content: 'What I Learned: Supabase direct connections need relaxed TLS' } }]
        }
      },
      {
        divider: {}
      },
      {
        heading_1: {
          rich_text: [{ text: { content: '❓ Questions to Ask Later' } }]
        }
      },
      {
        to_do: {
          rich_text: [{ text: { content: 'How do I add user authentication?' } }],
          checked: false
        }
      },
      {
        to_do: {
          rich_text: [{ text: { content: 'Should I switch to transaction pooler?' } }],
          checked: false
        }
      },
      {
        to_do: {
          rich_text: [{ text: { content: 'What are webhooks and do I need them?' } }],
          checked: false
        }
      },
      {
        divider: {}
      },
      {
        heading_1: {
          rich_text: [{ text: { content: '💡 Concepts I\'ve Learned' } }]
        }
      },
      {
        numbered_list_item: {
          rich_text: [{ text: { content: 'Connection String = Database Address + Password' } }]
        }
      },
      {
        numbered_list_item: {
          rich_text: [{ text: { content: 'Environment Variables = Settings that change behavior' } }]
        }
      },
      {
        numbered_list_item: {
          rich_text: [{ text: { content: 'TLS/SSL = Security for database connections' } }]
        }
      },
      {
        numbered_list_item: {
          rich_text: [{ text: { content: 'Pooler vs Direct = Different ways to connect to database' } }]
        }
      },
      {
        numbered_list_item: {
          rich_text: [{ text: { content: 'Health endpoints = Ways to check if the system is working' } }]
        }
      }
    ]
  });

  console.log('✅ Created ERP Development Log in Notion!');
  console.log('   URL:', page.url);
  return page;
}

createERPDocumentation()
  .then(page => {
    console.log('\n🎉 Success! Your Notion documentation is ready.');
    console.log('   Open this link:', page.url);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    if (err.message.includes('No workspace found')) {
      console.log('\n💡 Next step: Create any page in your Notion workspace, then run this again.');
    }
  });
