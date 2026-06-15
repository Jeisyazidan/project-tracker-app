const router = require('express').Router();
const db     = require('../db');
const { requireAuth }       = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(requireAuth);

// GET /api/pm — all PM requests with project info
router.get('/', requirePermission('view_pm'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*,
             r.start_date::text, r.end_date::text,
             r.start_time::text, r.end_time::text,
             r.resolved_date::text,
             p.pid, p.company, p.name AS project_name
      FROM pm_requests r
      JOIN projects p ON p.id = r.project_id
      ORDER BY
        CASE r.status WHEN 'Open' THEN 0 WHEN 'In Progress' THEN 1 ELSE 2 END,
        r.start_date DESC NULLS LAST, r.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /pm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/pm
router.post('/', requirePermission('manage_pm'), async (req, res) => {
  const {
    project_id, title, start_date, start_time, end_date, end_time,
    status, resolved_date, pic_utama, pic_support, notes,
  } = req.body;
  if (!project_id || !title || !start_date) {
    return res.status(400).json({ error: 'project_id, title, and start_date are required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO pm_requests
         (project_id,title,start_date,start_time,end_date,end_time,
          status,resolved_date,pic_utama,pic_support,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *,
         start_date::text, end_date::text,
         start_time::text, end_time::text, resolved_date::text`,
      [project_id, title,
       start_date, start_time || null, end_date || null, end_time || null,
       status || 'Open', resolved_date || null,
       pic_utama || null, pic_support || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /pm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/pm/:id
router.put('/:id', requirePermission('manage_pm'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    title, start_date, start_time, end_date, end_time,
    status, resolved_date, pic_utama, pic_support, notes,
  } = req.body;
  if (!title || !start_date) {
    return res.status(400).json({ error: 'title and start_date are required' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE pm_requests SET
         title=$1, start_date=$2, start_time=$3, end_date=$4, end_time=$5,
         status=$6, resolved_date=$7, pic_utama=$8, pic_support=$9, notes=$10,
         updated_at=NOW()
       WHERE id=$11
       RETURNING *,
         start_date::text, end_date::text,
         start_time::text, end_time::text, resolved_date::text`,
      [title, start_date, start_time || null, end_date || null, end_time || null,
       status || 'Open', resolved_date || null,
       pic_utama || null, pic_support || null, notes || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'PM request not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /pm/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/pm/:id
router.delete('/:id', requirePermission('manage_pm'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rowCount } = await db.query('DELETE FROM pm_requests WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'PM request not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /pm/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
