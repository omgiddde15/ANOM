/**
 * routes/ai.js
 * AI endpoints — all JWT-protected.
 */

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { compatibility, profileAnalysis, bioImprover, iceBreaker, firstMessage, conversationCoach, matchExplanation, datePlanner, profileRecommendation, profileScore, meetingSuggestion, conversationStarter, compatibilityExplanation } = require('../controllers/aiController');

const router = Router();

router.use(verifyToken);

router.post('/compatibility',    compatibility);
router.post('/profile-analysis', profileAnalysis);
router.post('/bio-improver',     bioImprover);
router.post('/ice-breaker',      iceBreaker);
router.post('/first-message',    firstMessage);
router.post('/conversation-coach', conversationCoach);
router.post('/match-explanation', matchExplanation);
router.post('/date-planner',           datePlanner);
router.post('/profile-recommendation', profileRecommendation);
router.post('/profile-score',          profileScore);
router.post('/meeting-suggestion',     meetingSuggestion);
router.post('/conversation-starter',   conversationStarter);
router.get('/compatibility/:userId',   compatibilityExplanation);

module.exports = router;
