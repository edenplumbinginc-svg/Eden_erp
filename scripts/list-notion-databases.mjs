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

async function main() {
  try {
    const accessToken = await getAccessToken();
    const notion = new Client({ auth: accessToken });
    
    console.log('🔍 Searching for all databases accessible to this integration...\n');
    
    const response = await notion.search({
      page_size: 100
    });

    const databases = response.results.filter(item => item.object === 'database');
    
    console.log(`Found ${databases.length} database(s):\n`);
    
    databases.forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || '(Untitled)';
      const id = db.id;
      const url = db.url;
      
      console.log(`${index + 1}. ${title}`);
      console.log(`   ID: ${id}`);
      console.log(`   URL: ${url}`);
      
      // Show some properties
      const props = Object.keys(db.properties || {}).slice(0, 5);
      if (props.length > 0) {
        console.log(`   Properties: ${props.join(', ')}`);
      }
      console.log('');
    });
    
    if (databases.length === 0) {
      console.log('⚠️  No databases found. The Notion integration may need to be granted access to your workspace databases.');
      console.log('\nTo grant access:');
      console.log('1. Open your Notion workspace');
      console.log('2. Go to Settings & Members → Connections');
      console.log('3. Find the Replit integration');
      console.log('4. Grant it access to the pages/databases you want to use');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
