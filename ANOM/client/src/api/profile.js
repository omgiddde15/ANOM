/**
 * src/api/profile.js
 *
 * Axios wrappers for the profile endpoints.
 * The JWT is read from localStorage and attached as a Bearer token.
 */

import api from './client';

const EDITABLE_PROFILE_FIELDS = [
  'name',
  'email',
  'city',
  'profession',
  'bio',
  'interests',
  'maritalStatus',
  'photoUrl',
  'profileImageUrl',
  'relationshipGoal',
  'age',
  'gender',
  'location',
];

export function pickEditableProfileFields(profile = {}) {
  return EDITABLE_PROFILE_FIELDS.reduce((payload, field) => {
    if (profile[field] !== undefined && profile[field] !== null) {
      payload[field] = profile[field];
    }
    return payload;
  }, {});
}

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
