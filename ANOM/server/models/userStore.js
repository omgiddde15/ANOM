/**
 * models/userStore.js
 *
 * Cloudant-backed user store.
 * Exposes the same async interface as the previous in-memory version so
 * that no controller code needs to change.
 *
 * Cloudant document shape stored in "anom_users":
 * {
 *   _id        : string   (UUID v4  — Cloudant document id)
 *   _rev       : string   (managed by Cloudant)
 *   type       : "user"   (allows future multi-type databases)
 *   name       : string
 *   email      : string   (lower-cased, unique via Mango index)
 *   password   : string   (bcrypt hash — never returned to callers)
 *   createdAt  : string   (ISO-8601)
 * }
 */

const { randomUUID } = require('crypto');
const { cloudant, DB_NAME } = require('../config/cloudant');

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create and persist a new user document.
 * @param {{ username: string, email: string, password: string }} data
 * @returns {Promise<Object>} The stored user (without password).
 */
async function createUser(data) {
  const id = randomUUID();
  const doc = {
    _id: id,
    type: 'user',
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password,          // already bcrypt-hashed by the controller
    createdAt: new Date().toISOString(),
  };

  await cloudant.putDocument({ db: DB_NAME, docId: id, document: doc });

  // Return the public view (no _rev, no password)
  return _sanitize(doc);
}

/**
 * Find a user by email (case-insensitive).
 * Returns the FULL document including the hashed password so the login
 * controller can call bcrypt.compare().
 * Returns null when not found.
 */
async function findByEmail(email) {
  const lower = email.toLowerCase();

  const result = await cloudant.postFind({
    db: DB_NAME,
    selector: { type: 'user', email: lower },
    fields: ['_id', 'name', 'email', 'password', 'createdAt'],
    limit: 1,
  });

  if (!result.result.docs || result.result.docs.length === 0) return null;

  const doc = result.result.docs[0];
  // Remap _id → id; keep password so login controller can call bcrypt.compare()
  // eslint-disable-next-line no-unused-vars
  const { _id, _rev, ...rest } = doc;
  return { id: _id, ...rest };
}

/**
 * Find a user by Cloudant document id.
 * Returns the document without the password.
 * Returns null when not found.
 */
async function findById(id) {
  let doc;
  try {
    const response = await cloudant.getDocument({ db: DB_NAME, docId: id });
    doc = response.result;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }

  return _sanitize({ id: doc._id, ...doc });
}

/** Keep the canonical authentication identity in sync with profile edits. */
async function updateUserIdentity(id, { name, email }) {
  const response = await cloudant.getDocument({ db: DB_NAME, docId: id });
  const existing = response.result;
  const normalizedEmail = email.toLowerCase();

  if (normalizedEmail !== existing.email) {
    const emailOwner = await findByEmail(normalizedEmail);
    if (emailOwner && emailOwner.id !== id) {
      const error = new Error('Email already registered.');
      error.status = 409;
      throw error;
    }
  }

  const document = { ...existing, name, email: normalizedEmail };
  await cloudant.putDocument({ db: DB_NAME, docId: id, document });
  return _sanitize({ id, ...document });
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Strip Cloudant internals and the password hash before returning
 * a document to callers.
 */
function _sanitize(doc) {
  // eslint-disable-next-line no-unused-vars
  const { _id, _rev, password, type, ...safe } = doc;
  // Preserve the mapped `id` field (set by callers before passing in)
  return { id: doc._id ?? doc.id, ...safe };
}

module.exports = { createUser, findByEmail, findById, updateUserIdentity };
