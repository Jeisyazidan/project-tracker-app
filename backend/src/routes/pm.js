const router = require('express').Router();
const db     = require('../db');
const { requireAuth }       = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { sendAssignmentEmail } = require('../services/email');
const { picJoinClauses, picSelectFields, toIdArray, replaceRequestPics } = require('../utils/picSql');

const PIC_TABLE = 'pm_request_pics';

router.use(requireAuth);

// GET /api/pm — all PM requests with project info
router.get('/', requirePermission('view_pm'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*,
             r.start_date::text, r.end_date::text,
             r.start_time::text, r.end_time::text,
             r.resolved_date::text,
             p.pid, p.company, p.name AS project_name,
             ${picSelectFields}
      FROM pm_requests r
      JOIN projects p ON p.id = r.project_id
      ${picJoinClauses(PIC_TABLE, 'r')}
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
    status, resolved_date, pic_utama_ids, pic_support_ids, notes,
  } = req.body;
  if (!project_id || !title || !start_date) {
    return res.status(400).json({ error: 'project_id, title, and start_date are required' });
  }
  const utamaIds   = toIdArray(pic_utama_ids);
  const supportIds = toIdArray(pic_support_ids);
  try {
    const [{ rows: prows }, { rows: insRows }] = await Promise.all([
      db.query('SELECT pid, name, company FROM projects WHERE id=$1', [project_id]),
      db.query(
        `INSERT INTO pm_requests
           (project_id,title,start_date,start_time,end_date,end_time,status,resolved_date,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [project_id, title, start_date, start_time || null, end_date || null, end_time || null,
         status || 'Open', resolved_date || null, notes || null]
      ),
    ]);
    const newId = insRows[0].id;
    await replaceRequestPics(db, PIC_TABLE, newId, utamaIds, supportIds);

    const { rows } = await db.query(`
      SELECT r.*,
             r.start_date::text, r.end_date::text,
             r.start_time::text, r.end_time::text, r.resolved_date::text,
             ${picSelectFields}
      FROM pm_requests r
      ${picJoinClauses(PIC_TABLE, 'r')}
      WHERE r.id = $1
    `, [newId]);
    res.status(201).json(rows[0]);

    const allIds = [...new Set([...utamaIds, ...supportIds])];
    if (allIds.length && prows[0]) {
      const { rows: urows } = await db.query('SELECT id, username, email FROM users WHERE id = ANY($1::int[])', [allIds]);
      const byId = Object.fromEntries(urows.map(u => [u.id, u]));
      sendAssignmentEmail({ type:'pm', isNew:true, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open',
        picUtamaName: utamaIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        picSupportName: supportIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        notes, recipients: allIds.map(id => byId[id]?.email).filter(Boolean) });
    }
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
    status, resolved_date, pic_utama_ids, pic_support_ids, notes,
  } = req.body;
  if (!title || !start_date) {
    return res.status(400).json({ error: 'title and start_date are required' });
  }
  const utamaIds   = toIdArray(pic_utama_ids);
  const supportIds = toIdArray(pic_support_ids);
  try {
    const [{ rows: oldPicRows }, { rows: prows }, { rows: existsRows }] = await Promise.all([
      db.query('SELECT user_id, relation FROM pm_request_pics WHERE request_id=$1', [id]),
      db.query(`SELECT p.pid, p.name, p.company FROM pm_requests r JOIN projects p ON p.id=r.project_id WHERE r.id=$1`, [id]),
      db.query('SELECT id FROM pm_requests WHERE id=$1', [id]),
    ]);
    if (!existsRows[0]) return res.status(404).json({ error: 'PM request not found' });

    await db.query(
      `UPDATE pm_requests SET
         title=$1, start_date=$2, start_time=$3, end_date=$4, end_time=$5,
         status=$6, resolved_date=$7, notes=$8, updated_at=NOW()
       WHERE id=$9`,
      [title, start_date, start_time || null, end_date || null, end_time || null,
       status || 'Open', resolved_date || null, notes || null, id]
    );
    await replaceRequestPics(db, PIC_TABLE, id, utamaIds, supportIds);

    const { rows } = await db.query(`
      SELECT r.*,
             r.start_date::text, r.end_date::text,
             r.start_time::text, r.end_time::text, r.resolved_date::text,
             ${picSelectFields}
      FROM pm_requests r
      ${picJoinClauses(PIC_TABLE, 'r')}
      WHERE r.id = $1
    `, [id]);
    res.json(rows[0]);

    const oldUtamaIds   = oldPicRows.filter(r => r.relation === 'utama').map(r => r.user_id);
    const oldSupportIds = oldPicRows.filter(r => r.relation === 'support').map(r => r.user_id);
    const newlyAssignedIds = [...new Set([
      ...utamaIds.filter(uid => !oldUtamaIds.includes(uid)),
      ...supportIds.filter(uid => !oldSupportIds.includes(uid)),
    ])];
    const allCurrentIds = [...new Set([...utamaIds, ...supportIds])];
    if (newlyAssignedIds.length && prows[0]) {
      const { rows: urows } = await db.query('SELECT id, username, email FROM users WHERE id = ANY($1::int[])', [allCurrentIds]);
      const byId = Object.fromEntries(urows.map(u => [u.id, u]));
      sendAssignmentEmail({ type:'pm', isNew:false, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open',
        picUtamaName: utamaIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        picSupportName: supportIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        notes, recipients: newlyAssignedIds.map(id => byId[id]?.email).filter(Boolean) });
    }
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
