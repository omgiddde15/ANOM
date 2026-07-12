/**
 * models/profileStore.js
 *
 * Cloudant-backed profile store.
 * Profiles live in the same "anom_users" database as user auth documents
 * but use type: "profile" so they are clearly partitioned by document type.
 *
 * Profile document shape:
 * {
 *   _id          : "profile:<userId>"   (deterministic — one profile per user)
 *   _rev         : string               (managed by Cloudant)
 *   type         : "profile"
 *   userId       : string               (matches the user's _id)
 *   name         : string
 *   email        : string               (read-only copy for display)
 *   city         : string
 *   bio          : string
 *   profession   : string
 *   maritalStatus: string               ('single'|'married'|'divorced'|'widowed'|'prefer_not')
 *   interests    : string[]             (multi-select tags)
 *   photoUrl         : string               (IBM Object Storage upload URL)
 *   profileImageUrl  : string               (user-supplied image URL fallback)
 *   updatedAt    : string               (ISO-8601)
 * }
 */

const { cloudant, DB_NAME } = require('../config/cloudant');

/** Deterministic document id — guarantees one profile per user. */
const profileId = (userId) => `profile:${userId}`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the profile for a given userId.
 * Returns null if not found.
 */
async function getProfile(userId) {
  try {
    const res = await cloudant.getDocument({
      db: DB_NAME,
      docId: profileId(userId),
    });
    return _sanitize(res.result);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Create or fully replace the profile for a given userId.
 * @param {string} userId
 * @param {object} data  – validated profile fields from the controller
 * @returns {Promise<object>} The saved profile (no Cloudant internals).
 */
async function upsertProfile(userId, data) {
  const docId = profileId(userId);

  // Fetch current _rev so Cloudant accepts the overwrite (required for PUT).
  let currentRev;
  try {
    const existing = await cloudant.getDocument({ db: DB_NAME, docId });
    currentRev = existing.result._rev;
  } catch (err) {
    if (err.status !== 404) throw err;
    // 404 → first-time create; no _rev needed.
  }

  const doc = {
    _id: docId,
    ...(currentRev ? { _rev: currentRev } : {}),
    type: 'profile',
    userId,
    name:          data.name          ?? '',
    email:         data.email         ?? '',
    city:          data.city          ?? '',
    bio:           data.bio           ?? '',
    profession:    data.profession    ?? '',
    maritalStatus: data.maritalStatus ?? '',
    interests:     Array.isArray(data.interests) ? data.interests : [],
    photoUrl:         data.photoUrl         ?? '',
    profileImageUrl:  data.profileImageUrl  ?? '',
    relationshipGoal: data.relationshipGoal ?? '',
    age:           data.age ?? null,
    gender:        data.gender ?? '',
    location:      data.location ?? '',
    updatedAt:     new Date().toISOString(),
  };

  await cloudant.putDocument({ db: DB_NAME, docId, document: doc });
  return _sanitize(doc);
}

/**
 * Fetch all profiles except the one belonging to excludeUserId.
 * Returns an array of public-safe profile objects for the discovery feed.
 * Field `photoUrl` is remapped to `profilePhotoUrl`; email is never returned.
 * Uses Cloudant postFind (Mango) — results are capped at 200.
 */
async function getAllProfiles(excludeUserId) {
  try {
    const result = await cloudant.postFind({
      db: DB_NAME,
      selector: {
        type: 'profile',
        userId: { '$ne': excludeUserId },
      },
      fields: [
        'userId', 'name', 'city', 'bio',
        'profession', 'interests', 'photoUrl', 'profileImageUrl',
      ],
      limit: 200,
    });

    return (result.result.docs ?? []).map(_sanitizePublic);
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return [];
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Strip Cloudant internals from a full profile document. */
function _sanitize(doc) {
  // eslint-disable-next-line no-unused-vars
  const { _id, _rev, type, ...safe } = doc;
  return safe;
}

/**
 * Public-safe projection for the discovery feed.
 * Remaps photoUrl → profilePhotoUrl; never exposes email or maritalStatus.
 */
function _sanitizePublic(doc) {
  return {
    id:             doc.userId       ?? '',
    name:           doc.name         ?? '',
    city:           doc.city         ?? '',
    bio:            doc.bio          ?? '',
    profession:     doc.profession   ?? '',
    interests:      Array.isArray(doc.interests) ? doc.interests : [],
    profilePhotoUrl: (doc.profileImageUrl || doc.photoUrl || '').trim(),
    profileImageUrl: (doc.profileImageUrl || '').trim(),
  };
}

module.exports = { getProfile, upsertProfile, getAllProfiles };
