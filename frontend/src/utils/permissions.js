export const ALL_PERMISSIONS = [
  { key:'view_projects',  label:'View Projects',      desc:'See the Project Overview tab' },
  { key:'add_project',    label:'Add Project',         desc:'Create new projects' },
  { key:'edit_project',   label:'Edit Project',        desc:'Modify existing project details' },
  { key:'delete_project', label:'Delete Project',      desc:'Remove projects permanently' },
  { key:'view_reminders', label:'View Reminders',      desc:'See the Reminders tab' },
  { key:'view_bast',      label:'View BAST Billing',   desc:'See BAST Billing tab' },
  { key:'edit_bast',      label:'Edit BAST',           desc:'Update BAST steps and status' },
  { key:'view_cm',        label:'View CM Meetings',    desc:'See CM Meetings tab' },
  { key:'manage_cm',      label:'Manage CM Requests',  desc:'Add, edit, delete CM requests' },
  { key:'view_pm',        label:'View PM Meetings',    desc:'See PM Meetings tab' },
  { key:'manage_pm',      label:'Manage PM Requests',  desc:'Add, edit, delete PM requests' },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  pm:               { view_projects:true,  add_project:true,  edit_project:true,  delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:false, view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  om:               { view_projects:true,  add_project:true,  edit_project:true,  delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:false, view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  system_engineer:  { view_projects:true,  add_project:false, edit_project:false, delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:true,  view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  dba:              { view_projects:true,  add_project:false, edit_project:false, delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:true,  view_cm:true,  manage_cm:true,  view_pm:true,  manage_pm:true  },
  technical_writer: { view_projects:true,  add_project:false, edit_project:false, delete_project:false, view_reminders:true,  view_bast:true,  edit_bast:false, view_cm:true,  manage_cm:false, view_pm:true,  manage_pm:false },
};

export function can(user, permKey, rolePermsMap) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const perms = (rolePermsMap && rolePermsMap[user.role])
    || DEFAULT_ROLE_PERMISSIONS[user.role]
    || {};
  return !!perms[permKey];
}
