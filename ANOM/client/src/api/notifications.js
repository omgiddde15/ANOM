import api from './client';

export async function getNotifications() {
  const res = await api.get('/notifications');
  return res.data;
}

export async function getUnreadCount() {
  const res = await api.get('/notifications/unread-count');
  return res.data;
}

export async function markAsRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllAsRead() {
  const res = await api.patch('/notifications/mark-all-read');
  return res.data;
}
