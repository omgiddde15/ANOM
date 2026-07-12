const express = require('express');
const { verifyToken } = require('../middleware/auth');
const {
  getNotificationsHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', verifyToken, getNotificationsHandler);
router.get('/unread-count', verifyToken, getUnreadCountHandler);
router.patch('/:id/read', verifyToken, markAsReadHandler);
router.patch('/mark-all-read', verifyToken, markAllAsReadHandler);

module.exports = router;
