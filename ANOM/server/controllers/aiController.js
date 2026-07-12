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
const { getProfile, getAllProfiles } = require('../models/profileStore');
const { analyseCompatibility, analyseProfile, improveBio, generateIceBreakers, generateFirstMessage, generateConversationCoach, generateMatchExplanation, generateDateIdeas, generateProfileRecommendations, generateProfileScore, generateMeetingVenues } = require('../services/graniteService');
const { areUsersMatched } = require('../models/interestStore');
const { generateConversationStarter, generateCompatibilityExplanation } = require('../services/graniteConversationService');

function aiParseError(res, error) {
  if (error?.message !== 'AI response could not be parsed.') return false;
  res.status(200).json({ success: false, message: 'AI response could not be parsed.' });
  return true;
}

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

  if (user1Id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only compare your own profile.' });
  }

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
  let result;
  try {
    result = await analyseCompatibility(profile1, profile2);
  } catch (error) {
    if (aiParseError(res, error)) return;
    throw error;
  }

  // ── 5. Respond — spec uses "reason" (singular) as the array key ──────────
  return res.status(200).json({
    success:             true,
    score:               result.score,
    reason:              result.reasons,       // spec field name
    reasons:             result.reasons,
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

    if (aiParseError(res, err)) return;

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

// ─── Bio Improver ─────────────────────────────────────────────────────────────

const bioImproverSchema = Joi.object({
  bio:       Joi.string().allow('').default(''),
  interests: Joi.array().items(Joi.string()).default([]),
});

/**
 * POST /api/ai/bio-improver
 * Requires a valid JWT.
 *
 * Request:  { bio: string, interests: string[] }
 * Response: { success: true, improvedBio: string }
 */
async function bioImprover(req, res) {
  try {
    const { error, value } = bioImproverSchema.validate(req.body);

    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const result = await improveBio(value.bio, value.interests);

    return res.status(200).json({
      success:     true,
      improvedBio: result.improvedBio,
    });

  } catch (err) {
    console.error('BIO IMPROVER ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ─── Ice Breaker ──────────────────────────────────────────────────────────────

const iceBreakerSchema = Joi.object({
  user1Id: Joi.string().required(),
  user2Id: Joi.string().required(),
});

/**
 * POST /api/ai/ice-breaker
 * Requires a valid JWT (both users must exist in Cloudant).
 *
 * Request:  { user1Id: string, user2Id: string }
 * Response: { success: true, iceBreakers: string[] }
 */
async function iceBreaker(req, res) {
  try {
    // ── 1. Validate request body ─────────────────────────────────────────────
    const { error, value } = iceBreakerSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { user1Id, user2Id } = value;

    if (user1Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only use your own profile.' });
    }

    // ── 2. Prevent self-match ────────────────────────────────────────────────
    if (user1Id === user2Id) {
      return res.status(400).json({ success: false, message: 'user1Id and user2Id must be different.' });
    }

    // ── 3. Fetch both profiles ───────────────────────────────────────────────
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

    // ── 4. Call Granite ──────────────────────────────────────────────────────
    const result = await generateIceBreakers(profile1, profile2);

    return res.status(200).json({
      success:     true,
      iceBreakers: result.iceBreakers,
    });

  } catch (err) {
    console.error('ICE BREAKER ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ─── First Message ────────────────────────────────────────────────────────────

const firstMessageSchema = Joi.object({
  user1Id: Joi.string().required(),
  user2Id: Joi.string().required(),
});

/**
 * POST /api/ai/first-message
 * Requires a valid JWT (both users must exist in Cloudant).
 *
 * Request:  { user1Id: string, user2Id: string }
 * Response: { success: true, message: string }
 */
async function firstMessage(req, res) {
  try {
    // ── 1. Validate request body ─────────────────────────────────────────────
    const { error, value } = firstMessageSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { user1Id, user2Id } = value;

    if (user1Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only use your own profile.' });
    }

    // ── 2. Prevent self-match ────────────────────────────────────────────────
    if (user1Id === user2Id) {
      return res.status(400).json({ success: false, message: 'user1Id and user2Id must be different.' });
    }

    // ── 3. Fetch both profiles ───────────────────────────────────────────────
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

    // ── 4. Call Granite ──────────────────────────────────────────────────────
    const result = await generateFirstMessage(profile1, profile2);

    return res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (err) {
    console.error('FIRST MESSAGE ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ─── Conversation Coach ───────────────────────────────────────────────────────

const conversationCoachSchema = Joi.object({
  lastMessage: Joi.string().min(1).required(),
});

/**
 * POST /api/ai/conversation-coach
 * Requires a valid JWT.
 *
 * Request:  { lastMessage: string }
 * Response: { success: true, replySuggestion: string }
 */
async function conversationCoach(req, res) {
  try {
    const { error, value } = conversationCoachSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { lastMessage } = value;
    const result = await generateConversationCoach(lastMessage);

    return res.status(200).json({
      success: true,
      replySuggestion: result.replySuggestion,
    });

  } catch (err) {
    console.error('CONVERSATION COACH ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ─── Match Explanation ────────────────────────────────────────────────────────

const matchExplanationSchema = Joi.object({
  user1Id: Joi.string().required(),
  user2Id: Joi.string().required(),
});

/**
 * POST /api/ai/match-explanation
 * Requires a valid JWT (both users must exist in Cloudant).
 *
 * Request:  { user1Id: string, user2Id: string }
 * Response: { success: true, compatibilityLevel, summary, strengths, possibleChallenges, tips }
 */
async function matchExplanation(req, res) {
  try {
    // ── 1. Validate request body ─────────────────────────────────────────────
    const { error, value } = matchExplanationSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { user1Id, user2Id } = value;

    if (user1Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only use your own profile.' });
    }

    // ── 2. Prevent self-match ────────────────────────────────────────────────
    if (user1Id === user2Id) {
      return res.status(400).json({ success: false, message: 'user1Id and user2Id must be different.' });
    }

    // ── 3. Fetch both profiles ───────────────────────────────────────────────
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

    // ── 4. Call Granite ──────────────────────────────────────────────────────
    const result = await generateMatchExplanation(profile1, profile2);

    return res.status(200).json({
      success:            true,
      compatibilityLevel: result.compatibilityLevel,
      summary:            result.summary,
      strengths:          result.strengths,
      possibleChallenges: result.possibleChallenges,
      tips:               result.tips,
    });

  } catch (err) {
    console.error('MATCH EXPLANATION ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ─── Date Planner ─────────────────────────────────────────────────────────────

const datePlannerSchema = Joi.object({
  user1Id: Joi.string().required(),
  user2Id: Joi.string().required(),
});

/**
 * POST /api/ai/date-planner
 * Requires a valid JWT (both users must exist in Cloudant).
 *
 * Request:  { user1Id: string, user2Id: string }
 * Response: { success: true, dateIdeas: [{ title, description, locationType }] }
 */
async function datePlanner(req, res) {
  try {
    // ── 1. Validate request body ─────────────────────────────────────────────
    const { error, value } = datePlannerSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { user1Id, user2Id } = value;

    if (user1Id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only use your own profile.' });
    }

    // ── 2. Prevent self-match ────────────────────────────────────────────────
    if (user1Id === user2Id) {
      return res.status(400).json({ success: false, message: 'user1Id and user2Id must be different.' });
    }

    // ── 3. Fetch both profiles ───────────────────────────────────────────────
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

    // ── 4. Call Granite ──────────────────────────────────────────────────────
    const result = await generateDateIdeas(profile1, profile2);

    return res.status(200).json({
      success:    true,
      dateIdeas:  result.dateIdeas,
    });

  } catch (err) {
    console.error('DATE PLANNER ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ─── Profile Recommendation ───────────────────────────────────────────────────

const profileRecommendationSchema = Joi.object({
  userId: Joi.string().required(),
});

/**
 * POST /api/ai/profile-recommendation
 * Requires a valid JWT.
 *
 * Request:  { userId: string }
 * Response: { success: true, recommendations: [{ userId, name, score, reason }] }
 */
async function profileRecommendation(req, res) {
  try {
    // ── 1. Validate request body ─────────────────────────────────────────────
    const { error, value } = profileRecommendationSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { userId } = value;
    if (userId !== req.user.id) return res.status(403).json({ success: false, message: 'You can only use your own profile.' });

    // ── 2. Fetch source profile ──────────────────────────────────────────────
    const sourceProfile = await getProfile(userId);
    if (!sourceProfile) {
      return res.status(404).json({ success: false, message: `Profile not found for userId: ${userId}` });
    }

    // ── 3. Fetch all other profiles ──────────────────────────────────────────
    const candidates = await getAllProfiles(userId);
    if (!candidates.length) {
      return res.status(200).json({ success: true, recommendations: [] });
    }

    // ── 4. Call Granite ──────────────────────────────────────────────────────
    const result = await generateProfileRecommendations(sourceProfile, candidates);

    return res.status(200).json({
      success:         true,
      recommendations: result.recommendations,
    });

  } catch (err) {
    console.error('PROFILE RECOMMENDATION ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

// ─── Profile Score ────────────────────────────────────────────────────────────

const profileScoreSchema = Joi.object({
  userId: Joi.string().required(),
});

/**
 * POST /api/ai/profile-score
 * Requires a valid JWT.
 *
 * Request:  { userId: string }
 * Response: { success: true, score: number, tips: string[] }
 */
async function profileScore(req, res) {
  try {
    // ── 1. Validate request body ─────────────────────────────────────────────
    const { error, value } = profileScoreSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const { userId } = value;
    if (userId !== req.user.id) return res.status(403).json({ success: false, message: 'You can only score your own profile.' });

    // ── 2. Fetch profile ─────────────────────────────────────────────────────
    const profile = await getProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: `Profile not found for userId: ${userId}` });
    }

    // ── 3. Call Granite ──────────────────────────────────────────────────────
    const result = await generateProfileScore(profile);

    return res.status(200).json({
      success: true,
      score:   result.score,
      tips:    result.tips,
    });

  } catch (err) {
    console.error('PROFILE SCORE ERROR:');
    if (aiParseError(res, err)) return;
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

async function meetingSuggestion(req, res) {
  const schema = Joi.object({ matchId: Joi.string().required(), city: Joi.string().trim().required(), interests: Joi.array().items(Joi.string()).default([]) });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(422).json({ success: false, message: error.details[0].message });
  if (!(await areUsersMatched(req.user.id, value.matchId))) return res.status(403).json({ success: false, message: 'Only matched users can request venues.' });

  try {
    const [personA, personB] = await Promise.all([getProfile(req.user.id), getProfile(value.matchId)]);
    const interestsA = Array.isArray(personA?.interests) ? personA.interests : [];
    const interestsB = Array.isArray(personB?.interests) ? personB.interests : [];
    const sharedInterests = value.interests.length
      ? value.interests
      : interestsA.filter((interest) => interestsB.includes(interest));

    const result = await generateMeetingVenues(value.city, sharedInterests, personA || {}, personB || {});
    const venues = result.venues.map((v) => ({
      ...v,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.latitude && v.longitude ? `${v.latitude},${v.longitude}` : `${v.name} ${v.address}`)}`,
    }));

    return res.json({ success: true, venues });
  } catch (err) {
    if (aiParseError(res, err)) return;
    return res.status(500).json({ success: false, message: err.message });
  }
}

const conversationStarterSchema = Joi.object({
  userId: Joi.string().required(),
  matchedUserId: Joi.string().required(),
});

async function conversationStarter(req, res) {
  try {
    const { error, value } = conversationStarterSchema.validate(req.body);
    if (error) return res.status(422).json({ success: false, message: error.details[0].message });
    if (value.userId !== req.user.id) return res.status(403).json({ success: false, message: 'You can only generate starters for your own profile.' });
    if (value.userId === value.matchedUserId) return res.status(400).json({ success: false, message: 'Choose a different matched user.' });
    if (!(await areUsersMatched(value.userId, value.matchedUserId))) {
      return res.status(403).json({ success: false, message: 'Conversation starters are available after a mutual match.' });
    }

    const [userProfile, matchedProfile] = await Promise.all([getProfile(value.userId), getProfile(value.matchedUserId)]);
    if (!userProfile || !matchedProfile) return res.status(404).json({ success: false, message: 'One or both profiles could not be found.' });

    return res.json({ success: true, ...(await generateConversationStarter(userProfile, matchedProfile)) });
  } catch (err) {
    console.error('CONVERSATION STARTER ERROR:', err);
    if (aiParseError(res, err)) return;
    return res.status(500).json({ success: false, message: 'Unable to generate a conversation starter right now.' });
  }
}

async function compatibilityExplanation(req, res) {
  try {
    const matchedUserId = String(req.params.userId || '').trim();
    if (!matchedUserId) return res.status(422).json({ success: false, message: 'A user ID is required.' });
    if (matchedUserId === req.user.id) return res.status(400).json({ success: false, message: 'Choose a different user to compare.' });

    const [userProfile, matchedProfile] = await Promise.all([getProfile(req.user.id), getProfile(matchedUserId)]);
    if (!userProfile || !matchedProfile) return res.status(404).json({ success: false, message: 'One or both profiles could not be found.' });

    return res.json({ success: true, ...(await generateCompatibilityExplanation(userProfile, matchedProfile)) });
  } catch (err) {
    console.error('COMPATIBILITY EXPLANATION ERROR:', err);
    if (aiParseError(res, err)) return;
    return res.status(500).json({ success: false, message: 'Unable to generate compatibility details right now.' });
  }
}

module.exports = { compatibility, profileAnalysis, bioImprover, iceBreaker, firstMessage, conversationCoach, matchExplanation, datePlanner, profileRecommendation, profileScore, meetingSuggestion, conversationStarter, compatibilityExplanation };
