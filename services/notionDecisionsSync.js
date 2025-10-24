// services/notionDecisionsSync.js
// One-way sync: ERP decision_policies → Notion database (read-only governance mirror)
// Provides searchable, auditable policy documentation without requiring app access

const { pool } = require('./database');

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function upsertPolicyToNotion(policy) {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DECISIONS_DB_ID;

  if (!token || !dbId) {
    throw new Error('Missing NOTION_TOKEN or NOTION_DECISIONS_DB_ID environment variables');
  }

  const externalId = policy.id;

  const pageSearch = await fetch(
    `${NOTION_API}/databases/${dbId}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'External ID',
          rich_text: { equals: externalId }
        },
        page_size: 1,
      }),
    }
  );

  const searchResults = await pageSearch.json();

  const properties = {
    'Name': {
      title: [{ text: { content: policy.description || policy.slug } }]
    },
    'Slug': {
      rich_text: [{ text: { content: policy.slug } }]
    },
    'Enabled': {
      checkbox: !!policy.enabled
    },
    'DRY_RUN': {
      checkbox: !!policy.dry_run
    },
    'Last Execution': policy.last_execution_at
      ? { date: { start: policy.last_execution_at } }
      : { date: null },
    'External ID': {
      rich_text: [{ text: { content: externalId } }]
    },
  };

  if (searchResults?.results?.[0]?.id) {
    const pageId = searchResults.results[0].id;
    const updateResponse = await fetch(
      `${NOTION_API}/pages/${pageId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Notion update failed: ${errorText}`);
    }

    return { action: 'updated', pageId };
  } else {
    const createResponse = await fetch(
      `${NOTION_API}/pages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Notion create failed: ${errorText}`);
    }

    const created = await createResponse.json();
    return { action: 'created', pageId: created.id };
  }
}

async function syncDecisionsToNotion() {
  const policiesResult = await pool.query(`
    SELECT 
      id,
      slug,
      description,
      enabled,
      dry_run,
      created_at,
      updated_at
    FROM decision_policies
    ORDER BY slug
  `);

  const policies = policiesResult.rows;

  const lastExecutionsResult = await pool.query(`
    SELECT DISTINCT ON (policy_slug)
      policy_slug,
      created_at
    FROM decision_executions
    WHERE success = true
    ORDER BY policy_slug, created_at DESC
  `);

  const lastExecMap = new Map();
  for (const row of lastExecutionsResult.rows) {
    lastExecMap.set(row.policy_slug, row.created_at.toISOString());
  }

  const syncResults = [];

  for (const policy of policies) {
    try {
      const result = await upsertPolicyToNotion({
        ...policy,
        last_execution_at: lastExecMap.get(policy.slug) || null,
      });
      syncResults.push({ slug: policy.slug, ...result });
    } catch (err) {
      syncResults.push({
        slug: policy.slug,
        action: 'failed',
        error: err.message
      });
    }
  }

  return {
    count: policies.length,
    results: syncResults,
  };
}

module.exports = { syncDecisionsToNotion };
