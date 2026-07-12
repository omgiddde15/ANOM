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
const { getAllProfiles, getProfile } = require('../models/profileStore');
const { createNotification } = require('../models/notificationStore');
const { ioInstance } = require('../socket');

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
    const fromUserId = req.user.id;
    const toUserId = value.toUserId;
    const result = await sendInterest(fromUserId, toUserId);

    // Only send notification if it's a match!
    if (result.matched) {
      // Get sender's profile for notification
      const senderProfile = await getProfile(fromUserId);
      const senderName = senderProfile?.name || 'Someone';

      // Send notification to the recipient!
      const notifTitle = 'New Match!';
      const notifMessage = `You matched with ${senderName}!`;
      
      const notification = await createNotification({
        recipientUserId: toUserId,
        senderUserId: fromUserId,
        type: 'match',
        title: notifTitle,
        message: notifMessage
      });

      // Also send notification to the sender!
      const recipientProfile = await getProfile(toUserId);
      const recipientName = recipientProfile?.name || 'Someone';
      
      const senderNotification = await createNotification({
        recipientUserId: fromUserId,
        senderUserId: toUserId,
        type: 'match',
        title: notifTitle,
        message: `You matched with ${recipientName}!`
      });

      // Emit via socket if available
      if (ioInstance) {
        ioInstance.to(`user:${toUserId}`).emit('notification:new', notification);
        ioInstance.to(`user:${fromUserId}`).emit('notification:new', senderNotification);
      }
    }

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

  try {
    const fromUserId = req.user.id;
    const toUserId = value.toUserId;
    const removed = await removeInterest(fromUserId, toUserId);

    // Don't send notification on interest withdrawn
    return res.status(200).json({ success: true, removed });
  } catch (err) {
    throw err;
  }
}

/** GET /api/interests/sent */
async function sent(req, res) {
  try {
    const interests = await getSentInterests(req.user.id);
    return res.status(200).json({ success: true, interests });
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return res.status(200).json({ success: true, interests: [] });
  }
}

/** GET /api/interests/received */
async function received(req, res) {
  try {
    const interests = await getReceivedInterests(req.user.id);

    return res.status(200).json({
      success: true,
      interests,
    });
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return res.status(200).json({ success: true, interests: [] });
  }
}

/**
 * GET /api/interests/matches
 *
 * Returns mutual matches enriched with the partner's public profile.
 * Shape: [{ matchedAt, profile: { id, name, city, profession, profilePhotoUrl } }]
 */
async function matches(req, res) {
  try {
    const userId = req.user.id;

    const matchList = await getMatches(userId);
    if (matchList.length === 0) {
      return res.status(200).json({ success: true, matches: [] });
    }

    const allProfiles = await getAllProfiles(userId);
    const profileMap  = Object.fromEntries(allProfiles.map((p) => [p.id, p]));

    const enriched = matchList.map(({ matchedUserId, matchedAt }) => ({
      matchedAt,
      profile: profileMap[matchedUserId] ?? { id: matchedUserId, name: 'Unknown' },
    }));

    return res.status(200).json({ success: true, matches: enriched });
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return res.status(200).json({ success: true, matches: [] });
  }
}

module.exports = { send, remove, sent, received, matches };
