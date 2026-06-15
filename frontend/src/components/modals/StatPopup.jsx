import { STATUS_BADGE } from '../../utils/badges';
import Badge from '../ui/Badge';

const LABELS = {
  all:                          'All Projects',
  'On Track':                   '✅ On Track',
  'In Progress - Minor Issues': '⚠️ Minor Issues',
  'In Progress - Major Issues': '🔴 Major Issues',
  'Completed':                  '🔵 Completed',
  'Not Started':                '⬜ Not Started',
};

export default function StatPopup({ filter, projects, onClose }) {
  if (!filter) return null;
  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);
  const title = LABELS[filter] || filter;

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:'var(--surface)', borderRadius:12, width:680, maxWidth:'95vw', maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 12px 40px rgba(0,0,0,0.2)', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{title}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{filtered.length} project{filtered.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--text-subtle)', padding:'4px 8px', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                <th style={{ padding:'9px 10px', textAlign:'left', fontSize:11, color:'var(--text-subtle)', fontWeight:600, textTransform:'uppercase' }}>PID</th>
                <th style={{ padding:'9px 10px', textAlign:'left', fontSize:11, color:'var(--text-subtle)', fontWeight:600, textTransform:'uppercase' }}>Company</th>
                <th style={{ padding:'9px 10px', textAlign:'left', fontSize:11, color:'var(--text-subtle)', fontWeight:600, textTransform:'uppercase' }}>Project Name</th>
                <th style={{ padding:'9px 10px', textAlign:'left', fontSize:11, color:'var(--text-subtle)', fontWeight:600, textTransform:'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding:20, textAlign:'center', color:'var(--text-light)' }}>No projects in this category</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} style={{ borderBottom:'1px solid var(--border2)' }}>
                  <td style={{ padding:'8px 10px', fontWeight:600, color:'var(--pid-color)', fontFamily:'monospace' }}>{p.pid}</td>
                  <td style={{ padding:'8px 10px', color:'var(--text-muted)', fontSize:13 }}>{p.company}</td>
                  <td style={{ padding:'8px 10px', fontSize:13 }}>{p.name}</td>
                  <td style={{ padding:'8px 10px' }}><Badge color={STATUS_BADGE[p.status] || 'gray'}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
