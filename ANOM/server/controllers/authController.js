/**
 * authController.js
 *
 * Handlers for:
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   GET  /api/auth/me   (protected)
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { createUser, findByEmail, findById } = require('../models/userStore');

// ─── Validation schemas ──────────────────────────────────────────────────────

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 *
 * Flow:
 *  1. Joi validates { name, email, password }
 *  2. findByEmail() → Cloudant postFind — 409 if already registered
 *  3. bcrypt.hash(password, 12)
 *  4. createUser() → cloudant.putDocument() on anom_users
 *  5. Sign JWT with { id, email }
 *  6. Return { success, message, token, user: { id, name, email } }
 */
async function signup(req, res) {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, message: 'Authentication is not configured.' });
  }
  // ── 1. Validate input ───────────────────────────────────────────────────────
  const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(422).json({ success: false, errors: messages });
  }

  // ── 2. Duplicate email check in Cloudant ────────────────────────────────────
  const existing = await findByEmail(value.email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }

  // ── 3. Hash password ────────────────────────────────────────────────────────
  const hashed = await bcrypt.hash(value.password, SALT_ROUNDS);

  // ── 4. Persist to Cloudant ──────────────────────────────────────────────────
  const user = await createUser({ ...value, password: hashed });

  // ── 5. Issue JWT ────────────────────────────────────────────────────────────
  const token = signToken({ id: user.id, email: user.email });

  // ── 6. Respond — only public fields, never the password ────────────────────
  return res.status(201).json({
    success: true,
    message: 'Signup successful',
    token,
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
    },
  });
}

/**
 * POST /api/auth/login
 *
 * Flow:
 *  1. Joi validates { email, password }
 *  2. findByEmail() → Cloudant postFind (Mango query on anom_users)
 *  3. bcrypt.compare() against stored hash — 401 on mismatch or missing user
 *  4. Sign JWT with { id, email }
 *  5. Return { success, message, token, user: { id, name, email } }
 */
async function login(req, res) {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, message: 'Authentication is not configured.' });
  }
  // ── 1. Validate input ───────────────────────────────────────────────────────
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(422).json({ success: false, errors: messages });
  }

  // ── 2. Look up user in Cloudant ─────────────────────────────────────────────
  // findByEmail returns the full doc including password hash, or null.
  const user = await findByEmail(value.email);
  if (!user) {
    // Uniform message — never hint which field is wrong (prevents user enumeration).
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // ── 3. Verify password ──────────────────────────────────────────────────────
  const passwordMatch = await bcrypt.compare(value.password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // ── 4. Issue JWT ────────────────────────────────────────────────────────────
  const token = signToken({ id: user.id, email: user.email });

  // ── 5. Respond — explicit projection, never the password ───────────────────
  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
    },
  });
}

/**
 * GET /api/auth/me  – requires verifyToken middleware
 */
async function me(req, res) {
  const user = await findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  return res.status(200).json({ success: true, user });
}

module.exports = { signup, login, me };
