'use strict';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let queue = Promise.resolve();
let nextRequestAt = 0;

function isRateLimited(error) {
  return error?.status === 429 || error?.statusCode === 429 || error?.response?.status === 429;
}

async function runRequest(client, request) {
  const wait = Math.max(0, nextRequestAt - Date.now());
  if (wait) await delay(wait);
  nextRequestAt = Date.now() + 1200;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await client.generateText(request);
    } catch (error) {
      if (!isRateLimited(error)) throw error;
      console.error('[Watsonx Rate Limit]', error.message);
      if (attempt < 2) await delay(1500);
    }
  }

  // A JSON object lets every existing result parser return its safe defaults.
  return { fallback: true, result: { results: [{ generated_text: '{}' }] } };
}

function generateTextWithRetry(client, request) {
  const scheduled = queue.then(() => runRequest(client, request));
  // Keep the queue progressing even when a non-rate-limit provider failure occurs.
  queue = scheduled.catch(() => undefined);
  return scheduled;
}

module.exports = { delay, generateTextWithRetry };
