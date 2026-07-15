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
        pa.username  AS project_admin,
        pm2.username AS project_manager,
        om.username  AS operation_manager,
        COALESCE(cm.total, 0)   AS cm_total,
        COALESCE(cm.active, 0)  AS cm_active,
        COALESCE(pmr.total, 0)  AS pm_total,
        COALESCE(pmr.active, 0) AS pm_active,
        COALESCE(bp.periods, '[]'::json) AS bast_stored_periods
      FROM projects p
      LEFT JOIN users pa  ON pa.id  = p.project_admin_id
      LEFT JOIN users pm2 ON pm2.id = p.project_manager_id
      LEFT JOIN users om  ON om.id  = p.operation_manager_id
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
    billing_freq, project_admin_id, project_manager_id, operation_manager_id,
    handover_status, issues,
  } = req.body;
  if (!pid || !company || !name) {
    return res.status(400).json({ error: 'PID, company, and name are required' });
  }
  const projectAdminId     = project_admin_id     ? parseInt(project_admin_id, 10)     : null;
  const projectManagerId   = project_manager_id   ? parseInt(project_manager_id, 10)   : null;
  const operationManagerId = operation_manager_id ? parseInt(operation_manager_id, 10) : null;
  try {
    const { rows } = await db.query(
      `WITH ins AS (
         INSERT INTO projects
           (pid,company,name,status,contract_start,deadline,billing_freq,
            project_admin_id,project_manager_id,operation_manager_id,handover_status,issues)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *
       )
       SELECT ins.*, ins.contract_start::text, ins.deadline::text,
              pa.username AS project_admin, pm2.username AS project_manager, om.username AS operation_manager
       FROM ins
       LEFT JOIN users pa  ON pa.id  = ins.project_admin_id
       LEFT JOIN users pm2 ON pm2.id = ins.project_manager_id
       LEFT JOIN users om  ON om.id  = ins.operation_manager_id`,
      [pid, company, name,
       status || 'On Track',
       contract_start || null,
       deadline || null,
       billing_freq || null,
       projectAdminId,
       projectManagerId,
       operationManagerId,
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
    billing_freq, project_admin_id, project_manager_id, operation_manager_id,
    handover_status, issues,
  } = req.body;
  const projectAdminId     = project_admin_id     ? parseInt(project_admin_id, 10)     : null;
  const projectManagerId   = project_manager_id   ? parseInt(project_manager_id, 10)   : null;
  const operationManagerId = operation_manager_id ? parseInt(operation_manager_id, 10) : null;
  try {
    const { rows } = await db.query(
      `WITH upd AS (
         UPDATE projects SET
           pid=$1, company=$2, name=$3, status=$4,
           contract_start=$5, deadline=$6, billing_freq=$7,
           project_admin_id=$8, project_manager_id=$9, operation_manager_id=$10,
           handover_status=$11, issues=$12, updated_at=NOW()
         WHERE id=$13
         RETURNING *
       )
       SELECT upd.*, upd.contract_start::text, upd.deadline::text,
              pa.username AS project_admin, pm2.username AS project_manager, om.username AS operation_manager
       FROM upd
       LEFT JOIN users pa  ON pa.id  = upd.project_admin_id
       LEFT JOIN users pm2 ON pm2.id = upd.project_manager_id
       LEFT JOIN users om  ON om.id  = upd.operation_manager_id`,
      [pid, company, name, status,
       contract_start || null, deadline || null, billing_freq || null,
       projectAdminId, projectManagerId, operationManagerId,
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
