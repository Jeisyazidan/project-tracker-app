import client from './client';

export const getReminderLogs = () =>
  client.get('/reminders/logs').then(r => r.data);

export const triggerReminders = () =>
  client.post('/reminders/run').then(r => r.data);

export const getReminderSettings = () =>
  client.get('/reminders/settings').then(r => r.data);

export const updateReminderSettings = settings =>
  client.put('/reminders/settings', settings).then(r => r.data);
