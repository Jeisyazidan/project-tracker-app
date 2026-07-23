import { useState, useRef, useEffect, useMemo } from 'react';

// Single-select dropdown with an in-panel search box, for fields backed by
// a potentially long option list (projects, users). Options: [{ value, label, sublabel }].
export default function SearchSelect({ options, value, onChange, placeholder = '— Select —', disabled = false }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q)
    );
  }, [options, query]);

  const pick = opt => { onChange(opt.value); setOpen(false); };

  return (
    <div className="multi-select" ref={wrapRef}>
      <button
        type="button"
        className={`multi-select-trigger${selected ? '' : ' placeholder'}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className="multi-select-summary">{selected ? selected.label : placeholder}</span>
        <span className="multi-select-caret">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="multi-select-panel search-select-panel">
          <input
            ref={inputRef}
            type="text"
            className="search-select-input"
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="search-select-options">
            {!filtered.length
              ? <div className="multi-user-empty">No matches</div>
              : filtered.map(o => (
                <div
                  key={o.value}
                  className={`multi-user-option${String(o.value) === String(value) ? ' selected' : ''}`}
                  onClick={() => pick(o)}
                >
                  <span>{o.label}{o.sublabel ? <span className="multi-user-role"> ({o.sublabel})</span> : null}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
