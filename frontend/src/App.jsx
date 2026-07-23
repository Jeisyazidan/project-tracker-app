import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth }  from './context/AuthContext';
import LoginPage    from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import RemindersPage from './pages/RemindersPage';
import BastPage      from './pages/BastPage';
import CmPage        from './pages/CmPage';
import PmPage        from './pages/PmPage';
import InsightsPage from './pages/InsightsPage';
import AccessControlPage from './pages/AccessControlPage';
import ReminderSettingsPage from './pages/ReminderSettingsPage';
import Header      from './components/layout/Header';
import SummaryBar  from './components/layout/SummaryBar';
import Tabs        from './components/layout/Tabs';
import Toolbar     from './components/layout/Toolbar';
import StatPopup   from './components/modals/StatPopup';
import ProjectModal from './components/modals/ProjectModal';
import UserMgmtModal from './components/modals/UserMgmtModal';
import ExportModal  from './components/modals/ExportModal';
import Modal        from './components/ui/Modal';
import { getProjects, createProject, updateProject, deleteProject } from './api/projects';
import { getCmRequests } from './api/cm';
import { getPmRequests } from './api/pm';
import { getUsersList }  from './api/users';
import { runExport }     from './utils/export';

export default function App() {
  const { user, loading } = useAuth();

  const [projects,   setProjects]   = useState([]);
  const [cmRequests, setCmRequests] = useState([]);
  const [pmRequests, setPmRequests] = useState([]);
  const [usersList,  setUsersList]  = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [tab,           setTab]           = useState('dashboard');
  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterAdmin,   setFilterAdmin]   = useState('');
  const [filterPM,      setFilterPM]      = useState('');
  const [filterOM,      setFilterOM]      = useState('');

  const [statFilter,   setStatFilter]  = useState(null);
  const [projectModal, setProjectModal] = useState({ open:false, project:null });
  const [userModal,    setUserModal]    = useState(false);
  const [exportModal,  setExportModal]  = useState(false);
  const [issueModal,   setIssueModal]   = useState({ open:false, project:null });
  const [requestModal, setRequestModal] = useState({ open:false, type:null, project:null });

  // silent=true skips the full-screen "Loading data…" state, which would
  // otherwise unmount the current tab (and any local UI state, e.g. expanded
  // BAST period cards) on every small in-place update.
  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setDataLoading(true);
    try {
      const [ps, cms, pms, ul] = await Promise.all([getProjects(), getCmRequests(), getPmRequests(), getUsersList()]);
      setProjects(ps);
      setCmRequests(cms);
      setPmRequests(pms);
      setUsersList(ul);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, []);

  const refreshSilently = useCallback(() => loadAll({ silent: true }), [loadAll]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p =>
      (!q || p.pid.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) &&
      (!filterStatus  || p.status === filterStatus) &&
      (!filterCompany || p.company === filterCompany) &&
      (!filterAdmin   || p.project_admin === filterAdmin) &&
      (!filterPM      || p.project_manager === filterPM) &&
      (!filterOM      || p.operation_manager === filterOM)
    );
  }, [projects, search, filterStatus, filterCompany, filterAdmin, filterPM, filterOM]);

  const companies = useMemo(() => [...new Set(projects.map(p => p.company))].sort(), [projects]);
  const admins    = useMemo(() => [...new Set(projects.map(p => p.project_admin).filter(Boolean))].sort(), [projects]);
  const pms       = useMemo(() => [...new Set(projects.map(p => p.project_manager).filter(Boolean))].sort(), [projects]);
  const oms       = useMemo(() => [...new Set(projects.map(p => p.operation_manager).filter(Boolean))].sort(), [projects]);

  const filteredCm = useMemo(() => {
    const q = search.toLowerCase();
    const pids = new Set(filtered.map(p => p.id));
    return cmRequests.filter(c =>
      pids.has(c.project_id) &&
      (!filterCompany || c.company === filterCompany) &&
      (!q || c.pid?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.project_name?.toLowerCase().includes(q))
    );
  }, [cmRequests, filtered, search, filterCompany]);

  const filteredPm = useMemo(() => {
    const q = search.toLowerCase();
    const pids = new Set(filtered.map(p => p.id));
    return pmRequests.filter(r =>
      pids.has(r.project_id) &&
      (!filterCompany || r.company === filterCompany) &&
      (!q || r.pid?.toLowerCase().includes(q) || r.company?.toLowerCase().includes(q) || r.project_name?.toLowerCase().includes(q))
    );
  }, [pmRequests, filtered, search, filterCompany]);

  const handleSaveProject = async (form) => {
    if (projectModal.project) {
      const updated = await updateProject(projectModal.project.id, form);
      setProjects(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    } else {
      await createProject(form);
      await loadAll();
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project? This will also delete all related BAST, CM, and PM records.')) return;
    await deleteProject(id);
    setProjects(ps => ps.filter(p => p.id !== id));
  };

  const handleNavigateFromReminder = useCallback((item) => {
    if (item.tab === 'cm' || item.tab === 'pm') {
      setSearch(item.pid);
      setFilterStatus(''); setFilterAdmin(''); setFilterPM(''); setFilterOM('');
    } else {
      setSearch('');
    }
    setTab(item.tab);
    setTimeout(() => {
      const el = document.getElementById(`bast-project-${item.projectId}`) || document.getElementById(`project-row-${item.projectId}`);
      if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.style.outline='2px solid #3b82f6'; el.style.borderRadius='8px'; setTimeout(() => { el.style.outline=''; }, 2000); }
    }, 120);
  }, []);

  const handleTabChange = (t) => {
    if (['cm', 'pm', 'reminders'].includes(t)) {
      setFilterStatus(''); setFilterAdmin(''); setFilterPM(''); setFilterOM('');
    }
    setTab(t);
  };

  const handleExport = (scope) => {
    runExport(projects, cmRequests, pmRequests, scope, scope === 'filtered' ? (p => filtered.includes(p)) : null);
  };

  if (loading) {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-muted)' }}>Loading…</div>;
  }
  if (!user) return <LoginPage />;

  return (
    <div>
      <div className="sticky-chrome">
        <Header
          projectCount={projects.length}
          companyCount={new Set(projects.map(p => p.company)).size}
          onUsersClick={() => setUserModal(true)}
        />
        <Tabs active={tab} onChange={handleTabChange} />
      </div>
      {tab === 'projects' && <SummaryBar projects={projects} onStatClick={f => setStatFilter(f)} />}
      {!['dashboard', 'access', 'reminderSettings', 'insights'].includes(tab) && (
        <Toolbar
          search={search} onSearch={setSearch}
          filterStatus={filterStatus} onFilterStatus={setFilterStatus}
          filterCompany={filterCompany} onFilterCompany={setFilterCompany}
          filterAdmin={filterAdmin} onFilterAdmin={setFilterAdmin}
          filterPM={filterPM} onFilterPM={setFilterPM}
          filterOM={filterOM} onFilterOM={setFilterOM}
          companies={companies} admins={admins} pms={pms} oms={oms}
          onExport={() => setExportModal(true)}
          onAddProject={() => setProjectModal({ open:true, project:null })}
          showStatus={!['cm', 'pm', 'reminders'].includes(tab)}
          showAdmin={!['cm', 'pm', 'reminders'].includes(tab)}
          showPM={!['cm', 'pm', 'reminders'].includes(tab)}
          showOM={!['cm', 'pm', 'reminders'].includes(tab)}
        />
      )}
      <div className="content">
        {dataLoading ? (
          <div className="empty-state"><div className="icon" style={{ fontSize:28 }}>⏳</div><div>Loading data…</div></div>
        ) : (
          <>
            {tab === 'dashboard' && <DashboardPage users={usersList} />}
            {tab === 'projects' && (
              <ProjectsPage
                projects={filtered}
                users={usersList}
                onEdit={p => setProjectModal({ open:true, project:p })}
                onDelete={handleDeleteProject}
                onShowCm={p => setRequestModal({ open:true, type:'cm', project:p })}
                onShowPm={p => setRequestModal({ open:true, type:'pm', project:p })}
                onShowIssues={p => setIssueModal({ open:true, project:p })}
              />
            )}
            {tab === 'reminders' && (
              <RemindersPage projects={filtered} cmRequests={filteredCm} pmRequests={filteredPm} onNavigate={handleNavigateFromReminder} />
            )}
            {tab === 'bast' && (
              <BastPage projects={filtered} onProjectEdit={p => setProjectModal({ open:true, project:p })} onRefresh={refreshSilently} />
            )}
            {tab === 'cm' && (
              <CmPage requests={filteredCm} projects={projects} users={usersList} onRefresh={refreshSilently} />
            )}
            {tab === 'pm' && (
              <PmPage requests={filteredPm} projects={projects} users={usersList} onRefresh={refreshSilently} />
            )}
            {tab === 'insights' && (
              <InsightsPage projects={projects} cmRequests={cmRequests} pmRequests={pmRequests} usersList={usersList} />
            )}
            {tab === 'access' && <AccessControlPage />}
            {tab === 'reminderSettings' && (
              <ReminderSettingsPage projects={projects} onRefresh={refreshSilently} />
            )}
          </>
        )}
      </div>

      {/* Project add/edit modal */}
      <ProjectModal
        open={projectModal.open}
        project={projectModal.project}
        users={usersList}
        onSave={handleSaveProject}
        onClose={() => setProjectModal({ open:false, project:null })}
      />

      {/* User management */}
      <UserMgmtModal open={userModal} onClose={() => setUserModal(false)} />

      {/* Export */}
      <ExportModal open={exportModal} onClose={() => setExportModal(false)} onExport={handleExport} />

      {/* Stat popup */}
      {statFilter && (
        <StatPopup filter={statFilter} projects={projects} onClose={() => setStatFilter(null)} />
      )}

      {/* Issue viewer */}
      <Modal open={issueModal.open} onClose={() => setIssueModal({ open:false, project:null })} title={`Issues — ${issueModal.project?.pid || ''}`}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {(issueModal.project?.issues || '').trim().split('\n').filter(Boolean).map((line, i) => (
            <div key={i} style={{ background:'var(--issue-bg)', border:'1px solid var(--issue-border)', borderRadius:8, padding:'10px 12px', fontSize:13 }}>
              {i + 1}. {line}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={() => setIssueModal({ open:false, project:null })}>Close</button>
        </div>
      </Modal>

      {/* CM/PM quick-view from projects tab */}
      <Modal open={requestModal.open} onClose={() => setRequestModal({ open:false, type:null, project:null })}
        title={`${requestModal.type === 'cm' ? 'CM' : 'PM'} Requests — ${requestModal.project?.pid || ''}`}>
        {requestModal.project && (() => {
          const list = (requestModal.type === 'cm' ? cmRequests : pmRequests).filter(r => r.project_id === requestModal.project.id);
          if (!list.length) return <p style={{ color:'var(--text-light)', padding:'20px 0', textAlign:'center' }}>No requests for this project.</p>;
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {list.map(r => {
                const isCm = requestModal.type === 'cm';
                const bg  = r.status==='Open'? (isCm?'#fee2e2':'#fff7ed') : r.status==='In Progress'? (isCm?'#fff7ed':'#fffbeb') : '#dcfce7';
                const col = r.status==='Open'? (isCm?'#dc2626':'#c2410c') : r.status==='In Progress'? (isCm?'#c2410c':'#a16207') : '#16a34a';
                return (
                  <div key={r.id} style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ display:'inline-block', padding:'2px 7px', borderRadius:10, fontSize:10, fontWeight:700, background:bg, color:col }}>{r.status}</span>
                      <span style={{ fontSize:11, color:'var(--text-subtle)' }}>{r.start_date}{r.start_time ? ' 🕐 ' + r.start_time : ''}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{r.title || '—'}</div>
                    {r.notes && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{r.notes}</div>}
                    {r.resolved_date && <div style={{ fontSize:11, color:'#16a34a', marginTop:4 }}>✓ Resolved: {r.resolved_date}</div>}
                  </div>
                );
              })}
            </div>
          );
        })()}
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={() => setRequestModal({ open:false, type:null, project:null })}>Close</button>
          <button className="btn btn-primary" onClick={() => { setRequestModal({ open:false, type:null, project:null }); setTab(requestModal.type); }}>
            Open {requestModal.type === 'cm' ? 'CM' : 'PM'} Tab
          </button>
        </div>
      </Modal>
    </div>
  );
}
