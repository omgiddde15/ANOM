/**
 * src/api/interests.js
 * Axios wrappers for all /api/interests endpoints.
 * JWT is auto-attached from localStorage.
 */

import api from './client';

/** POST /api/interests/send — { toUserId } */
export async function sendInterest(toUserId) {
  const res = await api.post('/interests/send', { toUserId });
  return res.data; // { success, created, matched, interest }
}

/** DELETE /api/interests/remove — { toUserId } */
export async function removeInterest(toUserId) {
  const res = await api.delete('/interests/remove', { data: { toUserId } });
  return res.data; // { success, removed }
}

/** GET /api/interests/sent */
export async function getSentInterests() {
  const res = await api.get('/interests/sent');
  return res.data; // { success, interests: [{ toUserId, status, ... }] }
}

/** GET /api/interests/received */
export async function getReceivedInterests() {
  const res = await api.get('/interests/received');
  return res.data; // { success, interests: [{ fromUserId, status, ... }] }
}

/** GET /api/interests/matches */
export async function getMatches() {
  const res = await api.get('/interests/matches');
  return res.data; // { success, matches: [{ matchedAt, profile }] }
}
