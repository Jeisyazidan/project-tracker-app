// Shared "DEBORA" enterprise email design system.
// Every notification email is built from these components so header, footer,
// button, cards, and colors stay identical across templates — only the
// content passed into renderEmail() changes per email type.

const APP_URL = () => process.env.APP_BASE_URL || 'https://pwtracker.sislab.com';

const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

const TONES = {
  blue:   { primary: '#2563EB', soft: '#EFF6FF', softBorder: '#BFDBFE', text: '#1D4ED8' },
  orange: { primary: '#D97706', soft: '#FFFBEB', softBorder: '#FDE68A', text: '#B45309' },
  red:    { primary: '#DC2626', soft: '#FEF2F2', softBorder: '#FECACA', text: '#B91C1C' },
};

// Duplicated from frontend/src/utils/bastPeriods.js — kept in sync manually,
// same pattern already used for the BAST period-generation logic itself.
const BAST_STEPS = [
  'Pembuatan Report Operation',
  'Pembuatan Dokumen BAST',
  'TTD General Manager (Dwi Budiyanto)',
  'TTD Direktur (Meri Gajali)',
  'Submit Hardcopy Document ke Customer',
  'TTD Customer',
  'Dokumen Kembali ke Kita',
  'Send Invoice',
];

const BILLING_FREQ_LABELS = {
  once: 'One-time payment',
  '1':  'Once a year (every 12 months)',
  '2':  'Twice a year (every 6 months)',
  '3':  '3 times a year (every 4 months)',
  '4':  '4 times a year (every 3 months)',
  '6':  '6 times a year (every 2 months)',
  '12': 'Monthly (every 1 month)',
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripTags(html) {
  return String(html ?? '').replace(/<[^>]+>/g, '');
}

function formatSchedule(startDate, startTime, endDate, endTime) {
  const startStr = [startDate, startTime].filter(Boolean).join(' ');
  const endStr   = [endDate, endTime].filter(Boolean).join(' ');
  if (startStr && endStr) return `${startStr} → ${endStr}`;
  return startStr || endStr || null;
}

// ─── components ─────────────────────────────────────────────────────────────

function badgeHtml(label, tone = 'blue') {
  const t = TONES[tone] || TONES.blue;
  return `<span style="display:inline-block;background:${t.soft};color:${t.text};border:1px solid ${t.softBorder};border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;">${esc(label)}</span>`;
}

function buttonHtml(text, url) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 4px;">
    <tr><td align="center" bgcolor="#2563EB" style="border-radius:6px;">
      <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:12px 30px;font-family:${FONT};font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;">${esc(text)}</a>
    </td></tr>
  </table>`;
}

function infoCardHtml(title, fields) {
  const visible = fields.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!visible.length) return '';
  const rows = visible.map(([label, value], i) => `
      <tr>
        <td style="padding:9px 0;font-size:13px;color:#6B778C;width:44%;${i < visible.length - 1 ? 'border-bottom:1px solid #F0F1F3;' : ''}">${esc(label)}</td>
        <td style="padding:9px 0;font-size:14px;color:#172B4D;font-weight:600;${i < visible.length - 1 ? 'border-bottom:1px solid #F0F1F3;' : ''}">${esc(value)}</td>
      </tr>`).join('');
  return `
  <div style="margin:20px 0;">
    ${title ? `<div style="font-size:12px;font-weight:700;color:#6B778C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">${esc(title)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#F9FAFB;border:1px solid #EDEFF2;border-radius:10px;padding:4px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td></tr></table>
  </div>`;
}

function infoCardText(title, fields) {
  const visible = fields.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!visible.length) return [];
  return ['', title || 'Information', ...visible.map(([l, v]) => `  ${l}: ${v}`)];
}

function actionCardHtml(items, tone = 'blue') {
  if (!items.length) return '';
  const t = TONES[tone] || TONES.blue;
  const rows = items.map(item => `
      <tr>
        <td style="padding:5px 0;font-size:14px;color:${t.text};width:22px;vertical-align:top;">✓</td>
        <td style="padding:5px 0;font-size:14px;color:#172B4D;">${esc(item)}</td>
      </tr>`).join('');
  return `
  <div style="margin:22px 0;">
    <div style="font-size:12px;font-weight:700;color:#6B778C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Action Required</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${t.soft};border:1px solid ${t.softBorder};border-radius:10px;padding:14px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td></tr></table>
  </div>`;
}

function actionText(items) {
  if (!items.length) return [];
  return ['', 'Action Required:', ...items.map(i => `- ${i}`)];
}

