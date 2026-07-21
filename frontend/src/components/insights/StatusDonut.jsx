import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { chromeColor } from '../../utils/insightsColors';

// Donut + inline legend (label/count/%) for a ≤6-category status breakdown.
// The legend is the dependable identity channel (never rely on color alone),
// and doubles as the "table view" at this segment count.
export default function StatusDonut({ title, data, dark }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const segments = data.filter(d => d.value > 0);
  const mutedText = chromeColor('mutedText', dark);

  return (
    <div style={{ flex: '1 1 260px', minWidth: 240 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
      {!segments.length ? (
        <div style={{ fontSize: 12, color: mutedText, padding: '32px 0', textAlign: 'center' }}>No data yet.</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={segments} dataKey="value" nameKey="label" innerRadius={44} outerRadius={68} paddingAngle={segments.length > 1 ? 2 : 0} stroke="var(--surface)" strokeWidth={2}>
                {segments.map(d => <Cell key={d.label} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {segments.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text)', flex: 1 }}>{d.label}</span>
                <span style={{ color: mutedText, fontWeight: 600 }}>{d.value} ({Math.round((d.value / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
