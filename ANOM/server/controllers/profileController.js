/**
 * controllers/profileController.js
 *
 * GET /api/profile   — fetch the authenticated user's profile
 * PUT /api/profile   — create or update the authenticated user's profile
 */

const Joi = require('joi');
const { getProfile, upsertProfile } = require('../models/profileStore');

// ─── Validation schema ────────────────────────────────────────────────────────

const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed', 'prefer_not', ''];

const INTERESTS_LIST = [
  'travel', 'music', 'sports', 'cooking', 'reading',
  'gaming', 'art', 'technology', 'fitness', 'movies',
  'photography', 'nature', 'fashion', 'volunteering', 'other',
];

const profileSchema = Joi.object({
  name:          Joi.string().min(2).max(80).required(),
  email:         Joi.string().email().required(),
  city:          Joi.string().max(100).allow('').default(''),
  bio:           Joi.string().max(500).allow('').default(''),
  profession:    Joi.string().max(100).allow('').default(''),
  maritalStatus: Joi.string().valid(...MARITAL_STATUSES).default(''),
  interests:     Joi.array().items(Joi.string().valid(...INTERESTS_LIST)).default([]),
  photoUrl:      Joi.string().uri().allow('').default(''),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/profile
 * Returns the profile or a default empty skeleton if none exists yet.
 */
async function getProfileHandler(req, res) {
  const userId = req.user.id;

  const profile = await getProfile(userId);

  if (!profile) {
    // Return an empty skeleton so the frontend form is always populated.
    return res.status(200).json({
      success: true,
      profile: {
        userId,
        name:          req.user.name  ?? '',
        email:         req.user.email ?? '',
        city:          '',
        bio:           '',
        profession:    '',
        maritalStatus: '',
        interests:     [],
        photoUrl:      '',
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
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(422).json({
        success: false,
        errors: messages,
      });
    }

    const profile = await upsertProfile(userId, value);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile,
    });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = { getProfileHandler, updateProfileHandler };
