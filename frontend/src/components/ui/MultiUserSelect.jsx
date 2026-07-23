import { useState, useRef, useEffect, useMemo } from 'react';

export default function MultiUserSelect({ users, selectedIds, onChange }) {
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

  const toggle = id => {
    const set = new Set(selectedIds);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange([...set]);
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => u.username.toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q));
  }, [users, query]);

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));
  const summary = selectedUsers.length ? selectedUsers.map(u => u.username).join(', ') : '— Select user(s) —';

  return (
    <div className="multi-select" ref={wrapRef}>
      <button
        type="button"
        className={`multi-select-trigger${selectedUsers.length ? '' : ' placeholder'}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="multi-select-summary">{summary}</span>
        <span className="multi-select-caret">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="multi-select-panel search-select-panel">
          {!!users.length && (
            <input
              ref={inputRef}
              type="text"
              className="search-select-input"
              placeholder="Search…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          )}
          <div className="search-select-options">
            {!users.length
              ? <div className="multi-user-empty">No users available</div>
              : !filteredUsers.length
              ? <div className="multi-user-empty">No matches</div>
              : filteredUsers.map(u => (
                <label key={u.id} className="multi-user-option">
                  <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggle(u.id)} />
                  <span>{u.username} <span className="multi-user-role">({u.role})</span></span>
                </label>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
