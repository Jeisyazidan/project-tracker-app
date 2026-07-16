export default function MultiUserSelect({ users, selectedIds, onChange }) {
  const toggle = id => {
    const set = new Set(selectedIds);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange([...set]);
  };

  return (
    <div className="multi-user-select">
      {!users.length
        ? <div className="multi-user-empty">No users available</div>
        : users.map(u => (
          <label key={u.id} className="multi-user-option">
            <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggle(u.id)} />
            <span>{u.username} <span className="multi-user-role">({u.role})</span></span>
          </label>
        ))
      }
    </div>
  );
}
