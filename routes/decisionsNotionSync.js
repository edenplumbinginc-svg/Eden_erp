// routes/decisionsNotionSync.js
// Admin endpoint for syncing decision policies to Notion (governance documentation)

const { Router } = require('express');
const { requirePerm } = require('../middleware/permissions');
const { syncDecisionsToNotion } = require('../services/notionDecisionsSync');

const router = Router();

router.post('/sync-notion', requirePerm('admin:manage'), async (req, res) => {
  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DECISIONS_DB_ID) {
      return res.status(400).json({
        ok: false,
        error: 'Notion integration not configured. Please set NOTION_TOKEN and NOTION_DECISIONS_DB_ID secrets.'
      });
    }

    const result = await syncDecisionsToNotion();
    
    const failed = result.results.filter(r => r.action === 'failed');
    if (failed.length > 0) {
      return res.status(207).json({
        ok: true,
        warning: `${failed.length} of ${result.count} policies failed to sync`,
        ...result
      });
    }

    res.json({
      ok: true,
      message: `Successfully synced ${result.count} policies to Notion`,
      ...result
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

module.exports = router;
