import { useAuth } from '../../context/AuthContext';

const TAB_LIST = [
  { key: 'dashboard', label: '📅 My Dashboard'                          },
  { key: 'projects',  label: 'Project Overview',  perm: 'view_projects'  },
  { key: 'reminders', label: '🔔 Reminders',       perm: 'view_reminders' },
  { key: 'bast',      label: '📄 BAST Billing',    perm: 'view_bast'      },
  { key: 'cm',        label: '🤝 CM Meetings',     perm: 'view_cm'        },
  { key: 'pm',        label: '🔧 PM Meetings',     perm: 'view_pm'        },
  { key: 'insights',  label: '📊 Insights',        perm: 'view_insights'  },
  { key: 'access',    label: '🔐 Access Control',  adminOnly: true        },
  { key: 'reminderSettings', label: '⚙️ Reminder Settings', adminOnly: true },
];

export default function Tabs({ active, onChange }) {
  const { can, user } = useAuth();

  return (
    <div className="tabs">
      {TAB_LIST.map(t => {
        if (t.adminOnly && user?.role !== 'admin') return null;
        if (t.perm && !can(t.perm)) return null;
        return (
          <button
            key={t.key}
            className={`tab${active === t.key ? ' active' : ''}`}
            onClick={() => onChange(t.key)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
