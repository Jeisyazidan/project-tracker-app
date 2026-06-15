const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export const BAST_STEPS = [
  'Pembuatan Report Operation',
  'Pembuatan Dokumen BAST',
  'TTD General Manager (Dwi Budiyanto)',
  'TTD Direktur (Meri Gajali)',
  'Submit Hardcopy Document ke Customer',
  'TTD Customer',
  'Dokumen Kembali ke Kita',
  'Send Invoice',
];

export const BILLING_FREQ_LABELS = {
  once: 'One-time payment',
  '1':  'Once a year (every 12 months)',
  '2':  'Twice a year (every 6 months)',
  '3':  '3 times a year (every 4 months)',
  '4':  '4 times a year (every 3 months)',
  '6':  '6 times a year (every 2 months)',
  '12': 'Monthly (every 1 month)',
};

export function generatePeriods(startStr, endStr, freq) {
  if (!startStr || !endStr || !freq) return [];
  if (freq === 'once') {
    return [{ label: 'One-time Payment', start: startStr, end: endStr }];
  }
  const freqNum = parseInt(freq, 10);
  if (isNaN(freqNum) || freqNum < 1) return [];
  const monthsPerPeriod = 12 / freqNum;
  const start = new Date(startStr + 'T00:00:00');
  const end   = new Date(endStr   + 'T00:00:00');
  const periods = [];
  let cur = new Date(start);
  while (cur <= end) {
    const pStart = new Date(cur);
    const pEnd   = new Date(cur);
    pEnd.setMonth(pEnd.getMonth() + monthsPerPeriod);
    pEnd.setDate(pEnd.getDate() - 1);
    const actualEnd = pEnd > end ? end : pEnd;
    let label;
    if (monthsPerPeriod === 12) {
      label = String(pStart.getFullYear());
    } else if (monthsPerPeriod === 1) {
      label = MONTHS_ID[pStart.getMonth()] + ' ' + pStart.getFullYear();
    } else {
      label = MONTHS_ID[pStart.getMonth()] + ' – ' + MONTHS_ID[actualEnd.getMonth()] + ' ' + actualEnd.getFullYear();
    }
    periods.push({
      label,
      start: pStart.toISOString().slice(0, 10),
      end:   actualEnd.toISOString().slice(0, 10),
    });
    cur.setMonth(cur.getMonth() + monthsPerPeriod);
  }
  return periods;
}

// Merge generated schedule with stored DB rows
export function mergePeriods(project, storedRows) {
  const generated = generatePeriods(project.contract_start, project.deadline, project.billing_freq);
  const EMPTY_STEPS = [false,false,false,false,false,false,false,false];
  const autoPeriods = generated.map(g => {
    const stored = storedRows.find(s => s.label === g.label && !s.is_custom);
    return {
      id:              stored?.id ?? null,
      label:           g.label,
      start:           g.start,
      end:             g.end,
      steps:           stored?.steps ?? [...EMPTY_STEPS],
      submit_deadline: stored?.submit_deadline ?? null,
      is_custom:       false,
    };
  });
  const customPeriods = storedRows
    .filter(r => r.is_custom)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(r => ({
      id:              r.id,
      label:           r.label,
      start:           r.start_date ?? r.start,
      end:             r.end_date   ?? r.end,
      steps:           r.steps ?? [...EMPTY_STEPS],
      submit_deadline: r.submit_deadline ?? null,
      is_custom:       true,
    }));
  return [...autoPeriods, ...customPeriods];
}

export function currentBastPeriod(periods) {
  if (!periods.length) return null;
  const active = periods.find(p => !p.steps.every(Boolean));
  return active ?? periods[periods.length - 1];
}

export function stepsDoneLabel(steps) {
  const done = steps.filter(Boolean).length;
  if (done === 0) return 'Pending';
  if (done === 8) return 'Billed';
  return 'In Progress';
}
