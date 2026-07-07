/**
 * routes/users.js
 * GET /api/users — JWT-protected user discovery endpoint.
 */

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { listUsers } = require('../controllers/usersController');

const router = Router();

router.get('/', verifyToken, listUsers);

module.exports = router;
