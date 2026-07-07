/**
 * routes/auth.js
 * Mounts all authentication endpoints under /api/auth
 */

const { Router } = require('express');
const { signup, login, me } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', verifyToken, me);

module.exports = router;
