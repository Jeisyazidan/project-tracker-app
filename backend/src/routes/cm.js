const router = require('express').Router();
const db     = require('../db');
const { requireAuth }       = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { sendAssignmentEmail } = require('../services/email');

router.use(requireAuth);

// GET /api/cm — all CM requests with project info
router.get('/', requirePermission('view_cm'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*,
             c.start_date::text, c.end_date::text,
             c.start_time::text, c.end_time::text,
             c.resolved_date::text,
             p.pid, p.company, p.name AS project_name
      FROM cm_requests c
      JOIN projects p ON p.id = c.project_id
      ORDER BY
        CASE c.status WHEN 'Open' THEN 0 WHEN 'In Progress' THEN 1 ELSE 2 END,
        c.start_date DESC NULLS LAST, c.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /cm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/cm
router.post('/', requirePermission('manage_cm'), async (req, res) => {
  const {
    project_id, title, start_date, start_time, end_date, end_time,
    status, resolved_date, pic_utama, pic_support, notes,
  } = req.body;
  if (!project_id || !title || !start_date) {
    return res.status(400).json({ error: 'project_id, title, and start_date are required' });
  }
  try {
    const [{ rows }, { rows: prows }] = await Promise.all([
      db.query(
        `INSERT INTO cm_requests
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
      ),
      db.query('SELECT pid, name, company FROM projects WHERE id=$1', [project_id]),
    ]);
    res.status(201).json(rows[0]);
    const pics = [pic_utama, pic_support].filter(Boolean);
    if (pics.length && prows[0]) {
      sendAssignmentEmail({ type:'cm', isNew:true, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open', picUtama: pic_utama, picSupport: pic_support, notes, pics });
    }
  } catch (err) {
    console.error('POST /cm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/cm/:id
router.put('/:id', requirePermission('manage_cm'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    title, start_date, start_time, end_date, end_time,
    status, resolved_date, pic_utama, pic_support, notes,
  } = req.body;
  if (!title || !start_date) {
    return res.status(400).json({ error: 'title and start_date are required' });
  }
  try {
    const [{ rows: oldRows }, { rows: prows }] = await Promise.all([
      db.query('SELECT pic_utama, pic_support, project_id FROM cm_requests WHERE id=$1', [id]),
      db.query(`SELECT p.pid, p.name, p.company FROM cm_requests c JOIN projects p ON p.id=c.project_id WHERE c.id=$1`, [id]),
    ]);
    if (!oldRows[0]) return res.status(404).json({ error: 'CM request not found' });

    const { rows } = await db.query(
      `UPDATE cm_requests SET
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
    res.json(rows[0]);

    // Notify only newly-assigned PICs (username changed)
    const old = oldRows[0];
    const newlyAssigned = [
      pic_utama  !== old.pic_utama  ? pic_utama  : null,
      pic_support !== old.pic_support ? pic_support : null,
    ].filter(Boolean);
    if (newlyAssigned.length && prows[0]) {
      sendAssignmentEmail({ type:'cm', isNew:false, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open', picUtama: pic_utama, picSupport: pic_support, notes, pics:newlyAssigned });
    }
  } catch (err) {
    console.error('PUT /cm/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/cm/:id
router.delete('/:id', requirePermission('manage_cm'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rowCount } = await db.query('DELETE FROM cm_requests WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'CM request not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /cm/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
