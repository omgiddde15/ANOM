/**
 * config/cloudant.js
 *
 * Initialises a reusable IBM Cloudant client using IAM authentication.
 * Credentials are read exclusively from environment variables — nothing
 * is hard-coded here.
 *
 * Usage:
 *   const { cloudant, initCloudant } = require('./config/cloudant');
 *
 *   // At startup:
 *   await initCloudant();
 *
 *   // In controllers / models:
 *   const { cloudant } = require('../config/cloudant');
 *   await cloudant.getDocument({ db: DB_NAME, docId: id });
 */

const { CloudantV1 } = require('@ibm-cloud/cloudant');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

const DB_NAME       = process.env.CLOUDANT_DB        || 'anom_users';
const INTERESTS_DB  = process.env.CLOUDANT_INTERESTS_DB || 'anom_interests';

// ─── Build the client (lazy — no network call yet) ────────────────────────────

function _createClient() {
  const url = process.env.CLOUDANT_URL;
  const apikey = process.env.CLOUDANT_APIKEY;

  if (!url || !apikey) {
    throw new Error(
      'Missing Cloudant credentials. Set CLOUDANT_URL and CLOUDANT_APIKEY in your .env file.'
    );
  }

  return new CloudantV1({
    authenticator: new IamAuthenticator({ apikey }),
    serviceUrl: url,
  });
}

// Singleton — created once, reused everywhere.
let _client = null;

/**
 * Returns the shared CloudantV1 instance.
 * Throws if initCloudant() has not been called yet.
 */
function getClient() {
  if (!_client) {
    throw new Error('Cloudant client is not initialised. Call initCloudant() first.');
  }
  return _client;
}

// ─── Startup initialisation ───────────────────────────────────────────────────

/**
 * 1. Creates the CloudantV1 client.
 * 2. Verifies connectivity by fetching server info.
 * 3. Creates the "anom_users" database if it does not already exist.
 *
 * Call this once from index.js before app.listen().
 */
async function initCloudant() {
  // ── 0. Build client (validates env vars synchronously) ───────────────────
  try {
    _client = _createClient();
  } catch (err) {
    throw new Error(`❌ ${err.message}`);
  }

  // ── 1. Verify connection ──────────────────────────────────────────────────
  try {
    await _client.getServerInformation();
    console.log('✅ Connected to IBM Cloudant');
  } catch (err) {
    throw new Error(`❌ Could not connect to IBM Cloudant: ${err.message}`);
  }

  // ── 2. Ensure the database exists ─────────────────────────────────────────
  try {
    await _client.getDatabaseInformation({ db: DB_NAME });
    // Database already exists — nothing to do.
  } catch (err) {
    if (err.status === 404) {
      await _client.putDatabase({ db: DB_NAME });
    } else {
      throw new Error(`❌ Error checking database "${DB_NAME}": ${err.message}`);
    }
  }

  console.log(`✅ Database ready: ${DB_NAME}`);

  // ── 2b. Ensure the interests database exists ──────────────────────────────
  try {
    await _client.getDatabaseInformation({ db: INTERESTS_DB });
  } catch (err) {
    if (err.status === 404) {
      await _client.putDatabase({ db: INTERESTS_DB });
      console.log(`✅ Database ready: ${INTERESTS_DB}`);
    } else {
      throw new Error(`❌ Error checking database "${INTERESTS_DB}": ${err.message}`);
    }
  }

  // ── 3. Ensure the email Mango index exists ────────────────────────────────
  // postIndex is idempotent: re-running with the same name is a no-op.
  try {
    await _client.postIndex({
      db: DB_NAME,
      index: {
        fields: [{ type: 'asc' }, { email: 'asc' }],
      },
      name: 'idx-type-email',
      type: 'json',
    });
  } catch (err) {
    console.warn(`⚠️  Could not create email index: ${err.message}`);
  }

  // ── 4. Ensure the userId index for profile lookups ────────────────────────
  try {
    await _client.postIndex({
      db: DB_NAME,
      index: { fields: [{ type: 'asc' }, { userId: 'asc' }] },
      name: 'idx-type-userId',
      type: 'json',
    });
  } catch (err) {
    console.warn(`⚠️  Could not create userId index: ${err.message}`);
  }

  // ── 5. Indexes on the interests database ─────────────────────────────────
  const interestIndexes = [
    { fields: [{ fromUserId: 'asc' }],              name: 'idx-interest-from'        },
    { fields: [{ toUserId: 'asc' }],                name: 'idx-interest-to'          },
    { fields: [{ fromUserId: 'asc' }, { toUserId: 'asc' }], name: 'idx-interest-pair' },
  ];
  for (const { fields, name } of interestIndexes) {
    try {
      await _client.postIndex({ db: INTERESTS_DB, index: { fields }, name, type: 'json' });
    } catch (err) {
      console.warn(`⚠️  Could not create interest index "${name}": ${err.message}`);
    }
  }
}

// Named export so controllers can do:  const { cloudant } = require('../config/cloudant')
const cloudant = new Proxy(
  {},
  {
    get(_target, prop) {
      return getClient()[prop];
    },
  }
);

module.exports = { cloudant, initCloudant, DB_NAME, INTERESTS_DB };
