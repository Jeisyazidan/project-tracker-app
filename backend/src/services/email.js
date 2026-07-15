const nodemailer = require('nodemailer');
const db = require('../db');
const { getRolePermissions } = require('../middleware/rbac');
const { renderEmail, esc, formatSchedule, bulletListHtml, bulletListText } = require('./emailTemplate');

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

function formatRole(role) {
  return String(role || '')
    .split('_')
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// Maps each notification category to the RBAC permission that makes it relevant.
const NOTIFICATION_ITEMS = [
  { permKey: 'view_projects', label: 'Contract Expiration Reminder' },
  { permKey: 'view_bast',     label: 'BAST Reminder' },
  { permKey: 'manage_cm',     label: 'CM Assignment' },
  { permKey: 'manage_pm',     label: 'PM Assignment' },
  { permKey: 'view_cm',       label: 'CM Activity Reminder' },
  { permKey: 'view_pm',       label: 'PM Activity Reminder' },
];

// getRolePermissions returns null for admin (bypasses all checks) — treat as all granted.
function relevantNotifications(perms) {
  return NOTIFICATION_ITEMS.filter(item => !perms || perms[item.permKey]).map(i => i.label);
}

async function sendWelcomeEmail(user) {
  const roleLabel = formatRole(user.role);
  const perms = await getRolePermissions(user.role);
  const notifications = relevantNotifications(perms);

  const { html, text } = renderEmail({
    tone: 'blue',
    heading: 'Welcome to Project Tracker',
    badge: { label: 'Account Created' },
    greetingHtml: `Hello <strong>${esc(user.username)}</strong>,`,
    introHtml: [
      `I'm <strong>DEBORA</strong> (Digital Engineering Bot for Operational Reminder &amp; Automation), your digital assistant for Project Tracker.`,
      `Your account has been successfully created and you're ready to get started.`,
    ],
    infoCardTitle: 'Account Information',
    infoFields: [
      ['Username', user.username],
      ['Role', roleLabel],
      ['Email', user.email],
    ],
    extraHtml: [bulletListHtml("You'll Receive Notifications For", notifications, '🔔')],
    extraText: [bulletListText("You'll Receive Notifications For", notifications)],
    actionItems: ['Log in to your account', 'Verify your profile details', 'Start collaborating with your team'],
  });

  return sendMail({ to: user.email, subject: '👋 Welcome to Project Tracker', html, text });
}

async function lookupEmailById(userId) {
  if (!userId) return null;
  const { rows } = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
  return rows[0]?.email || null;
}

// Send assignment/reassignment notification for a CM or PM activity.
// recipients: array of email addresses to notify (already resolved and
// filtered to newly-assigned only by the caller).
async function sendAssignmentEmail({ type, isNew, title, project, startDate, startTime, endDate, endTime, status, picUtamaName, picSupportName, notes, recipients }) {
  if (!recipients || !recipients.length) return;

  const typeLabel = type === 'cm' ? 'Change Management' : 'Problem Management';
  const shortLabel = type.toUpperCase();
  const introLine = isNew
    ? `You've been assigned to a new ${typeLabel.toLowerCase()} activity. Here are the details:`
    : `You've been reassigned to an existing ${typeLabel.toLowerCase()} activity. Here are the details:`;
  const subject = `${type === 'cm' ? '🔄' : '🚨'} [${shortLabel} Assignment] ${title} — ${project.name} (${project.pid})`;

  const { html, text } = renderEmail({
    tone: 'blue',
    heading: `${typeLabel} Assignment`,
    badge: { label: isNew ? 'New Assignment' : 'Reassigned' },
    greetingHtml: `Hi there,`,
    introHtml: [
      `Congratulations — ${esc(introLine)}`,
    ],
    infoCardTitle: 'Activity Information',
    infoFields: [
      ['Project', project.name],
      ['Activity', title],
      ['Schedule', formatSchedule(startDate, startTime, endDate, endTime)],
      ['Status', status],
      ['Primary PIC', picUtamaName],
      ['Support PIC', picSupportName],
      ['Notes', notes],
    ],
    actionItems: ['Review the assignment details', 'Contact the team if you need clarification', 'Update progress in Project Tracker'],
  });

  for (const email of [...new Set(recipients)]) {
    sendMail({ to: email, subject, html, text })
      .then(() => console.log(`[email] assignment sent → ${email}`))
      .catch(err => console.warn(`[email] assignment failed → ${email}:`, err.message));
  }
}

module.exports = { sendMail, sendWelcomeEmail, lookupEmailById, sendAssignmentEmail };
