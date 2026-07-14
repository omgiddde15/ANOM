/**
 * index.js – ANOM API server entry point
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const authRoutes       = require('./routes/auth');
const profileRoutes    = require('./routes/profile');
const usersRoutes      = require('./routes/users');
const interestRoutes   = require('./routes/interests');
const aiRoutes         = require('./routes/ai');
const chatRoutes       = require('./routes/chat');
const meetingRoutes    = require('./routes/meetings');
const uploadRoutes     = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const { initCloudant } = require('./config/cloudant');
const { initSocket } = require('./socket');
const { verifyToken } = require('./middleware/auth');
const bcrypt = require('bcrypt');
const { createUser, findByEmail } = require('./models/userStore');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global middleware ────────────────────────────────────────────────────────

const clientOrigins = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173"
)
.split(",")
.map(origin => origin.trim());
app.use((req, res, next) => {
  console.log("Origin:", req.headers.origin);
  next();
});
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
const { WatsonXAI } = require("@ibm-cloud/watsonx-ai");
const { IamAuthenticator } = require("ibm-cloud-sdk-core");

app.get("/api/models", verifyToken, async (_req, res) => {
  try {
    const client = new WatsonXAI({
      version: "2024-05-31",
      serviceUrl: process.env.WATSONX_URL,
      authenticator: new IamAuthenticator({
        apikey: process.env.WATSONX_API_KEY,
      }),
    });

    const result = await client.listFoundationModelSpecs();

    res.json(result.result);
  } catch (err) {
    console.error('MODEL LIST ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Unable to load model specifications.' });
  }
});
app.use('/api/auth',       authRoutes);
app.use('/api/profile',    profileRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/interests',  interestRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/chat',       chatRoutes);
app.use('/api/meetings',   meetingRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/notifications', notificationRoutes);

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
  const status = err.type === 'entity.too.large' ? 413 : err.status || 500;
  res.status(status).json({ success: false, message: status === 413 ? 'Request payload is too large.' : 'Internal server error.' });
});

// ─── Demo Users Initialization ────────────────────────────────────────────────

async function initDemoUsers() {
  const demoUsers = [
    { name: "Om", email: "om@example.com", password: "demo1234" },
    { name: "Priya", email: "priya@example.com", password: "demo1234" },
  ];

  for (const userData of demoUsers) {
    const existing = await findByEmail(userData.email);
    if (!existing) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      await createUser({
        ...userData,
        password: hashedPassword,
      });
      console.log(`Created demo user: ${userData.email}`);
    }
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await initCloudant();
    await initDemoUsers();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`ANOM API listening on http://localhost:${PORT}`);
    console.log('Socket.IO ready');
  });
}

start();
