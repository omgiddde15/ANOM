/**
 * auth.js – JWT verification middleware.
 *
 * Reads the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded payload to req.user before calling next().
 */

const jwt = require('jsonwebtoken');

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function verifyToken(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, message: 'Authentication is not configured.' });
  }
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided."
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch {

    return res.status(401).json({
      success: false,
      message: "Invalid token."
    });
  }
}

module.exports = { verifyToken };
