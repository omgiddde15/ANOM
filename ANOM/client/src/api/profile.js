/**
 * src/api/profile.js
 *
 * Axios wrappers for the profile endpoints.
 * The JWT is read from localStorage and attached as a Bearer token.
 */

import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT to every request from this module.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('anom_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** GET /api/profile */
export async function getProfile() {
  const res = await api.get('/profile');
  return res.data; // { success, profile }
}

/** PUT /api/profile */
export async function updateProfile(data) {
  const res = await api.put('/profile', data);
  return res.data; // { success, message, profile }
}
