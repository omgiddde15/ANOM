/**
 * models/messageStore.js
 *
 * Cloudant-backed store for chat messages.
 *
 * Message document shape:
 * {
 *   _id            : "msg:<uuid>"
 *   type           : "message"
 *   conversationId : "<sortedUserId1>:<sortedUserId2>"
 *   senderId       : string
 *   recipientId    : string
 *   text           : string
 *   createdAt      : string (ISO-8601)
 * }
 */

const { randomUUID } = require('crypto');
const { cloudant, MESSAGES_DB } = require('../config/cloudant');

function conversationId(userA, userB) {
  return [userA, userB].sort().join(':');
}

/**
 * Persist a chat message.
 * @returns {Promise<object>} Sanitized message
 */
async function saveMessage({ senderId, recipientId, text }) {
  const id = randomUUID();
  const docId = `msg:${id}`;
  const doc = {
    _id: docId,
    type: 'message',
    conversationId: conversationId(senderId, recipientId),
    senderId,
    recipientId,
    text: String(text).trim(),
    createdAt: new Date().toISOString(),
  };

  await cloudant.putDocument({ db: MESSAGES_DB, docId, document: doc });
  return _sanitize(doc, id);
}

/**
 * Fetch messages between two users, oldest first.
 */
async function getMessages(userId1, userId2, limit = 200) {
  const convId = conversationId(userId1, userId2);

  try {
    const res = await cloudant.postFind({
      db: MESSAGES_DB,
      selector: {
        type: 'message',
        conversationId: convId,
      },
      fields: ['_id', 'senderId', 'recipientId', 'text', 'createdAt'],
      sort: [{ createdAt: 'asc' }],
      limit,
    });

    return (res.result.docs ?? []).map((doc) => _sanitize(doc));
  } catch (error) {
    console.error('[Cloudant]', error.message);
    return [];
  }
}

function _sanitize(doc, fallbackId) {
  const id = doc._id?.replace(/^msg:/, '') || fallbackId || '';
  return {
    id,
    senderId: doc.senderId,
    recipientId: doc.recipientId,
    text: doc.text,
    createdAt: doc.createdAt,
  };
}

module.exports = { saveMessage, getMessages, conversationId };
