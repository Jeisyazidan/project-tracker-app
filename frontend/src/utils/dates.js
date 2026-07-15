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

// Returns a 42-cell (6x7) month grid starting on Sunday, including
// leading/trailing days from adjacent months. month is 1-12.
export function getMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    cells.push({ iso, day: d.getDate(), inMonth: d.getMonth() === month - 1 });
  }
  return cells;
}
