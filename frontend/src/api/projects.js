import client from './client';

export const getProjects    = ()        => client.get('/projects').then(r => r.data);
export const createProject  = data      => client.post('/projects', data).then(r => r.data);
export const updateProject  = (id,data) => client.put(`/projects/${id}`, data).then(r => r.data);
export const deleteProject  = id        => client.delete(`/projects/${id}`).then(r => r.data);
