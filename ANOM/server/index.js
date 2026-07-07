/**
 * index.js – ANOM API server entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes     = require('./routes/auth');
const profileRoutes  = require('./routes/profile');
const usersRoutes    = require('./routes/users');
const interestRoutes = require('./routes/interests');
const { initCloudant } = require('./config/cloudant');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',      authRoutes);
app.use('/api/profile',   profileRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/interests', interestRoutes);

// Health-check (useful for container probes)
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ANOM API is running.' });
});
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Hello from ANOM AI Backend!"
  });
});
// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await initCloudant();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`ANOM API listening on http://localhost:${PORT}`);
  });
}

start();
