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

// Notify the old and new address when an admin changes a user's email.
async function sendEmailChangeNotice({ user, oldEmail, newEmail }) {
  const roleLabel = formatRole(user.role);

  if (oldEmail) {
    const { html, text } = renderEmail({
      tone: 'orange',
      heading: 'Your Email Address Was Changed',
      badge: { label: 'Security Notice', tone: 'orange' },
      greetingHtml: `Hello <strong>${esc(user.username)}</strong>,`,
      introHtml: [
        `This is to let you know that the email address on your Project Tracker account was changed.`,
        `You will no longer receive notifications at this address.`,
      ],
      infoCardTitle: 'Change Details',
      infoFields: [
        ['Username', user.username],
        ['Role', roleLabel],
        ['Previous Email', oldEmail],
        ['New Email', newEmail],
      ],
      outroHtml: [`If you did not request this change, please contact an administrator immediately.`],
    });
    sendMail({ to: oldEmail, subject: '⚠️ Your Project Tracker email address was changed', html, text })
      .then(() => console.log(`[email] change-notice (old) sent → ${oldEmail}`))
      .catch(err => console.warn(`[email] change-notice (old) failed → ${oldEmail}:`, err.message));
  }

  const perms = await getRolePermissions(user.role);
  const notifications = relevantNotifications(perms);
  const { html, text } = renderEmail({
    tone: 'blue',
    heading: 'Email Address Updated',
    badge: { label: 'Account Updated' },
    greetingHtml: `Hello <strong>${esc(user.username)}</strong>,`,
    introHtml: [
      `This email address has been added to a Project Tracker account.`,
      `You'll now receive notifications and reminders at this address.`,
    ],
    infoCardTitle: 'Account Information',
    infoFields: [
      ['Username', user.username],
      ['Role', roleLabel],
      ['Email', newEmail],
    ],
    extraHtml: [bulletListHtml("You'll Receive Notifications For", notifications, '🔔')],
    extraText: [bulletListText("You'll Receive Notifications For", notifications)],
    outroHtml: [`If you don't recognize this change, please contact an administrator immediately.`],
  });
  sendMail({ to: newEmail, subject: '✅ This email was added to your Project Tracker account', html, text })
    .then(() => console.log(`[email] change-notice (new) sent → ${newEmail}`))
    .catch(err => console.warn(`[email] change-notice (new) failed → ${newEmail}:`, err.message));
}

async function lookupEmailById(userId) {
  if (!userId) return null;
  const { rows } = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
  return rows[0]?.email || null;
}

// Send assignment/reassignment notification for a CM or PM activity.
// recipients: array of email addresses to notify (already resolved and
// filtered to newly-assigned only by the caller).
async function sendAssignmentEmail({ type, isNew, code, title, project, startDate, startTime, endDate, endTime, status, picUtamaName, picSupportName, notes, recipients }) {
  if (!recipients || !recipients.length) return;

  const typeLabel = type === 'cm' ? 'Corrective Maintenance' : 'Preventive Maintenance';
  const shortLabel = type.toUpperCase();
  const introLine = isNew
    ? `You've been assigned to a new ${typeLabel.toLowerCase()} activity. Here are the details:`
    : `You've been reassigned to an existing ${typeLabel.toLowerCase()} activity. Here are the details:`;
  const subject = `${type === 'cm' ? '🔄' : '🚨'} [${shortLabel} Assignment] ${code ? code + ' — ' : ''}${title} — ${project.name} (${project.pid})`;

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
      ['Activity ID', code],
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

// Notify PICs who were removed from a CM or PM activity.
// recipients: array of email addresses to notify (already resolved and
// filtered to newly-removed only by the caller).
async function sendUnassignmentEmail({ type, code, title, project, startDate, startTime, endDate, endTime, status, recipients }) {
  if (!recipients || !recipients.length) return;

  const typeLabel = type === 'cm' ? 'Corrective Maintenance' : 'Preventive Maintenance';
  const shortLabel = type.toUpperCase();
  const subject = `➖ [${shortLabel} Unassignment] ${code ? code + ' — ' : ''}${title} — ${project.name} (${project.pid})`;

  const { html, text } = renderEmail({
    tone: 'orange',
    heading: `${typeLabel} Unassignment`,
    badge: { label: 'Removed From Activity', tone: 'orange' },
    greetingHtml: `Hi there,`,
    introHtml: [
      `You've been removed from a ${typeLabel.toLowerCase()} activity. You will no longer receive updates for it.`,
    ],
    infoCardTitle: 'Activity Information',
    infoFields: [
      ['Activity ID', code],
      ['Project', project.name],
      ['Activity', title],
      ['Schedule', formatSchedule(startDate, startTime, endDate, endTime)],
      ['Status', status],
    ],
    outroHtml: [`If you believe this was a mistake, please contact your project manager or an administrator.`],
  });

  for (const email of [...new Set(recipients)]) {
    sendMail({ to: email, subject, html, text })
      .then(() => console.log(`[email] unassignment sent → ${email}`))
      .catch(err => console.warn(`[email] unassignment failed → ${email}:`, err.message));
  }
}

module.exports = { sendMail, sendWelcomeEmail, sendEmailChangeNotice, lookupEmailById, sendAssignmentEmail, sendUnassignmentEmail };
