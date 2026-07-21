import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  getStatusCounts, getHandoverCounts, getExpiryBuckets,
  getBastSummary, getBastBottlenecks, getRequestStatusCounts,
  getMonthlyTrend, getPicWorkload, getCompanyBreakdown, getCompanyBastCompletion,
  getKpis,
} from '../utils/insights';
import {
  STATUS_COLOR_HUE, HANDOVER_COLOR_HUE, BAST_COLOR_HUE, REQUEST_STATUS_COLOR_HUE,
  EXPIRY_BUCKET_COLOR_HUE, hueColor, seriesColor,
} from '../utils/insightsColors';
import { BAST_STEPS } from '../utils/bastPeriods';
import StatusDonut from '../components/insights/StatusDonut';
import SingleSeriesBar from '../components/insights/SingleSeriesBar';
import TrendLineChart from '../components/insights/TrendLineChart';

const EXPIRY_LABELS = { expired: 'Expired', within30: '≤ 30 days', within90: '≤ 90 days', beyond90: '> 90 days' };

function KpiRow({ kpis }) {
  return (
    <div className="summary-bar">
      <div className="stat-card blue">
        <div className="val">{kpis.activeProjects}</div>
        <div className="lbl">Active Projects</div>
      </div>
      <div className="stat-card amber">
        <div className="val">{kpis.activeRequests}</div>
        <div className="lbl">Active CM + PM</div>
      </div>
      <div className="stat-card green">
        <div className="val">{kpis.bastCompletionPct}%</div>
        <div className="lbl">BAST Completion</div>
      </div>
      <div className={`stat-card ${kpis.expiringSoon > 0 ? 'red' : 'gray'}`}>
        <div className="val">{kpis.expiringSoon}</div>
        <div className="lbl">Expiring ≤ 30d</div>
      </div>
    </div>
  );
}

export default function InsightsPage({ projects, cmRequests, pmRequests, usersList }) {
  const { dark } = useTheme();

  const kpis = useMemo(() => getKpis(projects, cmRequests, pmRequests), [projects, cmRequests, pmRequests]);

  const statusData = useMemo(() => {
    const counts = getStatusCounts(projects);
    return Object.entries(STATUS_COLOR_HUE).map(([label, hue]) => ({ label, value: counts[label] || 0, color: hueColor(hue, dark) }));
  }, [projects, dark]);

  const handoverData = useMemo(() => {
    const counts = getHandoverCounts(projects);
    return Object.entries(HANDOVER_COLOR_HUE).map(([label, hue]) => ({ label, value: counts[label] || 0, color: hueColor(hue, dark) }));
  }, [projects, dark]);

  const expiryData = useMemo(() => {
    const buckets = getExpiryBuckets(projects);
    return Object.entries(EXPIRY_LABELS).map(([key, label]) => ({
      label, value: buckets[key], color: hueColor(EXPIRY_BUCKET_COLOR_HUE[key], dark),
    }));
  }, [projects, dark]);

  const bastData = useMemo(() => {
    const s = getBastSummary(projects);
    return [
      { label: 'Billed', value: s.billed, color: hueColor(BAST_COLOR_HUE.Billed, dark) },
      { label: 'In Progress', value: s.inProgress, color: hueColor(BAST_COLOR_HUE['In Progress'], dark) },
      { label: 'Pending', value: s.pending, color: hueColor(BAST_COLOR_HUE.Pending, dark) },
    ];
  }, [projects, dark]);

  const bottleneckData = useMemo(() => {
    const counts = getBastBottlenecks(projects);
    return BAST_STEPS.map((label, i) => ({ label, value: counts[i] }));
  }, [projects]);

  const cmStatusData = useMemo(() => {
    const counts = getRequestStatusCounts(cmRequests);
    return Object.entries(REQUEST_STATUS_COLOR_HUE).map(([label, hue]) => ({ label, value: counts[label] || 0, color: hueColor(hue, dark) }));
  }, [cmRequests, dark]);

  const pmStatusData = useMemo(() => {
    const counts = getRequestStatusCounts(pmRequests);
    return Object.entries(REQUEST_STATUS_COLOR_HUE).map(([label, hue]) => ({ label, value: counts[label] || 0, color: hueColor(hue, dark) }));
  }, [pmRequests, dark]);

  const trendData = useMemo(() => getMonthlyTrend(cmRequests, pmRequests, 6), [cmRequests, pmRequests]);

  const workloadData = useMemo(() => getPicWorkload(cmRequests, pmRequests, usersList), [cmRequests, pmRequests, usersList]);

  const companyData = useMemo(() => getCompanyBreakdown(projects), [projects]);

  const companyBastData = useMemo(() => getCompanyBastCompletion(projects), [projects]);

  const flatBlue = seriesColor(0, dark);
  const flatGreen = seriesColor(1, dark);

  return (
    <div style={{ padding: '0 20px 24px' }}>
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <KpiRow kpis={kpis} />
      </div>

      <div className="reminder-section">
        <h3>Project Health</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <StatusDonut title="Status Breakdown" data={statusData} dark={dark} />
          <StatusDonut title="Handover Progress" data={handoverData} dark={dark} />
          <SingleSeriesBar title="Contract Expiry Timeline" data={expiryData} dark={dark} />
        </div>
      </div>

      <div className="reminder-section">
        <h3>BAST Billing</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <StatusDonut title="Billing Completion" data={bastData} dark={dark} />
          <SingleSeriesBar title="Step Bottleneck (not-yet-billed periods)" data={bottleneckData} color={flatBlue} dark={dark} horizontal />
        </div>
      </div>

      <div className="reminder-section">
        <h3>CM/PM Activity &amp; Workload</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <StatusDonut title="CM Status" data={cmStatusData} dark={dark} />
          <StatusDonut title="PM Status" data={pmStatusData} dark={dark} />
          <TrendLineChart title="Requests Created (last 6 months)" data={trendData} cmColor={flatBlue} pmColor={flatGreen} dark={dark} />
          <SingleSeriesBar title="Active Workload per PIC" data={workloadData} color={flatBlue} dark={dark} />
        </div>
      </div>

      <div className="reminder-section">
        <h3>Client / Company Breakdown</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <SingleSeriesBar title="Projects per Company" data={companyData} color={flatBlue} dark={dark} horizontal />
          <SingleSeriesBar title="BAST Completion per Company" data={companyBastData} color={flatGreen} dark={dark} horizontal valueSuffix="%" />
        </div>
      </div>
    </div>
  );
}
