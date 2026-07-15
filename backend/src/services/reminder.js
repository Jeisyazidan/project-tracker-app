const cron    = require('node-cron');
const db      = require('../db');
const { sendMail, lookupEmailById } = require('./email');
const { renderEmail, formatSchedule, BAST_STEPS, BILLING_FREQ_LABELS, checklistHtml, checklistText } = require('./emailTemplate');

// ─── helpers ────────────────────────────────────────────────────────────────

async function lookupEmail(userId) {
  if (!userId) return null;
  const email = await lookupEmailById(userId);
  if (!email) console.log(`[reminder] no user found for id: "${userId}"`);
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

// Three thresholds: 60d → 30d → 7d, each fires once via its own reference_id.
async function checkContractEnd() {
  const { rows } = await db.query(`
    SELECT id, pid, name, company, deadline::text, billing_freq, handover_status,
           project_admin_id, project_manager_id, operation_manager_id,
           (deadline - CURRENT_DATE) AS days_remaining
    FROM projects
    WHERE deadline IS NOT NULL
      AND deadline - CURRENT_DATE BETWEEN 0 AND 60
  `);

  for (const p of rows) {
    const days = parseInt(p.days_remaining, 10);

    // Determine which threshold bucket applies and which ones still need sending.
    // Buckets fire in order (60d first, then 30d, then 7d) and each sends once.
    const thresholds = [
      { bucket: '60d', tone: 'blue',   applies: days <= 60 },
      { bucket: '30d', tone: 'orange', applies: days <= 30 },
      { bucket: '7d',  tone: 'red',    applies: days <= 7  },
    ];

    for (const { bucket, tone, applies } of thresholds) {
      if (!applies) continue;
      const log = await getLog(p.id, 'contract_end', `contract:${bucket}`);
      if (log && log.send_count >= 1) continue;

      const emails = (await Promise.all([
        lookupEmail(p.project_admin_id),
        lookupEmail(p.project_manager_id),
        lookupEmail(p.operation_manager_id),
      ])).filter(Boolean);

      if (!emails.length) {
        console.log(`[reminder] no recipients for contract_end project ${p.id} (${bucket})`);
        continue;
      }

      const subject = `📅 [Contract Expiration Reminder] ${p.name} — ${days} day(s) remaining`;
      const { html, text } = renderEmail({
        tone,
        heading: 'Contract Expiration Reminder',
        badge: { label: `${days} Day(s) Remaining` },
        greetingHtml: 'Hello,',
        introHtml: [
          `Just a friendly heads-up — the contract for <strong>${p.name}</strong> is approaching its end date. Please review the details below and coordinate next steps with your team.`,
        ],
        infoCardTitle: 'Project Information',
        infoFields: [
          ['PID', p.pid],
          ['Project', p.name],
          ['Company', p.company],
          ['Contract End Date', p.deadline],
          ['Remaining Days', `${days} day(s)`],
          ['Billing Frequency', BILLING_FREQ_LABELS[p.billing_freq] || p.billing_freq],
          ['Current Handover Status', p.handover_status],
        ],
        actionItems: ['Review contract details', 'Coordinate with stakeholders', 'Prepare renewal or project closure plan'],
      });

      const ok = await dispatch(emails, subject, html, text);
      if (ok) await markSent(p.id, 'contract_end', `contract:${bucket}`);
    }
  }
}

// ─── BAST submit deadline ────────────────────────────────────────────────────

async function checkBastSubmit() {
  const { rows } = await db.query(`
    SELECT
      bp.project_id, bp.label, bp.submit_deadline::text, bp.steps,
      p.pid, p.name, p.company, p.project_admin_id, p.project_manager_id,
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
      lookupEmail(period.project_admin_id),
      lookupEmail(period.project_manager_id),
    ])).filter(Boolean);

    if (!emails.length) {
      console.log(`[reminder] no recipients for bast_submit project ${period.project_id} period "${period.label}"`);
      continue;
    }

    const statusText = days < 0
      ? `${Math.abs(days)} days overdue`
      : `${days} day(s) remaining`;
    const tone = days < 0 ? 'red' : 'orange';
    const checklistItems = BAST_STEPS.map((label, i) => ({ label, done: !!period.steps[i] }));

    const subject = `📄 [BAST Reminder] ${period.name} — ${period.label} (${statusText})`;
    const { html, text } = renderEmail({
      tone,
      heading: 'BAST Submission Reminder',
      badge: { label: statusText },
      greetingHtml: 'Hello,',
      introHtml: [
        `A BAST submission deadline requires your attention. Here's the current status:`,
      ],
      infoCardTitle: 'Project Information',
      infoFields: [
        ['PID', period.pid],
        ['Project', period.name],
        ['Company', period.company],
        ['Period', period.label],
        ['Submit Deadline', period.submit_deadline],
        ['Remaining Days', statusText],
      ],
      extraHtml: [checklistHtml(checklistItems)],
      extraText: [checklistText(checklistItems)],
      actionItems: ['Complete the remaining checklist items', 'Submit before the deadline'],
    });

    const ok = await dispatch(emails, subject, html, text);
    if (ok) await markSent(period.project_id, 'bast_submit', referenceId);
  }
}

// ─── CM / PM activity ────────────────────────────────────────────────────────

async function checkActivityReminders(type) {
  const table        = type === 'cm' ? 'cm_requests' : 'pm_requests';
  const reminderType = type === 'cm' ? 'cm_activity' : 'pm_activity';
  const typeLabel    = type === 'cm' ? 'Change Management' : 'Problem Management';
  const shortLabel   = type.toUpperCase();

  const { rows } = await db.query(`
    SELECT
      r.id, r.project_id, r.title, r.status,
      r.start_date::text, r.end_date::text, r.start_time::text, r.end_time::text,
      r.pic_utama_id, r.pic_support_id,
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
      lookupEmail(req.pic_utama_id),
      lookupEmail(req.pic_support_id),
    ])).filter(Boolean);

    if (!emails.length) {
      console.log(`[reminder] no recipients for ${reminderType} request ${req.id}`);
      continue;
    }

    const days = parseInt(req.days_until, 10);
    const subject = `⏰ [${shortLabel} Reminder] ${req.title} — starts in ${days} day(s)`;
    const { html, text } = renderEmail({
      tone: 'orange',
      heading: `${typeLabel} Reminder`,
      badge: { label: `Starts in ${days} Day(s)` },
      greetingHtml: 'Hello,',
      introHtml: [
        `An activity is scheduled to start in <strong>${days} day(s)</strong>. Here are the details:`,
      ],
      infoCardTitle: 'Activity Information',
      infoFields: [
        ['Project', req.name],
        ['Activity', req.title],
        ['Schedule', formatSchedule(req.start_date, req.start_time, req.end_date, req.end_time)],
        ['Status', req.status],
      ],
      actionItems: ['Prepare for implementation', 'Confirm readiness with your team', 'Update progress in Project Tracker'],
    });

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
