import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_LABEL } from '../../utils/badges';

export default function Header({ projectCount, companyCount, onUsersClick }) {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();

  return (
    <div className="header">
      <div>
        <h1>📋 Project Tracker</h1>
        <div className="subtitle">
          {projectCount} PIDs · {companyCount} Companies
        </div>
      </div>
      <div className="header-right">
        <span className="header-date" style={{ fontSize: 11, opacity: 0.8 }}>
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </span>
        {user && (
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 12, fontWeight: 600 }}>
            👤 {user.username} ({ROLE_LABEL[user.role] || user.role})
          </span>
        )}
        {user?.role === 'admin' && (
          <button
            onClick={onUsersClick}
            style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
          >
            👥 Users
          </button>
        )}
        <button
          onClick={toggleTheme}
          title="Toggle dark/light mode"
          style={{ fontSize: 14, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 9px', borderRadius: 6, cursor: 'pointer', lineHeight: 1 }}
        >
          {dark ? '☀️' : '🌙'}
        </button>
        <button
          onClick={logout}
          style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
