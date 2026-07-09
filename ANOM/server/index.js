/**
 * index.js – ANOM API server entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { cloudant, DB_NAME } = require("./config/cloudant");
const authRoutes     = require('./routes/auth');
const profileRoutes  = require('./routes/profile');
const usersRoutes    = require('./routes/users');
const interestRoutes = require('./routes/interests');
const aiRoutes       = require('./routes/ai');
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
const { WatsonXAI } = require("@ibm-cloud/watsonx-ai");
const { IamAuthenticator } = require("ibm-cloud-sdk-core");

app.get("/api/models", async (req, res) => {
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
    console.error(err);
    res.status(500).json(err.message);
  }
});
app.use('/api/auth',      authRoutes);
app.use('/api/profile',   profileRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/ai',        aiRoutes);

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
app.get("/users", async (req, res) => {
  try {
    const result = await cloudant.postAllDocs({
      db: DB_NAME,
      includeDocs: true,
    });

    res.json(
      result.result.rows.map((row) => row.doc)
    );
  } catch (err) {
    console.error("USERS ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
      error: err,
    });
  }
});
  app.listen(PORT, () => {
    console.log(`ANOM API listening on http://localhost:${PORT}`);
  });
}

start();
