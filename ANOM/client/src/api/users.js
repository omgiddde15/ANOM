/**
 * src/api/users.js
 * Axios wrapper for the user discovery endpoint.
 */

import api from './client';

/** GET /api/users — returns all profiles except the current user's */
export async function getUsers() {
  const res = await api.get('/users');
  return res.data; // { success, users: [...] }
}
export async function getUser(id) {
  const res = await api.get(`/users/${encodeURIComponent(id)}`);
  return res.data;
}
export async function getDashboardAnalytics() {
  const res = await api.get('/users/analytics');
  return res.data;
}
