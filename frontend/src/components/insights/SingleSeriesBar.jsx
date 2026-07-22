import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chromeColor } from '../../utils/insightsColors';

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// Flat single-color bar chart for nominal-category magnitude comparisons
// (company counts, PIC workload, BAST step bottleneck, per-company
// completion %) — one series, one color, never a per-bar rainbow.
//
// Exception: when a chart's bars are *ordered severity bins* rather than
// nominal categories (e.g. the contract-expiry timeline: expired/soon/
// later/safe), pass per-item `color` in `data` instead of the `color` prop
// — that's the one case where varying bar color is meaningful, not noise.
export default function SingleSeriesBar({ title, data, color, dark, horizontal = false, valueSuffix = '', onBarClick }) {
  const perItemColor = data.length > 0 && data[0].color != null;
  const mutedText = chromeColor('mutedText', dark);
  const grid = chromeColor('grid', dark);
  const axis = chromeColor('axis', dark);
  const chartHeight = horizontal ? Math.max(160, data.length * 28) : 200;

  return (
    <div style={{ flex: '1 1 320px', minWidth: 280 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
      {!data.length ? (
        <div style={{ fontSize: 12, color: mutedText, padding: '32px 0', textAlign: 'center' }}>No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid stroke={grid} horizontal={!horizontal} vertical={horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" stroke={axis} tick={{ fill: mutedText, fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" stroke={axis} tick={{ fill: mutedText, fontSize: 10 }} width={190} tickFormatter={l => truncate(l, 26)} />
              </>
            ) : (
              <>
                <XAxis type="category" dataKey="label" stroke={axis} tick={{ fill: mutedText, fontSize: 10 }} interval={0} tickFormatter={l => truncate(l, 10)} />
                <YAxis type="number" stroke={axis} tick={{ fill: mutedText, fontSize: 10 }} allowDecimals={false} />
              </>
            )}
            <Tooltip
              formatter={value => [`${value}${valueSuffix}`, '']}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              cursor={{ fill: grid, opacity: 0.5 }}
            />
            <Bar
              dataKey="value" fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={22}
              onClick={onBarClick ? (_, index) => onBarClick(data[index]) : undefined}
              style={{ cursor: onBarClick ? 'pointer' : 'default' }}
            >
              {perItemColor && data.map(d => <Cell key={d.label} fill={d.color} style={{ cursor: onBarClick ? 'pointer' : 'default' }} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
