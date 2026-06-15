export const STATUS_BADGE = {
  'On Track':                   'green',
  'In Progress - Minor Issues': 'amber',
  'In Progress - Major Issues': 'red',
  'Completed':                  'blue',
  'Not Started':                'gray',
};

export const HANDOVER_BADGE = {
  'Not Started':       'gray',
  'Transfer Knowledge':'amber',
  'Completed':         'blue',
};

export const BAST_BADGE = {
  'Not Started':'gray',
  'In Progress':'yellow',
  'Submitted':  'purple',
  'Completed':  'green',
};

export const ROLE_BADGE = {
  admin:            'blue',
  pm:               'purple',
  om:               'amber',
  system_engineer:  'green',
  dba:              'orange',
  technical_writer: 'gray',
};

export const ROLE_LABEL = {
  admin:            'Admin',
  pm:               'PM',
  om:               'OM',
  system_engineer:  'System Engineer',
  dba:              'DBA',
  technical_writer: 'Technical Writer',
};

export function statusBadgeClass(status) {
  return `badge badge-${STATUS_BADGE[status] || 'gray'}`;
}

export function roleBadgeClass(role) {
  return `badge badge-${ROLE_BADGE[role] || 'gray'}`;
}
