const db = require('../db');

const DEFAULT_ROLE_PERMISSIONS = {
  pm:               { view_projects:true,  add_project:true,  edit_project:true,  delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:false, view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  om:               { view_projects:true,  add_project:true,  edit_project:true,  delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:false, view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  system_engineer:  { view_projects:true,  add_project:false, edit_project:false, delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:true,  view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  dba:              { view_projects:true,  add_project:false, edit_project:false, delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:true,  view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  technical_writer: { view_projects:true,  add_project:false, edit_project:false, delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:false, view_cm:true,  manage_cm:false, view_pm:true,  manage_pm:false },
};

async function getRolePermissions(role) {
  if (role === 'admin') return null; // admin has all
  try {
    const { rows } = await db.query(
      'SELECT permissions FROM role_permissions WHERE role = $1', [role]
    );
    return rows[0]?.permissions || DEFAULT_ROLE_PERMISSIONS[role] || {};
  } catch {
    return DEFAULT_ROLE_PERMISSIONS[role] || {};
  }
}

function requirePermission(permKey) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role === 'admin') return next();
    const perms = await getRolePermissions(req.user.role);
    if (!perms[permKey]) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

module.exports = { requirePermission, getRolePermissions, DEFAULT_ROLE_PERMISSIONS };
