/**
 * controllers/usersController.js
 *
 * GET /api/users
 * Returns all user profiles except the authenticated user's own.
 */

const Joi = require('joi');
const { getAllProfiles, getProfile } = require('../models/profileStore');
const { findById } = require('../models/userStore');
const { cloudant, DB_NAME, MESSAGES_DB, MEETINGS_DB } = require('../config/cloudant');
const { getMatches, getSentInterests } = require('../models/interestStore');

/**
 * GET /api/users
 * Requires a valid JWT (attached via verifyToken middleware).
 * req.user.id is excluded from results.
 */
async function listUsers(req, res) {
  try {
    const users = await getAllProfiles(req.user.id);
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return res.status(200).json({ success: true, users: [] });
  }
}
const userIdSchema = Joi.object({
  id: Joi.string().required(),
});

async function getUserById(req, res) {
  const { error, value } = userIdSchema.validate(req.params);
  if (error) {
    return res.status(422).json({ success: false, message: error.details[0].message });
  }

  const profile = await getProfile(value.id);
  if (!profile) {
    const authUser = await findById(value.id);
    if (!authUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: authUser.id,
        name: authUser.name || '',
        email: authUser.email || '',
        city: '',
        profession: '',
        bio: '',
        interests: [],
        photoUrl: '',
        profileImageUrl: '',
        updatedAt: null,
      },
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: profile.userId,
      name: profile.name || '',
      email: profile.email || '',
      city: profile.city || '',
      profession: profile.profession || '',
      bio: profile.bio || '',
      interests: Array.isArray(profile.interests) ? profile.interests : [],
      photoUrl: profile.photoUrl || '',
      profileImageUrl: profile.profileImageUrl || '',
      updatedAt: profile.updatedAt || null,
      maritalStatus: profile.maritalStatus || '',
    },
  });
}

/**
 * GET /api/users/analytics
 * Read-only dashboard aggregate. It deliberately exposes only counts and
 * the authenticated user's own activity; no other users' private data leaves
 * Cloudant through this endpoint.
 */
async function analytics(req, res) {
  const userId = req.user.id;
  try {
  const [usersRes, sentInterests, matchList, messagesRes, meetingsAsRequester, meetingsAsPartner, profile, profiles] = await Promise.all([
    cloudant.postFind({ db: DB_NAME, selector: { type: 'user' }, fields: ['_id'], limit: 1000 }),
    getSentInterests(userId),
    getMatches(userId),
    cloudant.postFind({
      db: MESSAGES_DB,
      selector: {
        type: 'message',
        $or: [{ senderId: userId }, { recipientId: userId }],
      },
      fields: ['senderId', 'recipientId', 'createdAt'],
      limit: 2000,
    }),
    cloudant.postFind({
      db: MEETINGS_DB,
      selector: { type: 'meeting', requesterId: userId },
      fields: ['requesterId', 'partnerId', 'date', 'time', 'venue', 'status', 'createdAt'],
      limit: 500,
    }),
    cloudant.postFind({
      db: MEETINGS_DB,
      selector: { type: 'meeting', partnerId: userId },
      fields: ['requesterId', 'partnerId', 'date', 'time', 'venue', 'status', 'createdAt'],
      limit: 500,
    }),
    getProfile(userId), getAllProfiles(userId),
  ]);

  const ownMessages = messagesRes.result.docs || [];
  const ownMeetings = [
    ...(meetingsAsRequester.result.docs || []),
    ...(meetingsAsPartner.result.docs || []),
  ];
  const profileFields = ['name', 'city', 'profession', 'bio', 'photoUrl', 'profileImageUrl', 'maritalStatus'];
  const profileCompletion = profile ? Math.round((profileFields.filter((field) => String(profile[field] || '').trim()).length + (profile.interests?.length ? 1 : 0)) / (profileFields.length + 1) * 100) : 0;
  const profileById = Object.fromEntries(profiles.map((item) => [item.id, item]));
  const compatibilityScores = matchList.map(({ matchedUserId }) => {
    const partner = profileById[matchedUserId];
    if (!profile || !partner) return 0;
    const mine = new Set((profile.interests || []).map((interest) => interest.toLowerCase()));
    const shared = (partner.interests || []).filter((interest) => mine.has(interest.toLowerCase())).length;
    return Math.min(100, 55 + shared * 15 + (profile.city && profile.city === partner.city ? 10 : 0) + (profile.profession && profile.profession === partner.profession ? 8 : 0));
  });
  const aiCompatibilityAverage = compatibilityScores.length ? Math.round(compatibilityScores.reduce((total, score) => total + score, 0) / compatibilityScores.length) : 0;
  const recommended = profiles.map((candidate) => {
    const mine = new Set((profile?.interests || []).map((interest) => interest.toLowerCase()));
    const shared = (candidate.interests || []).filter((interest) => mine.has(interest.toLowerCase())).length;
    return { ...candidate, compatibility: Math.min(100, 55 + shared * 15 + (profile?.city && profile.city === candidate.city ? 10 : 0)) };
  }).sort((a, b) => b.compatibility - a.compatibility)[0] || null;
  const activity = [
    ...sentInterests.map((item) => ({ kind: 'interest', createdAt: item.createdAt, text: 'You sent an interest' })),
    ...matchList.map((item) => ({ kind: 'match', createdAt: item.matchedAt, text: `You matched with ${profileById[item.matchedUserId]?.name || 'a new connection'}` })),
    ...ownMessages.map((item) => ({ kind: 'message', createdAt: item.createdAt, text: 'A chat message was sent' })),
    ...ownMeetings.map((item) => ({ kind: 'meeting', createdAt: item.createdAt, text: `Meeting ${item.status}` })),
  ].filter((item) => item.createdAt).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setDate(day.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    const count = [...sentInterests, ...ownMessages, ...ownMeetings].filter((item) => item.createdAt?.slice(0, 10) === key).length;
    return { label: day.toLocaleDateString(undefined, { weekday: 'short' }), count };
  });

  return res.json({
    success: true,
    stats: {
      totalUsers: usersRes.result.docs?.length || 0,
      totalMatches: matchList.length,
      totalInterestsSent: sentInterests.length,
      totalMessages: ownMessages.length,
      meetingsScheduled: ownMeetings.filter((item) => item.status === 'accepted').length,
      profileCompletion,
      aiCompatibilityAverage,
    },
    weekly,
    activity,
    recommended,
    upcomingMeetings: ownMeetings.filter((item) => item.status === 'accepted' && item.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 3),
  });
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return res.status(200).json({
      success: true,
      stats: {
        totalUsers: 0,
        totalMatches: 0,
        totalInterestsSent: 0,
        totalMessages: 0,
        meetingsScheduled: 0,
        profileCompletion: 0,
        aiCompatibilityAverage: 0,
      },
      weekly: [],
      activity: [],
      recommended: null,
      upcomingMeetings: [],
    });
  }
}
module.exports = {
    listUsers,
    getUserById,
    analytics,
};
