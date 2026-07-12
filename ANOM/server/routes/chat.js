/**
 * routes/chat.js
 * Chat REST endpoints — JWT-protected.
 */

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { listMessages, sendMessage } = require('../controllers/chatController');

const router = Router();

router.use(verifyToken);

router.get('/:partnerId/messages', listMessages);
// Kept alongside the existing history route for API clients using the chat feature contract.
router.get('/:matchId', (req, _res, next) => {
  req.params.partnerId = req.params.matchId;
  next();
}, listMessages);
router.post('/send', sendMessage);

module.exports = router;
