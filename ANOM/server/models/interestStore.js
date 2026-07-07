/**
 * models/interestStore.js
 *
 * Cloudant-backed store for the "anom_interests" database.
 *
 * Interest document shape:
 * {
 *   _id        : "interest:<fromUserId>:<toUserId>"  (deterministic — prevents duplicates)
 *   _rev       : string   (Cloudant-managed)
 *   fromUserId : string
 *   toUserId   : string
 *   status     : "pending" | "matched"
 *   createdAt  : string  (ISO-8601)
 *   matchedAt  : string | null  (ISO-8601, set when mutual)
 * }
 *
 * Mutual-match rule:
 *   When A sends to B, we check if "interest:B:A" already exists.
 *   If yes → update BOTH documents to status:"matched" and record matchedAt.
 */

const { randomUUID } = require('crypto');          // used nowhere — kept for future doc IDs
const { cloudant, INTERESTS_DB } = require('../config/cloudant');

/** Deterministic doc id — one entry per ordered (from, to) pair. */
const interestDocId = (from, to) => `interest:${from}:${to}`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an interest from `fromUserId` to `toUserId`.
 * - Prevents self-interest.
 * - Prevents duplicates (returns existing doc if already sent).
 * - Auto-matches if the reverse interest already exists.
 * @returns {{ created: boolean, matched: boolean, doc: object }}
 */
async function sendInterest(fromUserId, toUserId) {
  if (fromUserId === toUserId) {
    throw Object.assign(new Error('Cannot send interest to yourself.'), { status: 400 });
  }

  const docId    = interestDocId(fromUserId, toUserId);
  const reverseId = interestDocId(toUserId, fromUserId);

  // ── Idempotency: already sent? ────────────────────────────────────────────
  let existing;
  try {
    const res = await cloudant.getDocument({ db: INTERESTS_DB, docId });
    existing = res.result;
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  if (existing) {
    return { created: false, matched: existing.status === 'matched', doc: _sanitize(existing) };
  }

  // ── Check for reverse interest (mutual match) ─────────────────────────────
  let reverseDoc;
  try {
    const res = await cloudant.getDocument({ db: INTERESTS_DB, docId: reverseId });
    reverseDoc = res.result;
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  const now = new Date().toISOString();
  const isMatch = !!(reverseDoc);
  const matchedAt = isMatch ? now : null;

  // ── Write new interest doc ─────────────────────────────────────────────────
  const newDoc = {
    _id: docId,
    fromUserId,
    toUserId,
    status:    isMatch ? 'matched' : 'pending',
    createdAt: now,
    matchedAt,
  };
  await cloudant.putDocument({ db: INTERESTS_DB, docId, document: newDoc });

  // ── If mutual, upgrade the reverse doc too ────────────────────────────────
  if (isMatch && reverseDoc) {
    const updatedReverse = {
      ...reverseDoc,
      status:    'matched',
      matchedAt,
    };
    await cloudant.putDocument({
      db: INTERESTS_DB,
      docId: reverseId,
      document: updatedReverse,
    });
  }

  return { created: true, matched: isMatch, doc: _sanitize(newDoc) };
}

/**
 * Remove a previously sent interest (and demote the reverse doc back to "pending" if matched).
 * Returns false if the interest didn't exist.
 */
async function removeInterest(fromUserId, toUserId) {
  const docId     = interestDocId(fromUserId, toUserId);
  const reverseId = interestDocId(toUserId, fromUserId);

  let existing;
  try {
    const res = await cloudant.getDocument({ db: INTERESTS_DB, docId });
    existing = res.result;
  } catch (err) {
    if (err.status === 404) return false;
    throw err;
  }

  // Delete the interest document.
  await cloudant.deleteDocument({
    db:    INTERESTS_DB,
    docId,
    rev:   existing._rev,
  });

  // If it was a match, downgrade the reverse doc back to "pending".
  if (existing.status === 'matched') {
    try {
      const res    = await cloudant.getDocument({ db: INTERESTS_DB, docId: reverseId });
      const reverse = res.result;
      await cloudant.putDocument({
        db:     INTERESTS_DB,
        docId:  reverseId,
        document: { ...reverse, status: 'pending', matchedAt: null },
      });
    } catch (err) {
      if (err.status !== 404) throw err;
      // If reverse was already deleted, nothing to do.
    }
  }

  return true;
}

/**
 * All interests sent by `userId` (status: "pending" or "matched").
 * Returns array of { toUserId, status, createdAt, matchedAt }.
 */
async function getSentInterests(userId) {
  const res = await cloudant.postFind({
    db:       INTERESTS_DB,
    selector: { fromUserId: userId },
    fields:   ['_id', 'fromUserId', 'toUserId', 'status', 'createdAt', 'matchedAt'],
    limit:    500,
  });
  return (res.result.docs ?? []).map(_sanitize);
}

/**
 * All interests received by `userId` (status: "pending" or "matched").
 * Returns array of { fromUserId, status, createdAt, matchedAt }.
 */
async function getReceivedInterests(userId) {
  const res = await cloudant.postFind({
    db:       INTERESTS_DB,
    selector: { toUserId: userId },
    fields:   ['_id', 'fromUserId', 'toUserId', 'status', 'createdAt', 'matchedAt'],
    limit:    500,
  });
  return (res.result.docs ?? []).map(_sanitize);
}

/**
 * All mutual matches for `userId`.
 * A match exists when BOTH interest:userId:other AND interest:other:userId have status "matched".
 * We query docs where fromUserId === userId AND status === "matched",
 * then return the partner userIds.
 */
async function getMatches(userId) {
  const res = await cloudant.postFind({
    db:       INTERESTS_DB,
    selector: { fromUserId: userId, status: 'matched' },
    fields:   ['toUserId', 'matchedAt'],
    limit:    500,
  });
  return (res.result.docs ?? []).map((doc) => ({
    matchedUserId: doc.toUserId,
    matchedAt:     doc.matchedAt,
  }));
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _sanitize(doc) {
  // eslint-disable-next-line no-unused-vars
  const { _id, _rev, ...safe } = doc;
  return safe;
}

module.exports = { sendInterest, removeInterest, getSentInterests, getReceivedInterests, getMatches };
