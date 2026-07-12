const { randomUUID } = require('crypto');
const { cloudant, NOTIFICATIONS_DB } = require('../config/cloudant');

async function createNotification({ recipientUserId, senderUserId, type, title, message }) {
  console.log('Creating notification:', { recipientUserId, senderUserId, type, title, message });
  const id = randomUUID();
  const docId = `notif:${id}`;
  const doc = {
    _id: docId,
    type,
    recipientUserId,
    senderUserId,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await cloudant.putDocument({ db: NOTIFICATIONS_DB, docId, document: doc });
  console.log('Saved notification:', doc);
  return _sanitize(doc, id);
}

async function getNotifications(userId) {
  console.log('Fetching notifications for:', userId);
  try {
    const res = await cloudant.postFind({
      db: NOTIFICATIONS_DB,
      selector: { recipientUserId: userId },
      sort: [{ createdAt: 'desc' }],
      limit: 100
    });
    const notifications = (res.result.docs || []).map(_sanitize);
    console.log('Notifications returned:', notifications);
    return notifications;
  } catch (err) {
    console.error('[Cloudant] getNotifications error:', err.message);
    // Fallback: get all docs and filter/sort in JS
    console.log('[Cloudant] Falling back to JS sorting');
    try {
      const allDocs = await cloudant.postAllDocs({
        db: NOTIFICATIONS_DB,
        include_docs: true
      });
      const userNotifications = (allDocs.result.rows || [])
        .filter(row => row.doc && row.doc.recipientUserId === userId)
        .map(row => _sanitize(row.doc))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      console.log('Fallback notifications returned:', userNotifications);
      return userNotifications;
    } catch (fallbackErr) {
      console.error('[Cloudant] Fallback failed:', fallbackErr.message);
      return [];
    }
  }
}

async function getUnreadCount(userId) {
  try {
    const res = await cloudant.postFind({
      db: NOTIFICATIONS_DB,
      selector: { recipientUserId: userId, isRead: false },
      limit: 100
    });
    return (res.result.docs || []).length;
  } catch (err) {
    console.error('[Cloudant] getUnreadCount error:', err.message);
    // Fallback
    try {
      const allDocs = await cloudant.postAllDocs({
        db: NOTIFICATIONS_DB,
        include_docs: true
      });
      return (allDocs.result.rows || [])
        .filter(row => row.doc && row.doc.recipientUserId === userId && !row.doc.isRead)
        .length;
    } catch (fallbackErr) {
      console.error('[Cloudant] Fallback failed:', fallbackErr.message);
      return 0;
    }
  }
}

async function markAsRead(userId, notificationId) {
  try {
    const docId = `notif:${notificationId}`;
    const existing = await cloudant.getDocument({ db: NOTIFICATIONS_DB, docId });
    if (existing.result.recipientUserId !== userId) {
      throw new Error('Not authorized');
    }
    const updated = {
      ...existing.result,
      isRead: true,
      updatedAt: new Date().toISOString()
    };
    await cloudant.putDocument({ db: NOTIFICATIONS_DB, docId, document: updated });
    return true;
  } catch (err) {
    if (err.status === 404) return false;
    console.error('[Cloudant] markAsRead error:', err.message);
    throw err;
  }
}

async function markAllAsRead(userId) {
  try {
    const res = await cloudant.postFind({
      db: NOTIFICATIONS_DB,
      selector: { recipientUserId: userId, isRead: false },
      limit: 100
    });
    const docs = (res.result.docs || []).map(doc => ({
      ...doc,
      isRead: true,
      updatedAt: new Date().toISOString()
    }));
    if (docs.length > 0) {
      await cloudant.bulkDocs({ db: NOTIFICATIONS_DB, docs: { docs } });
    }
  } catch (err) {
    console.error('[Cloudant] markAllAsRead error:', err.message);
    // Fallback
    try {
      const allDocs = await cloudant.postAllDocs({
        db: NOTIFICATIONS_DB,
        include_docs: true
      });
      const docsToUpdate = (allDocs.result.rows || [])
        .filter(row => row.doc && row.doc.recipientUserId === userId && !row.doc.isRead)
        .map(row => ({
          ...row.doc,
          isRead: true,
          updatedAt: new Date().toISOString()
        }));
      if (docsToUpdate.length > 0) {
        await cloudant.bulkDocs({ db: NOTIFICATIONS_DB, docs: { docs: docsToUpdate } });
      }
    } catch (fallbackErr) {
      console.error('[Cloudant] Fallback failed:', fallbackErr.message);
    }
  }
}

function _sanitize(doc, fallbackId) {
  const id = doc._id?.replace(/^notif:/, '') || fallbackId || '';
  return {
    id,
    type: doc.type,
    recipientUserId: doc.recipientUserId,
    senderUserId: doc.senderUserId,
    title: doc.title,
    message: doc.message,
    isRead: doc.isRead,
    // Keep data field for backwards compatibility with frontend
    data: {
      fromUserName: 'Someone',
      ...(doc.data || {})
    },
    createdAt: doc.createdAt,
    // Keep read field for backwards compatibility with frontend
    read: doc.isRead
  };
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
