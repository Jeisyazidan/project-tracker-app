import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  getStatusCounts, getHandoverCounts, getExpiryBuckets, getProjectsByExpiryBucket,
  getBastSummary, getBastBottlenecks, getPeriodsByBillingBucket, getPeriodsByBottleneckStep,
  getRequestStatusCounts, getRequestsByStatus,
  getMonthlyTrend, getPicWorkload, getPicWorkloadRequests,
  getCompanyBreakdown, getProjectsByCompanyBucket,
  getCompanyBastCompletion, getPeriodsByCompanyBucket,
  getKpis,
} from '../utils/insights';
import {
  STATUS_COLOR_HUE, HANDOVER_COLOR_HUE, BAST_COLOR_HUE, REQUEST_STATUS_COLOR_HUE,
  EXPIRY_BUCKET_COLOR_HUE, hueColor, seriesColor,
} from '../utils/insightsColors';
import { STATUS_BADGE } from '../utils/badges';
import { formatDate } from '../utils/dates';
import { BAST_STEPS, stepsDoneLabel } from '../utils/bastPeriods';
import StatusDonut from '../components/insights/StatusDonut';
import SingleSeriesBar from '../components/insights/SingleSeriesBar';
import TrendLineChart from '../components/insights/TrendLineChart';
import InsightDetailPopup from '../components/insights/InsightDetailPopup';
import Badge from '../components/ui/Badge';

