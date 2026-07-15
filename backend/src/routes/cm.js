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
             p.pid, p.company, p.name AS project_name,
             pu.username AS pic_utama, ps.username AS pic_support
      FROM cm_requests c
      JOIN projects p ON p.id = c.project_id
      LEFT JOIN users pu ON pu.id = c.pic_utama_id
      LEFT JOIN users ps ON ps.id = c.pic_support_id
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
    status, resolved_date, pic_utama_id, pic_support_id, notes,
  } = req.body;
  if (!project_id || !title || !start_date) {
    return res.status(400).json({ error: 'project_id, title, and start_date are required' });
  }
  const picUtamaId   = pic_utama_id   ? parseInt(pic_utama_id, 10)   : null;
  const picSupportId = pic_support_id ? parseInt(pic_support_id, 10) : null;
  try {
    const [{ rows }, { rows: prows }] = await Promise.all([
      db.query(
        `WITH ins AS (
           INSERT INTO cm_requests
             (project_id,title,start_date,start_time,end_date,end_time,
              status,resolved_date,pic_utama_id,pic_support_id,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING *
         )
         SELECT ins.*,
                ins.start_date::text, ins.end_date::text,
                ins.start_time::text, ins.end_time::text, ins.resolved_date::text,
                pu.username AS pic_utama, ps.username AS pic_support
         FROM ins
         LEFT JOIN users pu ON pu.id = ins.pic_utama_id
         LEFT JOIN users ps ON ps.id = ins.pic_support_id`,
        [project_id, title,
         start_date, start_time || null, end_date || null, end_time || null,
         status || 'Open', resolved_date || null,
         picUtamaId, picSupportId, notes || null]
      ),
      db.query('SELECT pid, name, company FROM projects WHERE id=$1', [project_id]),
    ]);
    res.status(201).json(rows[0]);
    const recipientIds = [...new Set([picUtamaId, picSupportId].filter(Boolean))];
    if (recipientIds.length && prows[0]) {
      const { rows: urows } = await db.query('SELECT id, username, email FROM users WHERE id = ANY($1::int[])', [recipientIds]);
      const byId = Object.fromEntries(urows.map(u => [u.id, u]));
      sendAssignmentEmail({ type:'cm', isNew:true, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open',
        picUtamaName: byId[picUtamaId]?.username || null,
        picSupportName: byId[picSupportId]?.username || null,
        notes, recipients: urows.map(u => u.email).filter(Boolean) });
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
    status, resolved_date, pic_utama_id, pic_support_id, notes,
  } = req.body;
  if (!title || !start_date) {
    return res.status(400).json({ error: 'title and start_date are required' });
  }
  const picUtamaId   = pic_utama_id   ? parseInt(pic_utama_id, 10)   : null;
  const picSupportId = pic_support_id ? parseInt(pic_support_id, 10) : null;
  try {
    const [{ rows: oldRows }, { rows: prows }] = await Promise.all([
      db.query('SELECT pic_utama_id, pic_support_id, project_id FROM cm_requests WHERE id=$1', [id]),
      db.query(`SELECT p.pid, p.name, p.company FROM cm_requests c JOIN projects p ON p.id=c.project_id WHERE c.id=$1`, [id]),
    ]);
    if (!oldRows[0]) return res.status(404).json({ error: 'CM request not found' });

    const { rows } = await db.query(
      `WITH upd AS (
         UPDATE cm_requests SET
           title=$1, start_date=$2, start_time=$3, end_date=$4, end_time=$5,
           status=$6, resolved_date=$7, pic_utama_id=$8, pic_support_id=$9, notes=$10,
           updated_at=NOW()
         WHERE id=$11
         RETURNING *
       )
       SELECT upd.*,
              upd.start_date::text, upd.end_date::text,
              upd.start_time::text, upd.end_time::text, upd.resolved_date::text,
              pu.username AS pic_utama, ps.username AS pic_support
       FROM upd
       LEFT JOIN users pu ON pu.id = upd.pic_utama_id
       LEFT JOIN users ps ON ps.id = upd.pic_support_id`,
      [title, start_date, start_time || null, end_date || null, end_time || null,
       status || 'Open', resolved_date || null,
       picUtamaId, picSupportId, notes || null, id]
    );
    res.json(rows[0]);

    // Notify only newly-assigned PICs (id changed)
    const old = oldRows[0];
    const newlyAssignedIds = [...new Set([
      picUtamaId   !== old.pic_utama_id   ? picUtamaId   : null,
      picSupportId !== old.pic_support_id ? picSupportId : null,
    ].filter(Boolean))];
    if (newlyAssignedIds.length && prows[0]) {
      const { rows: urows } = await db.query('SELECT id, username, email FROM users WHERE id = ANY($1::int[])', [newlyAssignedIds]);
      const byId = Object.fromEntries(urows.map(u => [u.id, u]));
      sendAssignmentEmail({ type:'cm', isNew:false, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open',
        picUtamaName: byId[picUtamaId]?.username || null,
        picSupportName: byId[picSupportId]?.username || null,
        notes, recipients: urows.map(u => u.email).filter(Boolean) });
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
