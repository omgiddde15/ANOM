/**
 * routes/profile.js
 * All /api/profile endpoints — JWT-protected.
 */

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { getProfileHandler, updateProfileHandler } = require('../controllers/profileController');

const router = Router();

// Both endpoints require a valid JWT.
router.use(verifyToken);

router.get('/',  getProfileHandler);
router.put('/',  updateProfileHandler);

module.exports = router;
