const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

export function daysDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - TODAY) / 86400000);
}

export function workdaysUntil(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr + 'T00:00:00');
  end.setHours(0, 0, 0, 0);
  if (end < TODAY) return null;
  let count = 0;
  const cur = new Date(TODAY);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function dateClass(dateStr) {
  const d = daysDiff(dateStr);
  if (d === null) return '';
  if (d < 0) return 'date-overdue';
  if (d <= 14) return 'date-soon';
  return 'date-ok';
}

export function todayString() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}
