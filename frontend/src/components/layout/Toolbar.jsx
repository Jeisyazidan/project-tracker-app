import { useAuth } from '../../context/AuthContext';

export default function Toolbar({
  search, onSearch,
  filterStatus, onFilterStatus,
  filterCompany, onFilterCompany,
  filterAdmin, onFilterAdmin,
  filterPM, onFilterPM,
  filterOM, onFilterOM,
  companies, admins, pms, oms,
  onExport, onAddProject,
}) {
  const { can } = useAuth();

  return (
    <div className="toolbar">
      <input
        type="text"
        placeholder="🔍  Search PID / project / company..."
        value={search}
        onChange={e => onSearch(e.target.value)}
      />
      <select value={filterStatus} onChange={e => onFilterStatus(e.target.value)}>
        <option value="">All Status</option>
        <option value="On Track">On Track</option>
        <option value="In Progress - Minor Issues">In Progress - Minor Issues</option>
        <option value="In Progress - Major Issues">In Progress - Major Issues</option>
        <option value="Completed">Completed</option>
        <option value="Not Started">Not Started</option>
      </select>
      <select value={filterCompany} onChange={e => onFilterCompany(e.target.value)}>
        <option value="">All Companies</option>
        {companies.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filterAdmin} onChange={e => onFilterAdmin(e.target.value)}>
        <option value="">All Project Admins</option>
        {admins.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={filterPM} onChange={e => onFilterPM(e.target.value)}>
        <option value="">All Project Managers</option>
        {pms.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={filterOM} onChange={e => onFilterOM(e.target.value)}>
        <option value="">All Operation Managers</option>
        {oms.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="toolbar-spacer" />
      <button className="btn btn-secondary" onClick={onExport}>⬇ Export</button>
      {can('add_project') && (
        <button className="btn btn-primary" onClick={onAddProject}>+ Add Project</button>
      )}
    </div>
  );
}
