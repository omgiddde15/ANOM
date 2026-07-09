/**
 * routes/ai.js
 * AI endpoints — all JWT-protected.
 */

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { compatibility, profileAnalysis } = require('../controllers/aiController');

const router = Router();

router.use(verifyToken);

router.post('/compatibility',    compatibility);
router.post('/profile-analysis', profileAnalysis);

module.exports = router;
