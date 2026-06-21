const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../middleware/auth');
const { runAllReminders } = require('../services/reminder');

// GET /api/reminders/logs — recent sent-reminder history, any authenticated user
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT rl.id, rl.project_id, rl.reminder_type, rl.reference_id,
             rl.send_count, rl.last_sent_at,
             p.pid, p.name AS project_name, p.company
      FROM reminder_logs rl
      JOIN projects p ON p.id = rl.project_id
      ORDER BY rl.last_sent_at DESC NULLS LAST
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /reminders/logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reminders/run — manually trigger all reminder checks (admin only)
router.post('/run', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    runAllReminders().catch(err => console.error('[reminder] manual run error:', err));
    res.json({ ok: true, message: 'Reminder checks triggered' });
  } catch (err) {
    console.error('POST /reminders/run error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
