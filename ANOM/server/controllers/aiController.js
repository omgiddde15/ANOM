/**
 * controllers/aiController.js
 *
 * POST /api/ai/compatibility
 *
 * Request body: { user1Id: string, user2Id: string }
 *
 * Response:
 * {
 *   "success": true,
 *   "score": 92,
 *   "reason": ["Both enjoy AI and Technology.", "..."],
 *   "conversationStarter": "...",
 *   "meetingSuggestion": "..."
 * }
 */

const Joi = require('joi');
const { getProfile } = require('../models/profileStore');
const { analyseCompatibility, analyseProfile } = require('../services/graniteService');

// ─── Validation ───────────────────────────────────────────────────────────────

const compatibilitySchema = Joi.object({
  user1Id: Joi.string().required(),
  user2Id: Joi.string().required(),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/compatibility
 * Requires a valid JWT (both users must exist in Cloudant).
 */
async function compatibility(req, res) {
  // ── 1. Validate request body ───────────────────────────────────────────────
  const { error, value } = compatibilitySchema.validate(req.body);
  if (error) {
    return res.status(422).json({ success: false, message: error.details[0].message });
  }

  const { user1Id, user2Id } = value;

  // ── 2. Prevent self-comparison ────────────────────────────────────────────
  if (user1Id === user2Id) {
    return res.status(400).json({ success: false, message: 'user1Id and user2Id must be different.' });
  }

  // ── 3. Fetch both profiles ────────────────────────────────────────────────
  const [profile1, profile2] = await Promise.all([
    getProfile(user1Id),
    getProfile(user2Id),
  ]);

  if (!profile1) {
    return res.status(404).json({ success: false, message: `Profile not found for user1Id: ${user1Id}` });
  }
  if (!profile2) {
    return res.status(404).json({ success: false, message: `Profile not found for user2Id: ${user2Id}` });
  }

  // ── 4. Call Granite ───────────────────────────────────────────────────────
  const result = await analyseCompatibility(profile1, profile2);

  // ── 5. Respond — spec uses "reason" (singular) as the array key ──────────
  return res.status(200).json({
    success:             true,
    score:               result.score,
    reason:              result.reasons,       // spec field name
    conversationStarter: result.conversationStarter,
    meetingSuggestion:   result.meetingSuggestion,
  });
}

// ─── Profile Analysis ─────────────────────────────────────────────────────────

const profileAnalysisSchema = Joi.object({
  bio:       Joi.string().allow('').default(''),
  interests: Joi.array().items(Joi.string()).default([]),
});

/**
 * POST /api/ai/profile-analysis
 * Requires a valid JWT.
 *
 * Request:  { bio: string, interests: string[] }
 * Response: { success, personality, communicationStyle, strengths, relationshipGoals, summary }
 */
async function profileAnalysis(req, res) {
  try {
    console.log("PROFILE REQUEST BODY:");
    console.log(req.body);

    const { error, value } = profileAnalysisSchema.validate(req.body);

    if (error) {
      console.log(error);
      return res.status(422).json(error);
    }

    console.log("Calling IBM...");

    const result = await analyseProfile(value.bio, value.interests);

    console.log("IBM RESULT:");
    console.log(result);

    return res.json({
      success: true,
      ...result
    });

  } catch (err) {
    console.error("IBM ERROR:");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

module.exports = { compatibility, profileAnalysis };
