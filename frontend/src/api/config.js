import client from './client';

export const getPermissions    = ()      => client.get('/config/permissions').then(r => r.data);
export const updatePermissions = perms   => client.put('/config/permissions', perms).then(r => r.data);
