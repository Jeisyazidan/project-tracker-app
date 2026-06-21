const cron    = require('node-cron');
const db      = require('../db');
const { sendMail, lookupEmail: _lookupEmail } = require('./email');

const BASE_URL = () => process.env.APP_BASE_URL || 'http://localhost:5173';

// ─── helpers ────────────────────────────────────────────────────────────────

async function lookupEmail(username) {
  if (!username) return null;
  const email = await _lookupEmail(username);
  if (!email) console.log(`[reminder] no user found for username: "${username}"`);
  return email;
}

async function getLog(projectId, reminderType, referenceId) {
  const { rows } = await db.query(
    `SELECT send_count, last_sent_at FROM reminder_logs
     WHERE project_id=$1 AND reminder_type=$2 AND reference_id=$3`,
    [projectId, reminderType, referenceId]
  );
  return rows[0] || null;
}

async function markSent(projectId, reminderType, referenceId) {
  await db.query(
    `INSERT INTO reminder_logs (project_id, reminder_type, reference_id, send_count, last_sent_at)
     VALUES ($1,$2,$3,1,NOW())
     ON CONFLICT ON CONSTRAINT reminder_logs_unique DO UPDATE SET
       send_count   = reminder_logs.send_count + 1,
       last_sent_at = NOW()`,
    [projectId, reminderType, referenceId]
  );
}

// Sends one email per unique recipient; returns true if at least one succeeded
async function dispatch(recipients, subject, html, text) {
  let anyOk = false;
  for (const email of [...new Set(recipients)]) {
    try {
      await sendMail({ to: email, subject, html, text });
      console.log(`[reminder] sent "${subject}" → ${email}`);
      anyOk = true;
    } catch (err) {
      console.error(`[reminder] failed to send to ${email}:`, err.message);
    }
  }
  return anyOk;
}

