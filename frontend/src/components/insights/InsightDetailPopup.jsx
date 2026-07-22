export default function InsightDetailPopup({
  title, subtitle, columns, rows, rowKey, emptyMessage = 'No records in this category', width = 720, onClose,
}) {
  if (!title) return null;

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:'var(--surface)', borderRadius:12, width, maxWidth:'95vw', maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 12px 40px rgba(0,0,0,0.2)', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{title}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {subtitle || `${rows.length} record${rows.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--text-subtle)', padding:'4px 8px', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {columns.map(col => (
                  <th key={col.header} style={{ padding:'9px 10px', textAlign:'left', fontSize:11, color:'var(--text-subtle)', fontWeight:600, textTransform:'uppercase' }}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding:20, textAlign:'center', color:'var(--text-light)' }}>{emptyMessage}</td></tr>
              ) : rows.map(row => (
                <tr key={rowKey(row)} style={{ borderBottom:'1px solid var(--border2)' }}>
                  {columns.map(col => (
                    <td key={col.header} style={{ padding:'8px 10px', fontSize:13 }}>{col.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
