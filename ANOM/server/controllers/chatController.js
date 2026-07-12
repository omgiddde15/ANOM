/**
 * controllers/chatController.js
 *
 * GET /api/chat/:partnerId/messages — fetch conversation history (matched users only)
 */

const Joi = require('joi');
const { areUsersMatched } = require('../models/interestStore');
const { getMessages, saveMessage } = require('../models/messageStore');
const { broadcastMessage, ioInstance } = require('../socket');
const { createNotification } = require('../models/notificationStore');
const { getProfile } = require('../models/profileStore');

const partnerSchema = Joi.object({
  partnerId: Joi.string().required(),
});

/**
 * GET /api/chat/:partnerId/messages
 */
async function listMessages(req, res) {
  try {
    const { error, value } = partnerSchema.validate(req.params);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const userId = req.user.id;
    const { partnerId } = value;

    const matched = await areUsersMatched(userId, partnerId);
    if (!matched) {
      return res.status(403).json({
        success: false,
        message: 'You can only view messages with matched users.',
      });
    }

    const messages = await getMessages(userId, partnerId);
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return res.status(200).json({ success: true, messages: [] });
  }
}

/**
 * POST /api/chat/send -- REST fallback for clients that cannot use Socket.IO.
 * The same mutual-match check used by the socket transport is enforced here.
 */
async function sendMessage(req, res) {
  const schema = Joi.object({ recipientId: Joi.string(), receiverId: Joi.string(), text: Joi.string().trim().min(1).max(4000), message: Joi.string().trim().min(1).max(4000) }).or('recipientId', 'receiverId').or('text', 'message');

  try {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(422).json({ success: false, message: error.details[0].message });
    }

    const recipientId = value.recipientId || value.receiverId;
    const text = value.text || value.message;
    if (!recipientId || !text) return res.status(422).json({ success: false, message: 'receiverId and message are required.' });
    const senderId = req.user.id;
    if (!(await areUsersMatched(senderId, recipientId))) {
      return res.status(403).json({ success: false, message: 'You can only message matched users.' });
    }

    const savedMessage = await saveMessage({ senderId, recipientId, text });
    broadcastMessage(savedMessage);
    
    // Send notification
    const senderProfile = await getProfile(senderId);
    const senderName = senderProfile?.name || 'Someone';
    const notification = await createNotification({
      recipientUserId: recipientId,
      senderUserId: senderId,
      type: 'message',
      title: 'New Message',
      message: `${senderName}: ${text}`
    });
    if (ioInstance) {
      ioInstance.to(`user:${recipientId}`).emit('notification:new', notification);
    }
    
    return res.status(201).json({ success: true, message: savedMessage });
  } catch (err) {
    console.error('CHAT SEND ERROR:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to send message' });
  }
}

module.exports = { listMessages, sendMessage };
