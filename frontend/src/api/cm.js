import client from './client';

export const getCmRequests  = ()        => client.get('/cm').then(r => r.data);
export const createCm       = data      => client.post('/cm', data).then(r => r.data);
export const updateCm       = (id,data) => client.put(`/cm/${id}`, data).then(r => r.data);
export const deleteCm       = id        => client.delete(`/cm/${id}`).then(r => r.data);
