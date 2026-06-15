import client from './client';

export const getPmRequests  = ()        => client.get('/pm').then(r => r.data);
export const createPm       = data      => client.post('/pm', data).then(r => r.data);
export const updatePm       = (id,data) => client.put(`/pm/${id}`, data).then(r => r.data);
export const deletePm       = id        => client.delete(`/pm/${id}`).then(r => r.data);
