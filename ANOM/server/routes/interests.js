/**
 * routes/interests.js
 * All /api/interests endpoints — JWT-protected.
 */

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const {
  send, remove, sent, received, matches,
} = require('../controllers/interestController');

const router = Router();

// Every endpoint requires a valid JWT.
router.use(verifyToken);

router.post('/send',       send);
router.delete('/remove',   remove);
router.get('/sent',        sent);
router.get('/received',    received);
router.get('/matches',     matches);

module.exports = router;
