import { formatDate } from '../../utils/dates';

export default function ScheduleLine({ date, time, label }) {
  if (!date && !time) return null;
  return (
    <span style={{ display:'block', fontSize:12 }}>
      {label && <span style={{ fontSize:10, color:'var(--text-subtle)', marginRight:4 }}>{label}</span>}
      {formatDate(date)}{time ? <span style={{ color:'var(--text-subtle)' }}> 🕐 {time}</span> : ''}
    </span>
  );
}
