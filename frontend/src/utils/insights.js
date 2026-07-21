import { daysDiff } from './dates';
import { mergePeriods, BAST_STEPS, stepsDoneLabel } from './bastPeriods';

const TOP_N = 12;

function topNWithOther(entries) {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  if (sorted.length <= TOP_N) return sorted;
  const top = sorted.slice(0, TOP_N);
  const otherValue = sorted.slice(TOP_N).reduce((acc, e) => acc + e.value, 0);
  if (otherValue > 0) top.push({ label: 'Other', value: otherValue });
  return top;
}

export function getStatusCounts(projects) {
  const counts = {};
  projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
  return counts;
}

export function getHandoverCounts(projects) {
  const counts = {};
  projects.forEach(p => {
    const h = p.handover_status || 'Not Started';
    counts[h] = (counts[h] || 0) + 1;
  });
  return counts;
}

// Completed projects don't carry an "expiring" urgency (mirrors the badge
// shown in ProjectsPage, which replaces the days-until countdown with a
// plain "Completed" badge once a project is done).
export function getExpiryBuckets(projects) {
  const buckets = { expired: 0, within30: 0, within90: 0, beyond90: 0 };
  projects.forEach(p => {
    if (p.status === 'Completed' || !p.deadline) return;
    const d = daysDiff(p.deadline);
    if (d === null) return;
    if (d < 0) buckets.expired++;
    else if (d <= 30) buckets.within30++;
    else if (d <= 90) buckets.within90++;
    else buckets.beyond90++;
  });
  return buckets;
}

function allProjectPeriods(project) {
  return mergePeriods(project, project.bast_stored_periods || []);
}

export function getBastSummary(projects) {
  let billed = 0, inProgress = 0, pending = 0;
  projects.forEach(p => {
    allProjectPeriods(p).forEach(per => {
      const label = stepsDoneLabel(per.steps);
      if (label === 'Billed') billed++;
      else if (label === 'In Progress') inProgress++;
      else pending++;
    });
  });
  return { billed, inProgress, pending, totalPeriods: billed + inProgress + pending };
}

// Among not-yet-billed periods, count which checklist step (first `false`
// in the steps array) each one is currently stuck waiting on.
export function getBastBottlenecks(projects) {
  const counts = new Array(BAST_STEPS.length).fill(0);
  projects.forEach(p => {
    allProjectPeriods(p).forEach(per => {
      const idx = per.steps.findIndex(s => !s);
      if (idx !== -1) counts[idx]++;
    });
  });
  return counts;
}

export function getRequestStatusCounts(requests) {
  const counts = { Open: 0, 'In Progress': 0, Resolved: 0 };
  requests.forEach(r => {
    const s = r.status || 'Open';
    counts[s] = (counts[s] || 0) + 1;
  });
  return counts;
}

// Trailing `months` calendar months (including the current one), bucketed
// strictly by created_at — the only timestamp stamped once and never
// rewritten, unlike the manually-typed resolved_date field.
export function getMonthlyTrend(cmRequests, pmRequests, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    buckets.push({ month: key, label, cm: 0, pm: 0 });
  }
  const byKey = Object.fromEntries(buckets.map(b => [b.month, b]));
  const tally = (requests, field) => {
    requests.forEach(r => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (byKey[key]) byKey[key][field]++;
    });
  };
  tally(cmRequests, 'cm');
  tally(pmRequests, 'pm');
  return buckets;
}

// Active (Open + In Progress) CM/PM assignments per user, counting a user
// once per request even if they hold both PIC Utama and PIC Support on it.
export function getPicWorkload(cmRequests, pmRequests, usersList) {
  const nameById = Object.fromEntries((usersList || []).map(u => [u.id, u.username]));
  const counts = {};
  const tally = requests => {
    requests.forEach(r => {
      if (r.status !== 'Open' && r.status !== 'In Progress') return;
      const ids = new Set([
        ...(r.pic_utama_users || []).map(u => u.id),
        ...(r.pic_support_users || []).map(u => u.id),
      ]);
      ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    });
  };
  tally(cmRequests);
  tally(pmRequests);
  const entries = Object.entries(counts).map(([id, value]) => ({
    label: nameById[id] || `User #${id}`,
    value,
  }));
  return topNWithOther(entries);
}

export function getCompanyBreakdown(projects) {
  const counts = {};
  projects.forEach(p => {
    const c = p.company || 'Unknown';
    counts[c] = (counts[c] || 0) + 1;
  });
  return topNWithOther(Object.entries(counts).map(([label, value]) => ({ label, value })));
}

// BAST completion % per company. The "Other" bucket (companies past the
// top-N cutoff) is a weighted billed/total ratio, not an average of
// percentages, so it stays a mathematically valid completion rate.
export function getCompanyBastCompletion(projects) {
  const byCompany = {};
  projects.forEach(p => {
    const periods = allProjectPeriods(p);
    if (!periods.length) return;
    const c = p.company || 'Unknown';
    if (!byCompany[c]) byCompany[c] = { billed: 0, total: 0 };
    byCompany[c].total += periods.length;
    byCompany[c].billed += periods.filter(per => per.steps.every(Boolean)).length;
  });
  const sorted = Object.entries(byCompany)
    .map(([label, { billed, total }]) => ({ label, billed, total }))
    .sort((a, b) => b.total - a.total);
  const toPct = ({ label, billed, total }) => ({ label, value: Math.round((billed / total) * 100) });
  if (sorted.length <= TOP_N) return sorted.map(toPct);
  const top = sorted.slice(0, TOP_N).map(toPct);
  const rest = sorted.slice(TOP_N);
  const otherBilled = rest.reduce((acc, e) => acc + e.billed, 0);
  const otherTotal = rest.reduce((acc, e) => acc + e.total, 0);
  if (otherTotal > 0) top.push({ label: 'Other', value: Math.round((otherBilled / otherTotal) * 100) });
  return top;
}

export function getKpis(projects, cmRequests, pmRequests) {
  const activeProjects = projects.filter(p => p.status !== 'Completed').length;
  const activeRequests =
    cmRequests.filter(r => r.status !== 'Resolved').length +
    pmRequests.filter(r => r.status !== 'Resolved').length;
  const bast = getBastSummary(projects);
  const bastCompletionPct = bast.totalPeriods ? Math.round((bast.billed / bast.totalPeriods) * 100) : 0;
  const expiringSoon = getExpiryBuckets(projects).within30;
  return { activeProjects, activeRequests, bastCompletionPct, expiringSoon };
}