function checklistHtml(items) {
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const rows = items.map(i => `
      <tr>
        <td style="padding:5px 0;font-size:14px;width:24px;vertical-align:top;color:${i.done ? '#16A34A' : '#9AA5B1'};">${i.done ? '☑' : '☒'}</td>
        <td style="padding:5px 0;font-size:14px;color:${i.done ? '#6B778C' : '#172B4D'};${i.done ? 'text-decoration:line-through;' : ''}">${esc(i.label)}</td>
      </tr>`).join('');
  return `
  <div style="margin:20px 0;">
    <div style="font-size:12px;font-weight:700;color:#6B778C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Checklist Progress</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#F9FAFB;border:1px solid #EDEFF2;border-radius:10px;padding:14px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
      <div style="margin-top:12px;font-size:13px;font-weight:700;color:#172B4D;">Progress: ${done} / ${total} Completed</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>
        <td style="background:#16A34A;height:6px;border-radius:4px;width:${pct}%;font-size:0;line-height:0;">&nbsp;</td>
        <td style="background:#E5E7EB;height:6px;border-radius:4px;width:${100 - pct}%;font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
    </td></tr></table>
  </div>`;
}

function checklistText(items) {
  const done = items.filter(i => i.done).length;
  return ['', 'Checklist Progress:', ...items.map(i => `  [${i.done ? 'x' : ' '}] ${i.label}`), `  Progress: ${done} / ${items.length} Completed`];
}

function bulletListHtml(title, items, icon = '•') {
  if (!items.length) return '';
  const rows = items.map(i => `
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6B778C;width:20px;vertical-align:top;">${icon}</td>
        <td style="padding:4px 0;font-size:14px;color:#172B4D;">${esc(i)}</td>
      </tr>`).join('');
  return `
  <div style="margin:20px 0;">
    <div style="font-size:12px;font-weight:700;color:#6B778C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">${esc(title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#F9FAFB;border:1px solid #EDEFF2;border-radius:10px;padding:12px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td></tr></table>
  </div>`;
}

function bulletListText(title, items) {
  if (!items.length) return [];
  return ['', title, ...items.map(i => `  - ${i}`)];
}

function wrapDocument(tone, bodyHtml) {
  const t = TONES[tone] || TONES.blue;
  return `<div style="background:#F3F4F6;padding:32px 16px;font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;">
<tr><td style="background:${t.primary};padding:28px 32px;border-radius:12px 12px 0 0;">
  <div style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:0.5px;">PROJECT TRACKER</div>
  <div style="font-size:12px;color:#FFFFFF;opacity:0.85;margin-top:4px;">Powered by DEBORA</div>
</td></tr>
<tr><td style="padding:32px;">
${bodyHtml}
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #EDEFF2;background:#FAFBFC;border-radius:0 0 12px 12px;">
  <p style="margin:0 0 4px;font-size:13px;color:#42526E;">Regards,</p>
  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#172B4D;">DEBORA</p>
  <p style="margin:0 0 2px;font-size:12px;color:#6B778C;">Digital Engineering Bot for Operational Reminder &amp; Automation</p>
  <p style="margin:0 0 14px;font-size:12px;color:#6B778C;">Project Tracker Notification Service</p>
  <p style="margin:0;font-size:11px;color:#97A0AF;">This is an automated email. Please do not reply.</p>
</td></tr>
</table>
</td></tr></table>
</div>`;
}

// ─── top-level composer ──────────────────────────────────────────────────────

function renderEmail({
  tone = 'blue',
  heading,
  badge,
  greetingHtml,
  greetingText,
  introHtml = [],
  infoCardTitle,
  infoFields = [],
  extraHtml = [],
  extraText = [],
  actionItems = [],
  outroHtml = [],
  buttonText = 'Open Project Tracker',
  buttonUrl,
}) {
  const url = buttonUrl || APP_URL();

  const bodyHtml = `
    <div style="margin-bottom:18px;">
      <h1 style="margin:0 0 10px;font-size:19px;color:#172B4D;">${esc(heading)}</h1>
      ${badge ? badgeHtml(badge.label, badge.tone || tone) : ''}
    </div>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1F2933;">${greetingHtml}</p>
    ${introHtml.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1F2933;">${p}</p>`).join('')}
    ${infoCardHtml(infoCardTitle, infoFields)}
    ${extraHtml.join('')}
    ${actionCardHtml(actionItems, tone)}
    ${outroHtml.map(p => `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#1F2933;">${p}</p>`).join('')}
    ${buttonHtml(buttonText, url)}
  `;

  const html = wrapDocument(tone, bodyHtml);

  const textLines = [
    'PROJECT TRACKER — Powered by DEBORA',
    '',
    heading,
    '',
    greetingText || stripTags(greetingHtml),
    ...introHtml.map(stripTags),
    ...infoCardText(infoCardTitle, infoFields),
    ...extraText.flat(),
    ...actionText(actionItems),
    ...outroHtml.map(stripTags),
    '',
    `${buttonText}: ${url}`,
    '',
    '--',
    'Regards,',
    'DEBORA',
    'Digital Engineering Bot for Operational Reminder & Automation',
    'Project Tracker Notification Service',
    '',
    'This is an automated email. Please do not reply.',
  ];
  const text = textLines.join('\n');

  return { html, text };
}

module.exports = {
  TONES,
  BAST_STEPS,
  BILLING_FREQ_LABELS,
  esc,
  formatSchedule,
  renderEmail,
  badgeHtml,
  buttonHtml,
  checklistHtml,
  checklistText,
  bulletListHtml,
  bulletListText,
};
