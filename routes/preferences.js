const express = require('express');
const router = express.Router();
const { getUserPreferences, updateUserPreferences } = require('../services/userPreferences');

router.get('/me/preferences', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const prefs = await getUserPreferences(req.user.id);
    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error('[Preferences] GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/me/preferences', express.json(), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { default_project_id, tasks_group_by } = req.body;
    const prefs = await updateUserPreferences(
      req.user.id,
      { default_project_id, tasks_group_by },
      req.user?.email || 'user'
    );
    
    res.json({ ok: true, data: prefs });
  } catch (error) {
    console.error('[Preferences] PUT error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
