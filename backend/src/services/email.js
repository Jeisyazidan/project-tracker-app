const nodemailer = require('nodemailer');

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

module.exports = { sendMail, sendWelcomeEmail };
