const express = require('express');
const router = express.Router();
const { enqueue } = require('../services/queue');
const { authenticate } = require('../middleware/auth');

router.post('/run-daily', authenticate, async (req, res) => {
  try {
    await enqueue("daily-summary", { dateIso: new Date().toISOString().slice(0,10) });
    res.json({ ok: true, message: 'Daily summary job enqueued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
