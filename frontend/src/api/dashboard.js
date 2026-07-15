import client from './client';

export const getMyDashboard = (month, year) =>
  client.get('/dashboard/me', { params: { month, year } }).then(r => r.data);
