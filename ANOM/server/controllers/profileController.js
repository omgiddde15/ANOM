/**
 * controllers/profileController.js
 *
 * GET /api/profile   — fetch the authenticated user's profile
 * PUT /api/profile   — create or update the authenticated user's profile
 */

const Joi = require('joi');
const { getProfile, upsertProfile } = require('../models/profileStore');
const { findById, updateUserIdentity } = require('../models/userStore');

// ─── Validation schema ────────────────────────────────────────────────────────

const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed', 'prefer_not', ''];

// Exact list as per requirements
const INTERESTS_LIST = [
  "travel",
  "music",
  "sports",
  "cooking",
  "reading",
  "gaming",
  "art",
  "technology",
  "fitness",
  "movies",
  "photography",
  "nature",
  "fashion",
  "volunteering",
  "other"
];

// Normalize interests: trim, lowercase, remove duplicates, filter invalid
const normalizeInterests = (interests = []) => {
  if (!Array.isArray(interests)) return [];
  const normalized = new Set();
  for (let interest of interests) {
    const i = (interest || '').trim().toLowerCase();
    if (!i) continue;
    if (INTERESTS_LIST.includes(i)) {
      normalized.add(i);
    } else {
      normalized.add('other');
    }
  }
  return [...normalized];
};

const profileSchema = Joi.object({
  name:             Joi.string().min(2).max(80).required(),
  email:            Joi.string().email().required(),
  city:             Joi.string().max(100).allow('').default(''),
  bio:              Joi.string().max(500).allow('').default(''),
  profession:       Joi.string().max(100).allow('').default(''),
  maritalStatus:    Joi.string().valid(...MARITAL_STATUSES).default(''),
  interests:        Joi.array().items(Joi.string().allow('')).default([]),
  photoUrl:         Joi.string().uri().allow('').default(''),
  profileImageUrl:  Joi.string().uri().allow('').default(''),
  relationshipGoal: Joi.string().max(100).allow('').default(''),
  age:              Joi.number().integer().min(18).max(120).allow(null, '').empty('').default(null),
  gender:           Joi.string().max(50).allow('').default(''),
  location:         Joi.string().max(200).allow('').default(''),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/profile
 * Returns the profile or a default empty skeleton if none exists yet.
 */
async function getProfileHandler(req, res) {
  const userId = req.user.id;

  const [profile, user] = await Promise.all([getProfile(userId), findById(userId)]);

  if (!profile) {
    // Return an empty skeleton so the frontend form is always populated.
    return res.status(200).json({
      success: true,
      profile: {
        userId,
        name:          user?.name ?? '',
        email:         user?.email ?? '',
        city:          '',
        bio:           '',
        profession:    '',
        maritalStatus: '',
        interests:     [],
        photoUrl:      '',
        profileImageUrl: '',
        updatedAt:     null,
      },
    });
  }

  return res.status(200).json({ success: true, profile });
}

/**
 * PUT /api/profile
 * Validates, then creates or replaces the user's profile document.
 */
async function updateProfileHandler(req, res) {
  try {
    const userId = req.user.id;

    const { error, value } = profileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(422).json({
        success: false,
        errors: messages,
      });
    }

    // Normalize interests before saving
    value.interests = normalizeInterests(value.interests);

    await updateUserIdentity(userId, value);
    const profile = await upsertProfile(userId, value);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile,
    });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:");
    console.error(err);

    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = { getProfileHandler, updateProfileHandler };
