const router = require('express').Router();
const db     = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { runAllReminders } = require('../services/reminder');

const REMINDER_TYPES = ['contract_end', 'bast_submit', 'cm_activity', 'pm_activity'];

// GET /api/reminders/settings — global per-type on/off flags, any authenticated user
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT reminder_type, enabled FROM reminder_settings');
    const map = {};
    rows.forEach(r => { map[r.reminder_type] = r.enabled; });
    REMINDER_TYPES.forEach(t => { if (!(t in map)) map[t] = true; });
    res.json(map);
  } catch (err) {
    console.error('GET /reminders/settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/reminders/settings — admin only
router.put('/settings', requireAdmin, async (req, res) => {
  const settings = req.body; // { contract_end: bool, bast_submit: bool, ... }
  if (typeof settings !== 'object' || Array.isArray(settings)) {
    return res.status(400).json({ error: 'Body must be an object keyed by reminder type' });
  }
  try {
    const client = await require('../db').pool.connect();
    try {
      await client.query('BEGIN');
      for (const [type, enabled] of Object.entries(settings)) {
        if (!REMINDER_TYPES.includes(type)) continue;
        await client.query(
          `INSERT INTO reminder_settings (reminder_type, enabled, updated_at)
           VALUES ($1,$2,NOW())
           ON CONFLICT (reminder_type) DO UPDATE SET enabled=EXCLUDED.enabled, updated_at=NOW()`,
          [type, !!enabled]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /reminders/settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reminders/logs — recent sent-reminder history, any authenticated user
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT rl.id, rl.project_id, rl.reminder_type, rl.reference_id,
             rl.send_count, rl.last_sent_at, rl.recipients,
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
