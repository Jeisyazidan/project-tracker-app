const router = require('express').Router();
const db     = require('../db');
const { requireAuth }       = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(requireAuth);

// GET /api/bast/:projectId — all stored periods for a project
router.get('/:projectId', requirePermission('view_bast'), async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  try {
    const { rows } = await db.query(
      `SELECT *, start_date::text, end_date::text, submit_deadline::text
       FROM bast_periods WHERE project_id = $1
       ORDER BY is_custom, sort_order, id`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /bast/:projectId error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/bast/:projectId/period — upsert a period's steps / submit_deadline by label
// Body: { label, start_date, end_date, steps, submit_deadline }
router.put('/:projectId/period', requirePermission('edit_bast'), async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const { label, start_date, end_date, steps, submit_deadline } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO bast_periods (project_id, label, start_date, end_date, steps, submit_deadline, is_custom)
       VALUES ($1,$2,$3,$4,$5,$6,false)
       ON CONFLICT (project_id, label) DO UPDATE SET
         start_date = EXCLUDED.start_date,
         end_date   = EXCLUDED.end_date,
         steps      = EXCLUDED.steps,
         submit_deadline = EXCLUDED.submit_deadline
       RETURNING *, start_date::text, end_date::text, submit_deadline::text`,
      [projectId, label,
       start_date || null, end_date || null,
       steps || [false,false,false,false,false,false,false,false],
       submit_deadline || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /bast/:projectId/period error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/bast/:projectId/termins — add a custom termin
router.post('/:projectId/termins', requirePermission('edit_bast'), async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const { label, start_date, end_date, sort_order } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO bast_periods (project_id, label, start_date, end_date, is_custom, sort_order)
       VALUES ($1,$2,$3,$4,true,$5)
       RETURNING *, start_date::text, end_date::text, submit_deadline::text`,
      [projectId, label, start_date || null, end_date || null, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A period with that label already exists for this project' });
    }
    console.error('POST /bast/:projectId/termins error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/bast/:projectId/termins/:terminId — update custom termin
router.put('/:projectId/termins/:terminId', requirePermission('edit_bast'), async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const terminId  = parseInt(req.params.terminId,  10);
  const { label, start_date, end_date } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE bast_periods
       SET label=$1, start_date=$2, end_date=$3
       WHERE id=$4 AND project_id=$5 AND is_custom=true
       RETURNING *, start_date::text, end_date::text, submit_deadline::text`,
      [label, start_date || null, end_date || null, terminId, projectId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Termin not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /bast/:projectId/termins/:terminId error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/bast/:projectId/termins/:terminId
router.delete('/:projectId/termins/:terminId', requirePermission('edit_bast'), async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const terminId  = parseInt(req.params.terminId,  10);
  try {
    const { rowCount } = await db.query(
      'DELETE FROM bast_periods WHERE id=$1 AND project_id=$2 AND is_custom=true',
      [terminId, projectId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Termin not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /bast/:projectId/termins/:terminId error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