function calendarDate(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayDate() {
  return calendarDate(Date.now());
}

// ─── contract end ────────────────────────────────────────────────────────────

async function checkContractEnd() {
  // Use <= 60 (not = 60) so a server restart never permanently misses the window.
  // reminder_logs dedup (send_count >= 1) ensures each project is emailed once.
  const { rows } = await db.query(`
    SELECT id, pid, name, company, deadline::text,
           project_admin, project_manager, operation_manager,
           (deadline - CURRENT_DATE) AS days_remaining
    FROM projects
    WHERE deadline IS NOT NULL
      AND deadline - CURRENT_DATE BETWEEN 0 AND 60
  `);

  for (const p of rows) {
    const log = await getLog(p.id, 'contract_end', 'contract');
    if (log && log.send_count >= 1) continue;

    const emails = (await Promise.all([
      lookupEmail(p.project_admin),
      lookupEmail(p.project_manager),
      lookupEmail(p.operation_manager),
    ])).filter(Boolean);

    if (!emails.length) {
      console.log(`[reminder] no recipients for contract_end project ${p.id}`);
      continue;
    }

    const days = parseInt(p.days_remaining, 10);
    const subject = `[Contract End Reminder] ${p.name} — ${days} day(s) remaining`;
    const html = `
<h2 style="color:#b45309">Contract End Reminder</h2>
<p>The contract for the following project will expire in <strong>${days} day(s)</strong>.</p>
<table cellpadding="6" style="border-collapse:collapse">
  <tr><td><strong>Project</strong></td><td>${p.name}</td></tr>
  <tr><td><strong>PID</strong></td><td>${p.pid}</td></tr>
  <tr><td><strong>Company</strong></td><td>${p.company}</td></tr>
  <tr><td><strong>Contract End</strong></td><td>${p.deadline}</td></tr>
  <tr><td><strong>Days Remaining</strong></td><td>${days} day(s)</td></tr>
</table>
<p><a href="${BASE_URL()}">Open Project Tracker</a></p>`;
    const text =
      `Contract End Reminder\n\nProject: ${p.name} (${p.pid})\nCompany: ${p.company}\n` +
      `Contract End: ${p.deadline}\nDays Remaining: ${days} day(s)\n\n${BASE_URL()}`;

    const ok = await dispatch(emails, subject, html, text);
    if (ok) await markSent(p.id, 'contract_end', 'contract');
  }
}

// ─── BAST submit deadline ────────────────────────────────────────────────────

async function checkBastSubmit() {
  const { rows } = await db.query(`
    SELECT
      bp.project_id, bp.label, bp.submit_deadline::text, bp.steps,
      p.pid, p.name, p.company, p.project_admin, p.project_manager,
      (bp.submit_deadline - CURRENT_DATE) AS days_remaining
    FROM bast_periods bp
    JOIN projects p ON p.id = bp.project_id
    WHERE bp.submit_deadline IS NOT NULL
      AND false = ANY(bp.steps)
      AND (bp.submit_deadline - CURRENT_DATE) <= 30
  `);

  for (const period of rows) {
    const days = parseInt(period.days_remaining, 10);

    let urgency;
    if (days < 0)      urgency = 'overdue';
    else if (days <= 7) urgency = '7d';
    else                urgency = '30d';

    const referenceId = `${period.label}:${urgency}`;
    const log = await getLog(period.project_id, 'bast_submit', referenceId);
    if (log && log.send_count >= 1) continue;

    const emails = (await Promise.all([
      lookupEmail(period.project_admin),
      lookupEmail(period.project_manager),
    ])).filter(Boolean);

    if (!emails.length) {
      console.log(`[reminder] no recipients for bast_submit project ${period.project_id} period "${period.label}"`);
      continue;
    }

    const statusText = days < 0
      ? `${Math.abs(days)} days overdue`
      : `${days} day(s) remaining`;

    const subject = `[BAST Submit Reminder] ${period.name} — ${period.label} (${statusText})`;
    const html = `
<h2 style="color:#b45309">BAST Submit Deadline Reminder</h2>
<p>A BAST submit deadline requires your attention.</p>
<table cellpadding="6" style="border-collapse:collapse">
  <tr><td><strong>Project</strong></td><td>${period.name}</td></tr>
  <tr><td><strong>PID</strong></td><td>${period.pid}</td></tr>
  <tr><td><strong>Company</strong></td><td>${period.company}</td></tr>
  <tr><td><strong>Billing Period</strong></td><td>${period.label}</td></tr>
  <tr><td><strong>Submit Deadline</strong></td><td>${period.submit_deadline}</td></tr>
  <tr><td><strong>Status</strong></td><td><strong style="color:${days < 0 ? '#dc2626' : '#b45309'}">${statusText}</strong></td></tr>
</table>
<p><a href="${BASE_URL()}">Open Project Tracker</a></p>`;
    const text =
      `BAST Submit Deadline Reminder\n\nProject: ${period.name} (${period.pid})\n` +
      `Company: ${period.company}\nBilling Period: ${period.label}\n` +
      `Submit Deadline: ${period.submit_deadline}\nStatus: ${statusText}\n\n${BASE_URL()}`;

    const ok = await dispatch(emails, subject, html, text);
    if (ok) await markSent(period.project_id, 'bast_submit', referenceId);
  }
}

// ─── CM / PM activity ────────────────────────────────────────────────────────

async function checkActivityReminders(type) {
  const table        = type === 'cm' ? 'cm_requests' : 'pm_requests';
  const reminderType = type === 'cm' ? 'cm_activity' : 'pm_activity';
  const typeLabel    = type === 'cm' ? 'CM Activity' : 'PM Activity';

  const { rows } = await db.query(`
    SELECT
      r.id, r.project_id, r.title, r.start_date::text,
      r.pic_utama, r.pic_support,
      p.pid, p.name, p.company,
      (r.start_date - CURRENT_DATE) AS days_until
    FROM ${table} r
    JOIN projects p ON p.id = r.project_id
    WHERE r.status IN ('Open','In Progress')
      AND r.start_date IS NOT NULL
      AND (r.start_date - CURRENT_DATE) BETWEEN 1 AND 3
  `);

  for (const req of rows) {
    const referenceId = String(req.id);
    const log = await getLog(req.project_id, reminderType, referenceId);

    if (log && log.send_count >= 3) continue;

    // Guard: don't send twice on the same calendar day
    if (log && log.last_sent_at) {
      const lastDate = calendarDate(log.last_sent_at);
      if (lastDate >= todayDate()) continue;
    }

    const emails = (await Promise.all([
      lookupEmail(req.pic_utama),
      lookupEmail(req.pic_support),
    ])).filter(Boolean);

    if (!emails.length) {
      console.log(`[reminder] no recipients for ${reminderType} request ${req.id}`);
      continue;
    }

    const days = parseInt(req.days_until, 10);
    const subject = `[${typeLabel} Reminder] ${req.title} — starts in ${days} day(s)`;
    const html = `
<h2 style="color:#1d4ed8">${typeLabel} Reminder</h2>
<p>An activity is scheduled to start in <strong>${days} day(s)</strong>.</p>
<table cellpadding="6" style="border-collapse:collapse">
  <tr><td><strong>Activity</strong></td><td>${req.title}</td></tr>
  <tr><td><strong>Project</strong></td><td>${req.name}</td></tr>
  <tr><td><strong>PID</strong></td><td>${req.pid}</td></tr>
  <tr><td><strong>Company</strong></td><td>${req.company}</td></tr>
  <tr><td><strong>Start Date</strong></td><td>${req.start_date}</td></tr>
  <tr><td><strong>Days Until Start</strong></td><td>${days} day(s)</td></tr>
</table>
<p><a href="${BASE_URL()}">Open Project Tracker</a></p>`;
    const text =
      `${typeLabel} Reminder\n\nActivity: ${req.title}\nProject: ${req.name} (${req.pid})\n` +
      `Company: ${req.company}\nStart Date: ${req.start_date}\nDays Until Start: ${days} day(s)\n\n${BASE_URL()}`;

    const ok = await dispatch(emails, subject, html, text);
    if (ok) await markSent(req.project_id, reminderType, referenceId);
  }
}

// ─── main runner + cron ──────────────────────────────────────────────────────

async function runAllReminders() {
  console.log('[reminder] starting check at', new Date().toISOString());
  const checks = [
    ['contract_end',  checkContractEnd],
    ['bast_submit',   checkBastSubmit],
    ['cm_activity',   () => checkActivityReminders('cm')],
    ['pm_activity',   () => checkActivityReminders('pm')],
  ];
  for (const [name, fn] of checks) {
    try {
      await fn();
    } catch (err) {
      console.error(`[reminder] ${name} check failed:`, err);
    }
  }
  console.log('[reminder] check complete at', new Date().toISOString());
}

function startReminderCron() {
  const tz = process.env.REMINDER_TIMEZONE || 'Asia/Jakarta';
  cron.schedule('0 8 * * *', runAllReminders, { timezone: tz });
  console.log(`[reminder] cron scheduled: daily 08:00 (${tz})`);
}

module.exports = { startReminderCron, runAllReminders };
