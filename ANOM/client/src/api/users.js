/**
 * src/api/users.js
 * Axios wrapper for the user discovery endpoint.
 */

import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('anom_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** GET /api/users — returns all profiles except the current user's */
export async function getUsers() {
  const res = await api.get('/users');
  return res.data; // { success, users: [...] }
}
