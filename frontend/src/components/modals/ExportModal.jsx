import Modal from '../ui/Modal';

export default function ExportModal({ open, onClose, onExport }) {
  return (
    <Modal open={open} onClose={onClose} title="Export to Excel">
      <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
        Choose which projects to include. The export will always contain all sheets
        (Projects, BAST Billing, CM Meetings, PM Meetings, Summary).
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-primary" style={{ width:'100%', padding:10, fontSize:13 }} onClick={() => { onExport('all'); onClose(); }}>
          📋 Export All Projects
        </button>
        <button className="btn btn-secondary" style={{ width:'100%', padding:10, fontSize:13 }} onClick={() => { onExport('filtered'); onClose(); }}>
          🔍 Export Filtered Only
        </button>
      </div>
    </Modal>
  );
}
