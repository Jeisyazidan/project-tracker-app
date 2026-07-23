const router = require('express').Router();
const db     = require('../db');
const { requireAuth }       = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { sendAssignmentEmail, sendUnassignmentEmail } = require('../services/email');
const { picJoinClauses, picSelectFields, toIdArray, replaceRequestPics } = require('../utils/picSql');
const { nextRequestCode } = require('../utils/requestCode');

const PIC_TABLE = 'cm_request_pics';

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
             ${picSelectFields}
      FROM cm_requests c
      JOIN projects p ON p.id = c.project_id
      ${picJoinClauses(PIC_TABLE, 'c')}
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
    status, resolved_date, pic_utama_ids, pic_support_ids, notes,
  } = req.body;
  if (!project_id || !title || !start_date) {
    return res.status(400).json({ error: 'project_id, title, and start_date are required' });
  }
  const utamaIds   = toIdArray(pic_utama_ids);
  const supportIds = toIdArray(pic_support_ids);
  try {
    const { rows: prows } = await db.query(
      'SELECT pid, name, company, project_manager_id, operation_manager_id FROM projects WHERE id=$1',
      [project_id]
    );
    if (!prows[0]) return res.status(404).json({ error: 'Project not found' });

    const code = await nextRequestCode(db, 'cm_requests', 'CM', project_id, prows[0].pid);
    const { rows: insRows } = await db.query(
      `INSERT INTO cm_requests
         (project_id,code,title,start_date,start_time,end_date,end_time,status,resolved_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [project_id, code, title, start_date, start_time || null, end_date || null, end_time || null,
       status || 'Open', resolved_date || null, notes || null]
    );
    const newId = insRows[0].id;
    await replaceRequestPics(db, PIC_TABLE, newId, utamaIds, supportIds);

    const { rows } = await db.query(`
      SELECT c.*,
             c.start_date::text, c.end_date::text,
             c.start_time::text, c.end_time::text, c.resolved_date::text,
             ${picSelectFields}
      FROM cm_requests c
      ${picJoinClauses(PIC_TABLE, 'c')}
      WHERE c.id = $1
    `, [newId]);
    res.status(201).json(rows[0]);

    const inChargeIds = [prows[0]?.project_manager_id, prows[0]?.operation_manager_id].filter(Boolean);
    const allIds = [...new Set([...utamaIds, ...supportIds, ...inChargeIds])];
    if (allIds.length && prows[0]) {
      const { rows: urows } = await db.query('SELECT id, username, email FROM users WHERE id = ANY($1::int[])', [allIds]);
      const byId = Object.fromEntries(urows.map(u => [u.id, u]));
      sendAssignmentEmail({ type:'cm', isNew:true, code, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open',
        picUtamaName: utamaIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        picSupportName: supportIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        notes, recipients: allIds.map(id => byId[id]?.email).filter(Boolean) });
    }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Code collision, please retry' });
    console.error('POST /cm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/cm/:id
router.put('/:id', requirePermission('manage_cm'), async (req, res) => {
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
      db.query('SELECT user_id, relation FROM cm_request_pics WHERE request_id=$1', [id]),
      db.query(`SELECT c.code, p.pid, p.name, p.company FROM cm_requests c JOIN projects p ON p.id=c.project_id WHERE c.id=$1`, [id]),
      db.query('SELECT id FROM cm_requests WHERE id=$1', [id]),
    ]);
    if (!existsRows[0]) return res.status(404).json({ error: 'CM request not found' });

    await db.query(
      `UPDATE cm_requests SET
         title=$1, start_date=$2, start_time=$3, end_date=$4, end_time=$5,
         status=$6, resolved_date=$7, notes=$8, updated_at=NOW()
       WHERE id=$9`,
      [title, start_date, start_time || null, end_date || null, end_time || null,
       status || 'Open', resolved_date || null, notes || null, id]
    );
    await replaceRequestPics(db, PIC_TABLE, id, utamaIds, supportIds);

    const { rows } = await db.query(`
      SELECT c.*,
             c.start_date::text, c.end_date::text,
             c.start_time::text, c.end_time::text, c.resolved_date::text,
             ${picSelectFields}
      FROM cm_requests c
      ${picJoinClauses(PIC_TABLE, 'c')}
      WHERE c.id = $1
    `, [id]);
    res.json(rows[0]);

    // Notify only newly-assigned PICs (weren't in either relation before)
    const oldUtamaIds   = oldPicRows.filter(r => r.relation === 'utama').map(r => r.user_id);
    const oldSupportIds = oldPicRows.filter(r => r.relation === 'support').map(r => r.user_id);
    const newlyAssignedIds = [...new Set([
      ...utamaIds.filter(uid => !oldUtamaIds.includes(uid)),
      ...supportIds.filter(uid => !oldSupportIds.includes(uid)),
    ])];
    const allCurrentIds = [...new Set([...utamaIds, ...supportIds])];
    const removedIds = [...new Set([...oldUtamaIds, ...oldSupportIds])].filter(uid => !allCurrentIds.includes(uid));
    if (newlyAssignedIds.length && prows[0]) {
      const { rows: urows } = await db.query('SELECT id, username, email FROM users WHERE id = ANY($1::int[])', [allCurrentIds]);
      const byId = Object.fromEntries(urows.map(u => [u.id, u]));
      sendAssignmentEmail({ type:'cm', isNew:false, code:prows[0].code, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open',
        picUtamaName: utamaIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        picSupportName: supportIds.map(id => byId[id]?.username).filter(Boolean).join(', ') || null,
        notes, recipients: newlyAssignedIds.map(id => byId[id]?.email).filter(Boolean) });
    }
    if (removedIds.length && prows[0]) {
      const { rows: rrows } = await db.query('SELECT id, email FROM users WHERE id = ANY($1::int[])', [removedIds]);
      sendUnassignmentEmail({ type:'cm', code:prows[0].code, title, project:prows[0],
        startDate:start_date, startTime:start_time, endDate:end_date, endTime:end_time,
        status: status || 'Open',
        recipients: rrows.map(u => u.email).filter(Boolean) });
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
