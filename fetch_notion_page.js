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

async function fetchPageContent() {
  const notion = await getNotionClient();
  const pageId = '2911f729313880bf8f3dca6ef8e8dd73';
  
  try {
    // Get page details
    const page = await notion.pages.retrieve({ page_id: pageId });
    console.log('📄 Page Title:', page.properties?.title?.title?.[0]?.plain_text || 'ERP MASTER PLAN');
    console.log('\n');
    
    // Get page content blocks
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    });
    
    console.log('📋 Page Structure:\n');
    
    for (const block of blocks.results) {
      const type = block.type;
      
      if (type === 'heading_1') {
        const text = block.heading_1?.rich_text?.[0]?.plain_text || '';
        console.log(`\n🔷 ${text}`);
      } else if (type === 'heading_2') {
        const text = block.heading_2?.rich_text?.[0]?.plain_text || '';
        console.log(`  ▪️ ${text}`);
      } else if (type === 'heading_3') {
        const text = block.heading_3?.rich_text?.[0]?.plain_text || '';
        console.log(`    • ${text}`);
      } else if (type === 'bulleted_list_item') {
        const text = block.bulleted_list_item?.rich_text?.[0]?.plain_text || '';
        console.log(`    - ${text}`);
      } else if (type === 'numbered_list_item') {
        const text = block.numbered_list_item?.rich_text?.[0]?.plain_text || '';
        console.log(`    ${text}`);
      } else if (type === 'to_do') {
        const text = block.to_do?.rich_text?.[0]?.plain_text || '';
        const checked = block.to_do?.checked ? '✅' : '☐';
        console.log(`    ${checked} ${text}`);
      } else if (type === 'child_database') {
        console.log(`    📊 Database: ${block.child_database?.title || 'Untitled'}`);
      } else if (type === 'child_page') {
        console.log(`    📁 Page: ${block.child_page?.title || 'Untitled'}`);
      }
    }
    
    // Check for child pages
    const childPages = blocks.results.filter(b => b.type === 'child_page');
    if (childPages.length > 0) {
      console.log('\n\n📁 Child Pages/Folders Found:');
      for (const childPage of childPages) {
        console.log(`  - ${childPage.child_page.title}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchPageContent();
