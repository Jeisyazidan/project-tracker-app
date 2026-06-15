import client from './client';

export const getBastPeriods  = projectId          => client.get(`/bast/${projectId}`).then(r => r.data);
export const upsertPeriod    = (projectId, data)  => client.put(`/bast/${projectId}/period`, data).then(r => r.data);
export const createTermin    = (projectId, data)  => client.post(`/bast/${projectId}/termins`, data).then(r => r.data);
export const updateTermin    = (projectId,id,data)=> client.put(`/bast/${projectId}/termins/${id}`, data).then(r => r.data);
export const deleteTermin    = (projectId, id)    => client.delete(`/bast/${projectId}/termins/${id}`).then(r => r.data);