const EXPIRY_LABELS = { expired: 'Expired', within30: '≤ 30 days', within90: '≤ 90 days', beyond90: '> 90 days' };
const EXPIRY_KEY_BY_LABEL = Object.fromEntries(Object.entries(EXPIRY_LABELS).map(([k, l]) => [l, k]));
const periodRowKey = ({ project, period }) => `${project.id}-${period.label}`;

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
  const [detail, setDetail] = useState(null);

  const PROJECT_COLUMNS = [
    { header: 'PID', render: p => <span style={{ fontWeight:600, color:'var(--pid-color)', fontFamily:'monospace' }}>{p.pid}</span> },
    { header: 'Company', render: p => <span style={{ color:'var(--text-muted)' }}>{p.company}</span> },
    { header: 'Project Name', render: p => p.name },
    { header: 'Status', render: p => <Badge color={STATUS_BADGE[p.status] || 'gray'}>{p.status}</Badge> },
  ];

  const periodStatusCell = ({ period }) => {
    const label = stepsDoneLabel(period.steps);
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background: hueColor(BAST_COLOR_HUE[label], dark), flexShrink:0 }} />
        {label}
      </span>
    );
  };
  const PERIOD_COLUMNS = [
    { header: 'PID', render: ({ project }) => <span style={{ fontWeight:600, color:'var(--pid-color)', fontFamily:'monospace' }}>{project.pid}</span> },
    { header: 'Company', render: ({ project }) => <span style={{ color:'var(--text-muted)' }}>{project.company}</span> },
    { header: 'Period', render: ({ period }) => period.label },
    { header: 'Deadline', render: ({ period }) => formatDate(period.submit_deadline || period.end) },
    { header: 'Status', render: periodStatusCell },
  ];

  const requestStatusCell = r => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background: hueColor(REQUEST_STATUS_COLOR_HUE[r.status || 'Open'], dark), flexShrink:0 }} />
      {r.status || 'Open'}
    </span>
  );
  const REQUEST_COLUMNS = [
    { header: 'PID', render: r => <span style={{ fontWeight:600, color:'var(--pid-color)', fontFamily:'monospace' }}>{r.pid}</span> },
    { header: 'Company', render: r => <span style={{ color:'var(--text-muted)' }}>{r.company}</span> },
    { header: 'Title', render: r => r.title || '—' },
    { header: 'PIC', render: r => r.pic_utama || '—' },
    { header: 'Status', render: requestStatusCell },
  ];
  const WORKLOAD_COLUMNS = [{ header: 'Type', render: r => r.requestType }, ...REQUEST_COLUMNS];

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
          <StatusDonut
            title="Status Breakdown" data={statusData} dark={dark}
            onSliceClick={entry => setDetail({
              title: `Status: ${entry.label}`, rows: projects.filter(p => p.status === entry.label),
              columns: PROJECT_COLUMNS, rowKey: p => p.id,
            })}
          />
          <StatusDonut
            title="Handover Progress" data={handoverData} dark={dark}
            onSliceClick={entry => setDetail({
              title: `Handover: ${entry.label}`, rows: projects.filter(p => (p.handover_status || 'Not Started') === entry.label),
              columns: PROJECT_COLUMNS, rowKey: p => p.id,
            })}
          />
          <SingleSeriesBar
            title="Contract Expiry Timeline" data={expiryData} dark={dark}
            onBarClick={entry => setDetail({
              title: `Contract Expiry: ${entry.label}`, rows: getProjectsByExpiryBucket(projects, EXPIRY_KEY_BY_LABEL[entry.label]),
              columns: PROJECT_COLUMNS, rowKey: p => p.id,
            })}
          />
        </div>
      </div>

      <div className="reminder-section">
        <h3>BAST Billing</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <StatusDonut
            title="Billing Completion" data={bastData} dark={dark}
            onSliceClick={entry => setDetail({
              title: `BAST: ${entry.label}`, rows: getPeriodsByBillingBucket(projects, entry.label),
              columns: PERIOD_COLUMNS, rowKey: periodRowKey,
            })}
          />
          <SingleSeriesBar
            title="Step Bottleneck (not-yet-billed periods)" data={bottleneckData} color={flatBlue} dark={dark} horizontal
            onBarClick={entry => setDetail({
              title: `Bottleneck: ${entry.label}`, rows: getPeriodsByBottleneckStep(projects, BAST_STEPS.indexOf(entry.label)),
              columns: PERIOD_COLUMNS, rowKey: periodRowKey,
            })}
          />
        </div>
      </div>

      <div className="reminder-section">
        <h3>CM/PM Activity &amp; Workload</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <StatusDonut
            title="CM Status" data={cmStatusData} dark={dark}
            onSliceClick={entry => setDetail({
              title: `CM Status: ${entry.label}`, rows: getRequestsByStatus(cmRequests, entry.label),
              columns: REQUEST_COLUMNS, rowKey: r => r.id,
            })}
          />
          <StatusDonut
            title="PM Status" data={pmStatusData} dark={dark}
            onSliceClick={entry => setDetail({
              title: `PM Status: ${entry.label}`, rows: getRequestsByStatus(pmRequests, entry.label),
              columns: REQUEST_COLUMNS, rowKey: r => r.id,
            })}
          />
          <TrendLineChart title="Requests Created (last 6 months)" data={trendData} cmColor={flatBlue} pmColor={flatGreen} dark={dark} />
          <SingleSeriesBar
            title="Active Workload per PIC" data={workloadData} color={flatBlue} dark={dark}
            onBarClick={entry => setDetail({
              title: `Workload: ${entry.label}`, rows: getPicWorkloadRequests(cmRequests, pmRequests, usersList, entry.label),
              columns: WORKLOAD_COLUMNS, rowKey: r => `${r.requestType}-${r.id}`,
            })}
          />
        </div>
      </div>

      <div className="reminder-section">
        <h3>Client / Company Breakdown</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <SingleSeriesBar
            title="Projects per Company" data={companyData} color={flatBlue} dark={dark} horizontal
            onBarClick={entry => setDetail({
              title: `Company: ${entry.label}`, rows: getProjectsByCompanyBucket(projects, entry.label),
              columns: PROJECT_COLUMNS, rowKey: p => p.id,
            })}
          />
          <SingleSeriesBar
            title="BAST Completion per Company" data={companyBastData} color={flatGreen} dark={dark} horizontal valueSuffix="%"
            onBarClick={entry => setDetail({
              title: `BAST Completion: ${entry.label}`, rows: getPeriodsByCompanyBucket(projects, entry.label),
              columns: PERIOD_COLUMNS, rowKey: periodRowKey,
            })}
          />
        </div>
      </div>

      {detail && <InsightDetailPopup {...detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
