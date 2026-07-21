import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chromeColor } from '../../utils/insightsColors';

// 2-line monthly trend (CM vs PM requests created). Two series always ships
// with a legend — the dependable identity channel, never color-matching alone.
export default function TrendLineChart({ title, data, cmColor, pmColor, dark }) {
  const mutedText = chromeColor('mutedText', dark);
  const grid = chromeColor('grid', dark);
  const axis = chromeColor('axis', dark);
  const hasData = data.some(d => d.cm > 0 || d.pm > 0);

  return (
    <div style={{ flex: '1 1 420px', minWidth: 320 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
      {!hasData ? (
        <div style={{ fontSize: 12, color: mutedText, padding: '32px 0', textAlign: 'center' }}>No requests created in this window yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="label" stroke={axis} tick={{ fill: mutedText, fontSize: 10 }} />
            <YAxis stroke={axis} tick={{ fill: mutedText, fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="cm" name="CM" stroke={cmColor} strokeWidth={2} dot={{ r: 4, fill: cmColor, strokeWidth: 2, stroke: 'var(--surface)' }} />
            <Line type="monotone" dataKey="pm" name="PM" stroke={pmColor} strokeWidth={2} dot={{ r: 4, fill: pmColor, strokeWidth: 2, stroke: 'var(--surface)' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
