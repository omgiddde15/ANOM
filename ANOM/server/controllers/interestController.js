/**
 * controllers/interestController.js
 *
 * POST   /api/interests/send
 * DELETE /api/interests/remove
 * GET    /api/interests/sent
 * GET    /api/interests/received
 * GET    /api/interests/matches
 */

const Joi = require('joi');
const {
  sendInterest,
  removeInterest,
  getSentInterests,
  getReceivedInterests,
  getMatches,
} = require('../models/interestStore');
const { getAllProfiles } = require('../models/profileStore');

// ─── Validation ───────────────────────────────────────────────────────────────

const toUserSchema = Joi.object({
  toUserId: Joi.string().required(),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** POST /api/interests/send */
async function send(req, res) {
  const { error, value } = toUserSchema.validate(req.body);
  if (error) {
    return res.status(422).json({ success: false, message: error.details[0].message });
  }

  try {
    const result = await sendInterest(req.user.id, value.toUserId);
    return res.status(result.created ? 201 : 200).json({
      success:  true,
      created:  result.created,
      matched:  result.matched,
      interest: result.doc,
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    throw err;
  }
}

/** DELETE /api/interests/remove */
async function remove(req, res) {
  const { error, value } = toUserSchema.validate(req.body);
  if (error) {
    return res.status(422).json({ success: false, message: error.details[0].message });
  }

  const removed = await removeInterest(req.user.id, value.toUserId);
  return res.status(200).json({ success: true, removed });
}

/** GET /api/interests/sent */
async function sent(req, res) {
  const interests = await getSentInterests(req.user.id);
  return res.status(200).json({ success: true, interests });
}

/** GET /api/interests/received */
async function received(req, res) {
  const interests = await getReceivedInterests(req.user.id);
  return res.status(200).json({ success: true, interests });
}

/**
 * GET /api/interests/matches
 *
 * Returns mutual matches enriched with the partner's public profile.
 * Shape: [{ matchedAt, profile: { id, name, city, profession, profilePhotoUrl } }]
 */
async function matches(req, res) {
  const userId = req.user.id;

  // 1. Get all matched partner IDs for this user
  const matchList = await getMatches(userId);
  if (matchList.length === 0) {
    return res.status(200).json({ success: true, matches: [] });
  }

  // 2. Fetch all profiles (excluding self) then filter to matched partners
  const allProfiles = await getAllProfiles(userId);
  const profileMap  = Object.fromEntries(allProfiles.map((p) => [p.id, p]));

  const enriched = matchList.map(({ matchedUserId, matchedAt }) => ({
    matchedAt,
    profile: profileMap[matchedUserId] ?? { id: matchedUserId, name: 'Unknown' },
  }));

  return res.status(200).json({ success: true, matches: enriched });
}

module.exports = { send, remove, sent, received, matches };
