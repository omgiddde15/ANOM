/**
 * controllers/notificationController.js
 */

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../models/notificationStore');

async function getNotificationsHandler(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await getNotifications(userId);
    res.status(200).json({ success: true, notifications });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
}

async function getUnreadCountHandler(req, res) {
  try {
    const userId = req.user.id;
    const count = await getUnreadCount(userId);
    res.status(200).json({ success: true, count });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
}

async function markAsReadHandler(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updated = await markAsRead(userId, id);
    res.status(200).json({ success: true, updated });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
}

async function markAllAsReadHandler(req, res) {
  try {
    const userId = req.user.id;
    await markAllAsRead(userId);
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
}

module.exports = {
  getNotificationsHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
};
