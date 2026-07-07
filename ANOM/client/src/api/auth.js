/**
 * src/api/auth.js
 *
 * Thin axios wrappers for every auth endpoint.
 * All calls go through the Vite dev-server proxy → http://localhost:5000
 * so no hard-coded base URL leaks into the bundle.
 */

import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/**
 * POST /api/auth/signup
 * @param {{ name: string, email: string, password: string }} data
 */
export async function signup(data) {
  const res = await api.post('/auth/signup', data);
  return res.data; // { success, message, token, user }
}

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} data
 */
export async function login(data) {
  const res = await api.post('/auth/login', data);
  return res.data; // { success, message, token, user }
}
