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

const DB_NAME       = process.env.CLOUDANT_DB            || 'anom_users';
const INTERESTS_DB  = process.env.CLOUDANT_INTERESTS_DB  || 'anom_interests';
const MESSAGES_DB   = process.env.CLOUDANT_MESSAGES_DB   || 'anom_messages';
const MEETINGS_DB   = process.env.CLOUDANT_MEETINGS_DB   || 'anom_meetings';
const NOTIFICATIONS_DB = process.env.CLOUDANT_NOTIFICATIONS_DB || 'anom_notifications';

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
const cache = new Map();
const inFlightReads = new Map();
const CACHE_TTL_MS = 5000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (item.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function remember(key, value) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

function isRateLimited(error) {
  return error?.status === 429 || error?.statusCode === 429 || error?.response?.status === 429;
}

async function callCloudant(method, args) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getClient()[method](args);
    } catch (error) {
      if (!isRateLimited(error) || attempt === 2) throw error;
      console.error('[Cloudant] rate limited; retrying:', error.message);
      await delay(1500);
    }
  }
}

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

  // ── 2c. Ensure the messages database exists ───────────────────────────────
  try {
    await _client.getDatabaseInformation({ db: MESSAGES_DB });
  } catch (err) {
    if (err.status === 404) {
      await _client.putDatabase({ db: MESSAGES_DB });
      console.log(`✅ Database ready: ${MESSAGES_DB}`);
    } else {
      throw new Error(`❌ Error checking database "${MESSAGES_DB}": ${err.message}`);
    }
  }

  // ── 5. Indexes on the interests database ─────────────────────────────────
  const interestIndexes = [
    { fields: [{ type: 'asc' }, { fromUserId: 'asc' }],              name: 'idx-interest-type-from'        },
    { fields: [{ type: 'asc' }, { toUserId: 'asc' }],                name: 'idx-interest-type-to'          },
    { fields: [{ type: 'asc' }, { fromUserId: 'asc' }, { toUserId: 'asc' }], name: 'idx-interest-type-pair' },
    { fields: [{ type: 'asc' }, { status: 'asc' }],                name: 'idx-interest-type-status'      },
    { fields: [{ type: 'asc' }, { createdAt: 'asc' }],             name: 'idx-interest-type-createdAt'   },
    { fields: [{ fromUserId: 'asc' }, { status: 'asc' }],           name: 'idx-interest-from-status'      },
    { fields: [{ toUserId: 'asc' }, { status: 'asc' }],             name: 'idx-interest-to-status'        },
  ];
  for (const { fields, name } of interestIndexes) {
    try {
      await _client.postIndex({ db: INTERESTS_DB, index: { fields }, name, type: 'json' });
    } catch (err) {
      console.warn(`⚠️  Could not create interest index "${name}": ${err.message}`);
    }
  }

  // ── 6. Indexes on the messages database ───────────────────────────────────
  const messageIndexes = [
    {
      fields: [{ type: 'asc' }, { conversationId: 'asc' }, { createdAt: 'asc' }],
      name: 'idx-msg-conversation-created',
    },
  ];
  for (const { fields, name } of messageIndexes) {
    try {
      await _client.postIndex({ db: MESSAGES_DB, index: { fields }, name, type: 'json' });
    } catch (err) {
      console.warn(`⚠️  Could not create message index "${name}": ${err.message}`);
    }
  }

  try {
    await _client.getDatabaseInformation({ db: MEETINGS_DB });
  } catch (err) {
    if (err.status === 404) {
      await _client.putDatabase({ db: MEETINGS_DB });
      console.log(`Database ready: ${MEETINGS_DB}`);
    } else {
      throw new Error(`Error checking database "${MEETINGS_DB}": ${err.message}`);
    }
  }

  try {
    await _client.postIndex({
      db: MEETINGS_DB,
      index: { fields: [{ type: 'asc' }, { requesterId: 'asc' }, { date: 'asc' }] },
      name: 'idx-meeting-requester-date',
      type: 'json',
    });
    await _client.postIndex({
      db: MEETINGS_DB,
      index: { fields: [{ type: 'asc' }, { partnerId: 'asc' }, { date: 'asc' }] },
      name: 'idx-meeting-partner-date',
      type: 'json',
    });
  } catch (err) {
    console.warn(`Could not create meeting indexes: ${err.message}`);
  }

  // ── Notifications database ───────────────────────────────────────────────
  try {
    await _client.getDatabaseInformation({ db: NOTIFICATIONS_DB });
  } catch (err) {
    if (err.status === 404) {
      await _client.putDatabase({ db: NOTIFICATIONS_DB });
      console.log(`Database ready: ${NOTIFICATIONS_DB}`);
    } else {
      throw new Error(`Error checking database "${NOTIFICATIONS_DB}": ${err.message}`);
    }
  }

  try {
    await _client.postIndex({
      db: NOTIFICATIONS_DB,
      index: { fields: ['recipientUserId', 'createdAt'] },
      name: 'notifications-by-user-createdAt',
      type: 'json',
    });
    await _client.postIndex({
      db: NOTIFICATIONS_DB,
      index: { fields: ['recipientUserId', 'isRead'] },
      name: 'notifications-by-user-isread',
      type: 'json',
    });
  } catch (err) {
    console.warn(`Could not create notification indexes: ${err.message}`);
  }
}

// Named export so controllers can do:  const { cloudant } = require('../config/cloudant')
const cloudant = new Proxy(
  {},
  {
    get(_target, prop) {
      const readMethods = new Set(['postFind', 'getDocument', 'postAllDocs']);
      const writeMethods = new Set(['putDocument', 'deleteDocument', 'postDocument', 'bulkDocs']);
      if (typeof getClient()[prop] !== 'function') return getClient()[prop];

      return async (args) => {
        if (readMethods.has(prop)) {
          const key = `${String(prop)}:${JSON.stringify(args)}`;
          const hit = cached(key);
          if (hit) return hit;
          if (inFlightReads.has(key)) return inFlightReads.get(key);

          const request = callCloudant(prop, args)
            .then((result) => remember(key, result))
            .finally(() => inFlightReads.delete(key));
          inFlightReads.set(key, request);
          return request;
        }

        const result = await callCloudant(prop, args);
        if (writeMethods.has(prop)) cache.clear();
        return result;
      };
    },
  }
);

module.exports = { cloudant, initCloudant, DB_NAME, INTERESTS_DB, MESSAGES_DB, MEETINGS_DB, NOTIFICATIONS_DB };
