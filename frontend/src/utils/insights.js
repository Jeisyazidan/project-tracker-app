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

// Keys that fall past the top-N cutoff (i.e. collapsed into "Other").
// Shared by every top-N+Other chart's detail drill-down so "Other"
// membership never drifts from the chart's own cutoff.
function overflowKeys(counts) {
  return new Set(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(TOP_N));
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
function expiryBucketKey(p) {
  if (p.status === 'Completed' || !p.deadline) return null;
  const d = daysDiff(p.deadline);
  if (d === null) return null;
  if (d < 0) return 'expired';
  if (d <= 30) return 'within30';
  if (d <= 90) return 'within90';
  return 'beyond90';
}

export function getExpiryBuckets(projects) {
  const buckets = { expired: 0, within30: 0, within90: 0, beyond90: 0 };
  projects.forEach(p => {
    const key = expiryBucketKey(p);
    if (key) buckets[key]++;
  });
  return buckets;
}

export function getProjectsByExpiryBucket(projects, bucketKey) {
  return projects.filter(p => expiryBucketKey(p) === bucketKey);
}

function allProjectPeriods(project) {
  return mergePeriods(project, project.bast_stored_periods || []);
}

// Every {project, period} pair across all projects — the shared base for
// BAST detail drill-downs (billing bucket, bottleneck step, per-company).
function allPeriodRows(projects) {
  const rows = [];
  projects.forEach(p => allProjectPeriods(p).forEach(period => rows.push({ project: p, period })));
  return rows;
}

export function getBastSummary(projects) {
  let billed = 0, inProgress = 0, pending = 0;
  allPeriodRows(projects).forEach(({ period }) => {
    const label = stepsDoneLabel(period.steps);
    if (label === 'Billed') billed++;
    else if (label === 'In Progress') inProgress++;
    else pending++;
  });
  return { billed, inProgress, pending, totalPeriods: billed + inProgress + pending };
}

export function getPeriodsByBillingBucket(projects, bucketLabel) {
  return allPeriodRows(projects).filter(({ period }) => stepsDoneLabel(period.steps) === bucketLabel);
}

// Among not-yet-billed periods, count which checklist step (first `false`
// in the steps array) each one is currently stuck waiting on.
export function getBastBottlenecks(projects) {
  const counts = new Array(BAST_STEPS.length).fill(0);
  allPeriodRows(projects).forEach(({ period }) => {
    const idx = period.steps.findIndex(s => !s);
    if (idx !== -1) counts[idx]++;
  });
  return counts;
}

export function getPeriodsByBottleneckStep(projects, stepIndex) {
  return allPeriodRows(projects).filter(({ period }) => period.steps.findIndex(s => !s) === stepIndex);
}

export function getRequestStatusCounts(requests) {
  const counts = { Open: 0, 'In Progress': 0, Resolved: 0 };
  requests.forEach(r => {
    const s = r.status || 'Open';
    counts[s] = (counts[s] || 0) + 1;
  });
  return counts;
}

export function getRequestsByStatus(requests, label) {
  return requests.filter(r => (r.status || 'Open') === label);
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
function picActiveCounts(cmRequests, pmRequests) {
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
  return counts;
}

export function getPicWorkload(cmRequests, pmRequests, usersList) {
  const nameById = Object.fromEntries((usersList || []).map(u => [u.id, u.username]));
  const counts = picActiveCounts(cmRequests, pmRequests);
  const entries = Object.entries(counts).map(([id, value]) => ({
    label: nameById[id] || `User #${id}`,
    value,
  }));
  return topNWithOther(entries);
}

export function getPicWorkloadRequests(cmRequests, pmRequests, usersList, label) {
  const idByName = Object.fromEntries((usersList || []).map(u => [u.username, String(u.id)]));
  const counts = picActiveCounts(cmRequests, pmRequests);
  const targetIds = label === 'Other' ? overflowKeys(counts) : new Set([idByName[label]]);
  const isActive = r => r.status === 'Open' || r.status === 'In Progress';
  const picIds = r => new Set([
    ...(r.pic_utama_users || []).map(u => String(u.id)),
    ...(r.pic_support_users || []).map(u => String(u.id)),
  ]);
  return [
    ...cmRequests.filter(isActive).map(r => ({ ...r, requestType: 'CM' })),
    ...pmRequests.filter(isActive).map(r => ({ ...r, requestType: 'PM' })),
  ].filter(r => [...picIds(r)].some(id => targetIds.has(id)));
}

function companyCounts(projects) {
  const counts = {};
  projects.forEach(p => {
    const c = p.company || 'Unknown';
    counts[c] = (counts[c] || 0) + 1;
  });
  return counts;
}

export function getCompanyBreakdown(projects) {
  return topNWithOther(Object.entries(companyCounts(projects)).map(([label, value]) => ({ label, value })));
}

export function getProjectsByCompanyBucket(projects, label) {
  const counts = companyCounts(projects);
  if (label === 'Other') {
    const overflow = overflowKeys(counts);
    return projects.filter(p => overflow.has(p.company || 'Unknown'));
  }
  return projects.filter(p => (p.company || 'Unknown') === label);
}

function companyPeriodRows(projects) {
  const byCompany = {};
  projects.forEach(p => {
    const periods = allProjectPeriods(p);
    if (!periods.length) return;
    const c = p.company || 'Unknown';
    (byCompany[c] ||= []).push(...periods.map(period => ({ project: p, period })));
  });
  return byCompany;
}

export function getPeriodsByCompanyBucket(projects, label) {
  const byCompany = companyPeriodRows(projects);
  if (label !== 'Other') return byCompany[label] || [];
  const counts = Object.fromEntries(Object.entries(byCompany).map(([c, rows]) => [c, rows.length]));
  const overflow = overflowKeys(counts);
  return Object.entries(byCompany).filter(([c]) => overflow.has(c)).flatMap(([, rows]) => rows);
}

// BAST completion % per company. The "Other" bucket (companies past the
// top-N cutoff) is a weighted billed/total ratio, not an average of
// percentages, so it stays a mathematically valid completion rate.
export function getCompanyBastCompletion(projects) {
  const byCompany = {};
  Object.entries(companyPeriodRows(projects)).forEach(([c, rows]) => {
    byCompany[c] = { billed: rows.filter(({ period }) => period.steps.every(Boolean)).length, total: rows.length };
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
