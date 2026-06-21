const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const db      = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/email');

// GET /api/users/list — minimal list for dropdowns; any authenticated user
router.get('/list', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, role FROM users ORDER BY username'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /users/list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.use(requireAdmin);

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const validRoles = ['admin','pm','om','system_engineer','dba','technical_writer'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, username, email, role, created_at`,
      [username.trim(), email.trim().toLowerCase(), hash, role || 'pm']
    );
    // Fire-and-forget welcome email
    sendWelcomeEmail(rows[0]).catch(e => console.warn('Welcome email failed:', e.message));
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail?.includes('email') ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already taken` });
    }
    console.error('POST /users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /users/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id/password — change own password or admin changes any
router.put('/:id/password', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await db.query(
      'UPDATE users SET password_hash=$1 WHERE id=$2', [hash, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /users/:id/password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
