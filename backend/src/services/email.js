const nodemailer = require('nodemailer');
const db = require('../db');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'localhost',
  port:   parseInt(process.env.SMTP_PORT || '25'),
  secure: process.env.SMTP_SECURE === 'true',
  auth:   process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || 'noreply@company.internal',
    to,
    subject,
    html,
    text,
  });
}

async function sendWelcomeEmail(user) {
  return sendMail({
    to: user.email,
    subject: 'Welcome to Project Tracker',
    html: `<p>Hi <strong>${user.username}</strong>,</p>
           <p>Your account has been created. Role: <strong>${user.role}</strong>.</p>`,
    text: `Hi ${user.username}, your account has been created. Role: ${user.role}.`,
  });
}

async function lookupEmail(username) {
  if (!username) return null;
  const { rows } = await db.query('SELECT email FROM users WHERE username = $1', [username]);
  return rows[0]?.email || null;
}

// Send assignment/reassignment notification for a CM or PM activity.
// pics: array of usernames to notify (already filtered to newly-assigned only).
async function sendAssignmentEmail({ type, isNew, title, project, startDate, startTime, endDate, endTime, notes, pics }) {
  if (!pics.length) return;

  const typeLabel = type === 'cm' ? 'CM (Corrective Maintenance)' : 'PM (Preventive Maintenance)';
  const actionLine = isNew ? 'You have been assigned to a new activity.' : 'You have been reassigned to an existing activity.';
  const subject = `[${type.toUpperCase()} Assignment] ${title} — ${project.name} (${project.pid})`;

  const startStr = [startDate, startTime].filter(Boolean).join(' ');
  const endStr   = [endDate,   endTime  ].filter(Boolean).join(' ');

  const html = `
<h2 style="color:#1d4ed8">${typeLabel} Assignment</h2>
<p>${actionLine}</p>
<table cellpadding="6" style="border-collapse:collapse">
  <tr><td><strong>Activity</strong></td><td>${title}</td></tr>
  <tr><td><strong>Project</strong></td><td>${project.name}</td></tr>
  <tr><td><strong>PID</strong></td><td>${project.pid}</td></tr>
  <tr><td><strong>Company</strong></td><td>${project.company}</td></tr>
  ${startStr ? `<tr><td><strong>Start</strong></td><td>${startStr}</td></tr>` : ''}
  ${endStr   ? `<tr><td><strong>End</strong></td><td>${endStr}</td></tr>`   : ''}
  ${notes    ? `<tr><td><strong>Notes</strong></td><td>${notes}</td></tr>`  : ''}
</table>
<p><a href="${process.env.APP_BASE_URL || 'http://localhost:5173'}">Open Project Tracker</a></p>`;

  const text =
    `${typeLabel} Assignment\n\n${actionLine}\n\n` +
    `Activity: ${title}\nProject: ${project.name} (${project.pid})\nCompany: ${project.company}\n` +
    (startStr ? `Start: ${startStr}\n` : '') +
    (endStr   ? `End: ${endStr}\n`   : '') +
    (notes    ? `Notes: ${notes}\n`  : '') +
    `\n${process.env.APP_BASE_URL || 'http://localhost:5173'}`;

  const emails = (await Promise.all(pics.map(lookupEmail))).filter(Boolean);
  for (const email of [...new Set(emails)]) {
    sendMail({ to: email, subject, html, text })
      .then(() => console.log(`[email] assignment sent → ${email}`))
      .catch(err => console.warn(`[email] assignment failed → ${email}:`, err.message));
  }
}

module.exports = { sendMail, sendWelcomeEmail, lookupEmail, sendAssignmentEmail };
