const express = require('express');
const router = express.Router();
const { enqueue } = require('../services/queue');
const { authenticate } = require('../middleware/auth');
const { recomputeOverdue } = require('../services/recomputeOverdue');
const { recomputeIdle } = require('../services/recomputeIdle');

router.post('/run-daily', authenticate, async (req, res) => {
  try {
    await enqueue("daily-summary", { dateIso: new Date().toISOString().slice(0,10) });
    res.json({ ok: true, message: 'Daily summary job enqueued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/overdue/recompute', authenticate, async (req, res) => {
  try {
    const actor = req.user?.email || 'admin';
    const result = await recomputeOverdue(actor);
    res.json({ 
      ok: true, 
      set_true: result.setTrue, 
      set_false: result.setFalse,
      message: `Overdue flags recomputed: ${result.setTrue} set to true, ${result.setFalse} set to false`
    });
  } catch (err) {
    console.error('[POST /api/ops/overdue/recompute] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
