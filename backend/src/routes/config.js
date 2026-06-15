const router = require('express').Router();
const db     = require('../db');
const { requireAuth }  = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { DEFAULT_ROLE_PERMISSIONS } = require('../middleware/rbac');

router.use(requireAuth);

// GET /api/config/permissions — readable by all authenticated users (for RBAC checks on frontend)
router.get('/permissions', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT role, permissions FROM role_permissions');
    const map = {};
    rows.forEach(r => { map[r.role] = r.permissions; });
    // Fill in any missing roles with defaults
    Object.keys(DEFAULT_ROLE_PERMISSIONS).forEach(role => {
      if (!map[role]) map[role] = DEFAULT_ROLE_PERMISSIONS[role];
    });
    res.json(map);
  } catch (err) {
    console.error('GET /config/permissions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/config/permissions — admin only
router.put('/permissions', requireAdmin, async (req, res) => {
  const perms = req.body; // { pm: {...}, om: {...}, ... }
  if (typeof perms !== 'object' || Array.isArray(perms)) {
    return res.status(400).json({ error: 'Body must be an object keyed by role' });
  }
  try {
    const client = await require('../db').pool.connect();
    try {
      await client.query('BEGIN');
      for (const [role, permissions] of Object.entries(perms)) {
        await client.query(
          `INSERT INTO role_permissions (role, permissions, updated_at)
           VALUES ($1,$2,NOW())
           ON CONFLICT (role) DO UPDATE SET permissions=EXCLUDED.permissions, updated_at=NOW()`,
          [role, JSON.stringify(permissions)]
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
    console.error('PUT /config/permissions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
