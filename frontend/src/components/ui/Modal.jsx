import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay show">
      <div className="modal" style={wide ? { width: 700 } : undefined}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
