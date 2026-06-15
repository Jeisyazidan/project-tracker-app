export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { width: 700 } : undefined}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
