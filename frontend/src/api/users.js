import client from './client';

export const getUsers       = ()        => client.get('/users').then(r => r.data);
export const createUser     = data      => client.post('/users', data).then(r => r.data);
export const deleteUser     = id        => client.delete(`/users/${id}`).then(r => r.data);
export const changePassword = (id,pass) => client.put(`/users/${id}/password`, { password: pass }).then(r => r.data);
