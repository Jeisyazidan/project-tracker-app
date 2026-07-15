const router = require('express').Router();
const db     = require('../db');
const { requireAuth } = require('../middleware/auth');
const { mergePeriods } = require('../utils/bastPeriods');

router.use(requireAuth);

function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 0)); // last day of month
  const toISO = d => d.toISOString().slice(0, 10);
  return { monthStart: toISO(start), monthEnd: toISO(end) };
}

// GET /api/dashboard/me?month=&year= — items assigned to the logged-in user
// (CM/PM activities, BAST submit deadlines, project contract deadlines) for
// a given calendar month. Defaults to the current month.
router.get('/me', async (req, res) => {
  const now = new Date();
  let month = parseInt(req.query.month, 10);
  let year  = parseInt(req.query.year, 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) month = now.getMonth() + 1;
  if (!Number.isInteger(year)  || year < 1970) year = now.getFullYear();
  const { monthStart, monthEnd } = monthRange(year, month);
  const userId = req.user.id;

  try {
    const [cmRes, pmRes, bastProjectsRes, contractRes] = await Promise.all([
      db.query(`
        SELECT c.id, c.title, c.start_date::text, c.start_time::text,
               c.end_date::text, c.end_time::text, c.status,
               p.id AS project_id, p.pid, p.company, p.name AS project_name,
               CASE WHEN c.pic_utama_id = $1 THEN 'utama' ELSE 'support' END AS role
        FROM cm_requests c
        JOIN projects p ON p.id = c.project_id
        WHERE (c.pic_utama_id = $1 OR c.pic_support_id = $1)
          AND c.start_date BETWEEN $2 AND $3
        ORDER BY c.start_date, c.start_time
      `, [userId, monthStart, monthEnd]),
      db.query(`
        SELECT r.id, r.title, r.start_date::text, r.start_time::text,
               r.end_date::text, r.end_time::text, r.status,
               p.id AS project_id, p.pid, p.company, p.name AS project_name,
               CASE WHEN r.pic_utama_id = $1 THEN 'utama' ELSE 'support' END AS role
        FROM pm_requests r
        JOIN projects p ON p.id = r.project_id
        WHERE (r.pic_utama_id = $1 OR r.pic_support_id = $1)
          AND r.start_date BETWEEN $2 AND $3
        ORDER BY r.start_date, r.start_time
      `, [userId, monthStart, monthEnd]),
      // BAST periods aren't fully stored — pull every project the user
      // admins/manages, then derive+merge the schedule in JS below.
      db.query(`
        SELECT p.id, p.pid, p.company, p.name AS project_name,
               p.contract_start::text AS contract_start, p.deadline::text AS deadline,
               p.billing_freq,
               COALESCE(bp.periods, '[]'::json) AS bast_stored_periods
        FROM projects p
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
        WHERE p.project_admin_id = $1 OR p.project_manager_id = $1
      `, [userId]),
      db.query(`
        SELECT id AS project_id, pid, company, name AS project_name, deadline::text AS deadline
        FROM projects
        WHERE (project_admin_id = $1 OR project_manager_id = $1 OR operation_manager_id = $1)
          AND deadline BETWEEN $2 AND $3
      `, [userId, monthStart, monthEnd]),
    ]);

    const bastDeadlines = [];
    for (const project of bastProjectsRes.rows) {
      const periods = mergePeriods(project, project.bast_stored_periods);
      for (const period of periods) {
        if (!period.submit_deadline) continue;
        if (period.submit_deadline < monthStart || period.submit_deadline > monthEnd) continue;
        bastDeadlines.push({
          projectId: project.id,
          pid: project.pid,
          company: project.company,
          projectName: project.project_name,
          label: period.label,
          submitDeadline: period.submit_deadline,
          stepsDone: period.steps.filter(Boolean).length,
          totalSteps: period.steps.length,
        });
      }
    }

    res.json({
      month, year,
      cm: cmRes.rows,
      pm: pmRes.rows,
      bastDeadlines,
      contractDeadlines: contractRes.rows,
    });
  } catch (err) {
    console.error('GET /dashboard/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
