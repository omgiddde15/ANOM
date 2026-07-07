/**
 * controllers/usersController.js
 *
 * GET /api/users
 * Returns all user profiles except the authenticated user's own.
 */

const { getAllProfiles } = require('../models/profileStore');

/**
 * GET /api/users
 * Requires a valid JWT (attached via verifyToken middleware).
 * req.user.id is excluded from results.
 */
async function listUsers(req, res) {
  const users = await getAllProfiles(req.user.id);
  return res.status(200).json({ success: true, users });
}

module.exports = { listUsers };
