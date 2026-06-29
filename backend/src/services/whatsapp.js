const db = require('../db');

function normalizePhone(phone) {
  if (!phone) return null;
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  if (!p.startsWith('62')) p = '62' + p;
  return p;
}

async function sendWhatsApp(phone, message) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error('FONNTE_TOKEN not set');
  const target = normalizePhone(phone);
  if (!target) throw new Error('Invalid phone number');

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, message, countryCode: '62' }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.reason || 'Fonnte send failed');
  return true;
}

async function lookupPhone(name) {
  if (!name) return null;

  // Try exact match first
  let { rows } = await db.query('SELECT phone FROM users WHERE username = $1', [name]);
  if (rows[0]?.phone) return rows[0].phone;

  // Fuzzy: match on first word and last word (handles abbreviated middle names)
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0];
    const last  = parts[parts.length - 1];
    ({ rows } = await db.query(
      `SELECT phone FROM users
       WHERE username ILIKE $1 AND username ILIKE $2
       LIMIT 1`,
      [`${first}%`, `%${last}`]
    ));
    if (rows[0]?.phone) return rows[0].phone;
  }

  console.log(`[whatsapp] no phone for user: "${name}"`);
  return null;
}

// Send to multiple phone numbers; returns true if at least one succeeded
async function dispatchWhatsApp(phones, message) {
  let anyOk = false;
  const unique = [...new Set(phones.filter(Boolean).map(normalizePhone).filter(Boolean))];
  for (const phone of unique) {
    try {
      await sendWhatsApp(phone, message);
      console.log(`[whatsapp] sent → ${phone}`);
      anyOk = true;
    } catch (err) {
      console.error(`[whatsapp] failed → ${phone}:`, err.message);
    }
  }
  return anyOk;
}

module.exports = { sendWhatsApp, lookupPhone, dispatchWhatsApp, normalizePhone };
