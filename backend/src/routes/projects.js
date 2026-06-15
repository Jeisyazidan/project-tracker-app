const router = require('express').Router();
const db     = require('../db');
const { requireAuth }       = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(requireAuth);

// GET /api/projects — list with CM/PM counts
router.get('/', requirePermission('view_projects'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        p.*,
        p.contract_start::text  AS contract_start,
        p.deadline::text        AS deadline,
        COALESCE(cm.total, 0)   AS cm_total,
        COALESCE(cm.active, 0)  AS cm_active,
        COALESCE(pmr.total, 0)  AS pm_total,
        COALESCE(pmr.active, 0) AS pm_active,
        COALESCE(bp.periods, '[]'::json) AS bast_stored_periods
      FROM projects p
      LEFT JOIN (
        SELECT project_id,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status IN ('Open','In Progress')) AS active
        FROM cm_requests GROUP BY project_id
      ) cm ON cm.project_id = p.id
      LEFT JOIN (
        SELECT project_id,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status IN ('Open','In Progress')) AS active
        FROM pm_requests GROUP BY project_id
      ) pmr ON pmr.project_id = p.id
      LEFT JOIN (
        SELECT project_id,
               json_agg(json_build_object(
                 'id', id, 'label', label,
                 'start_date', start_date::text, 'end_date', end_date::text,
                 'steps', steps, 'submit_deadline', submit_deadline::text,
                 'is_custom', is_custom, 'sort_order', sort_order
               ) ORDER BY sort_order, id) AS periods
        FROM bast_periods GROUP BY project_id
      ) bp ON bp.project_id = p.id
      ORDER BY p.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /projects error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects
router.post('/', requirePermission('add_project'), async (req, res) => {
  const {
    pid, company, name, status, contract_start, deadline,
    billing_freq, project_admin, project_manager, operation_manager,
    handover_status, issues,
  } = req.body;
  if (!pid || !company || !name) {
    return res.status(400).json({ error: 'PID, company, and name are required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO projects
         (pid,company,name,status,contract_start,deadline,billing_freq,
          project_admin,project_manager,operation_manager,handover_status,issues)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *, contract_start::text, deadline::text`,
      [pid, company, name,
       status || 'On Track',
       contract_start || null,
       deadline || null,
       billing_freq || null,
       project_admin || null,
       project_manager || null,
       operation_manager || null,
       handover_status || 'Not Started',
       issues || null]
    );
    res.status(201).json({ ...rows[0], cm_total:0, cm_active:0, pm_total:0, pm_active:0, bast_stored_periods:[] });
  } catch (err) {
    console.error('POST /projects error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', requirePermission('edit_project'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    pid, company, name, status, contract_start, deadline,
    billing_freq, project_admin, project_manager, operation_manager,
    handover_status, issues,
  } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE projects SET
         pid=$1, company=$2, name=$3, status=$4,
         contract_start=$5, deadline=$6, billing_freq=$7,
         project_admin=$8, project_manager=$9, operation_manager=$10,
         handover_status=$11, issues=$12, updated_at=NOW()
       WHERE id=$13
       RETURNING *, contract_start::text, deadline::text`,
      [pid, company, name, status,
       contract_start || null, deadline || null, billing_freq || null,
       project_admin || null, project_manager || null, operation_manager || null,
       handover_status || 'Not Started', issues || null,
       id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /projects/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requirePermission('delete_project'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rowCount } = await db.query('DELETE FROM projects WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /projects/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
