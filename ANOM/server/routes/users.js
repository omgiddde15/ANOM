/**
 * routes/users.js
 * GET /api/users — JWT-protected user discovery endpoint.
 */

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { listUsers, getUserById, analytics } = require('../controllers/usersController');

const router = Router();

router.get('/', verifyToken, listUsers);
router.get('/analytics', verifyToken, analytics);
router.get('/:id', verifyToken, getUserById);
module.exports = router;
