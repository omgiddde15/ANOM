/**
 * services/graniteService.js
 *
 * IBM watsonx.ai (Granite) client used by all AI routes.
 *
 * Required environment variables:
 *   WATSONX_API_KEY    – IAM API key  (WATSONX_APIKEY accepted as alias)
 *   WATSONX_PROJECT_ID – watsonx.ai project ID
 *   WATSONX_URL        – service URL  (default: https://au-syd.ml.cloud.ibm.com  ← Sydney)
 *   WATSONX_MODEL_ID   – model to use (default: ibm/granite-13b-instruct-v2)
 *
 * SDK: @ibm-cloud/watsonx-ai ^1.7.x
 */

'use strict';

const { WatsonXAI }      = require('@ibm-cloud/watsonx-ai');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');

// ─── Singleton client ─────────────────────────────────────────────────────────

/** @type {WatsonXAI | null} */
let _client = null;

/**
 * Return the shared WatsonXAI client, creating it on first call.
 * Throws clearly if required environment variables are absent.
 *
 * @returns {WatsonXAI & { _projectId: string }}
 */
function _getClient() {
  if (_client) return _client;

  // Accept both spellings — WATSONX_API_KEY (user-requested) and WATSONX_APIKEY (SDK convention)
  const apiKey     = process.env.WATSONX_API_KEY || process.env.WATSONX_APIKEY;
  const projectId  = process.env.WATSONX_PROJECT_ID;
  const serviceUrl = process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com';

  if (!apiKey) {
    throw new Error(
      'Missing watsonx.ai API key. Set WATSONX_API_KEY (or WATSONX_APIKEY) in your .env file.'
    );
  }
  if (!projectId) {
    throw new Error(
      'Missing watsonx.ai project ID. Set WATSONX_PROJECT_ID in your .env file.'
    );
  }

  console.log('[graniteService] Initialising WatsonXAI client');
  console.log('[graniteService] serviceUrl :', serviceUrl);
  console.log('[graniteService] projectId  :', projectId);

  _client = new WatsonXAI({
    version:       '2024-05-31',
    serviceUrl,
    authenticator: new IamAuthenticator({ apikey: apiKey }),
  });

  // Attach projectId so callers don't need to read env again.
  _client._projectId = projectId;

  return _client;
}

// ─── Compatibility prompt + parser ───────────────────────────────────────────

/**
 * Build a compatibility prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {object} p1
 * @param {object} p2
 * @returns {string}
 */
function _buildPrompt(p1, p2) {
  const fmt = (p) => [
    `Name: ${p.name        || 'Unknown'}`,
    `City: ${p.city        || 'Not specified'}`,
    `Profession: ${p.profession || 'Not specified'}`,
    `Bio: ${p.bio          || 'No bio'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
    `Marital status: ${p.maritalStatus || 'Not specified'}`,
  ].join('\n');

  return `You are a compatibility analyst for a social matching app.
Compare the two profiles below and respond with ONLY a valid JSON object.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Profile 1:
${fmt(p1)}

Profile 2:
${fmt(p2)}

Return exactly this JSON structure (no extra keys):
{
  "score": <integer 0-100>,
  "reasons": [<string>, ...],
  "conversationStarter": <string>,
  "meetingSuggestion": <string>
}

Rules:
- "score" reflects shared interests, goals, and lifestyle compatibility.
- "reasons" lists 2-4 concrete shared traits or complementary qualities.
- "conversationStarter" is a natural opening question one could ask the other.
- "meetingSuggestion" recommends a type of venue or activity that suits both.`;
}

/**
 * Extract the first JSON object from the model's raw text output.
 * Strips markdown fences that the model may include despite instructions.
 *
 * @param {string} rawText
 * @returns {{ score: number, reasons: string[], conversationStarter: string, meetingSuggestion: string }}
 */
function _parseResponse(rawText) {
  // Strip optional markdown code fences (```json … ``` or ``` … ```)
  let text = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');

  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Model did not return a JSON object. Raw output: ' + rawText.slice(0, 200));
  }

  const parsed = JSON.parse(text.slice(start, end + 1));

  // Normalise: model sometimes returns "reason" (singular) instead of "reasons"
  const reasons = Array.isArray(parsed.reasons)  ? parsed.reasons
                : Array.isArray(parsed.reason)   ? parsed.reason
                : [];

  return {
    score:               Number(parsed.score)               || 0,
    reasons,
    conversationStarter: String(parsed.conversationStarter  || ''),
    meetingSuggestion:   String(parsed.meetingSuggestion    || ''),
  };
}

// ─── Profile-analysis prompt + parser ────────────────────────────────────────

/**
 * Build a personality-analysis prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {string}   bio
 * @param {string[]} interests
 * @returns {string}
 */
function _buildProfilePrompt(bio, interests) {
  const interestList = Array.isArray(interests) && interests.length
    ? interests.join(', ')
    : 'None listed';

  return `You are a personality analyst for a social matching app.
Analyse the person described below and respond with ONLY a valid JSON object.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Bio: ${bio || 'No bio provided.'}
Interests: ${interestList}

Return exactly this JSON structure (no extra keys):
{

  "personality": "<2-3 sentence personality description>",
  "communicationStyle": "<1-2 sentence description of how they likely communicate>",
  "strengths": "<2-3 sentence description of their key strengths in a relationship>",
  "relationshipGoals": "<1-2 sentence description of likely relationship goals>",
  "summary": "<1 sentence overall summary>"
  Return ONLY one complete JSON object.
Do not stop before finishing.
Do not truncate the output.
Do not include markdown.
}`;

}

/**
 * Parse the model's raw text into the profile-analysis shape.
 * Strips markdown fences and extracts the first `{…}` block.
 *
 * @param {string} rawText
 * @returns {{ personality: string, communicationStyle: string, strengths: string, relationshipGoals: string, summary: string }}
 */
function _parseProfileResponse(rawText) {
  let text = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");

  const first = text.indexOf("{");

  if (first === -1) {
    throw new Error("No JSON found.");
  }

  // Find the matching closing brace
  let braces = 0;
  let last = -1;

  for (let i = first; i < text.length; i++) {
    if (text[i] === "{") braces++;
    if (text[i] === "}") braces--;

    if (braces === 0) {
      last = i;
      break;
    }
  }

  if (last === -1) {
    throw new Error("Incomplete JSON from AI.");
  }

  const jsonText = text.substring(first, last + 1);

  console.log("JSON extracted:");
  console.log(jsonText);

  const parsed = JSON.parse(jsonText);

  return {
    personality: parsed.personality || "",
    communicationStyle: parsed.communicationStyle || "",
    strengths: parsed.strengths || "",
    relationshipGoals: parsed.relationshipGoals || "",
    summary:
      parsed.summary ||
      `${parsed.personality}. ${parsed.relationshipGoals}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse a single user's personality from their bio and interests.
 *
 * @param {string}   bio
 * @param {string[]} interests
 * @returns {Promise<{ personality: string, communicationStyle: string, strengths: string, relationshipGoals: string, summary: string }>}
 */
async function analyseProfile(bio, interests) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || "ibm/granite-8b-code-instruct";

  console.log('[graniteService] ── analyseProfile ──────────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildProfilePrompt(bio, interests);

  try {
    const response = await client.generateText({
      input:      prompt,
      modelId,
      projectId,
      parameters: {
  max_new_tokens: 800,
  min_new_tokens: 50,
  decoding_method: "greedy",
  repetition_penalty: 1.05
},
    });

    console.log('[graniteService] IBM profile response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';
console.log("RAW AI RESPONSE:");
console.log(rawText);
    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for profile analysis.');
    }

    return _parseProfileResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM PROFILE ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

/**
 * Analyse compatibility between two profile objects.
 *
 * @param {object} profile1
 * @param {object} profile2
 * @returns {Promise<{ score: number, reasons: string[], conversationStarter: string, meetingSuggestion: string }>}
 */
async function analyseCompatibility(profile1, profile2) {
  const client    = _getClient();
  const projectId = client._projectId;
 const modelId =
    process.env.WATSONX_MODEL_ID || "ibm/granite-8b-code-instruct";
  console.log('[graniteService] ── analyseCompatibility ─────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildPrompt(profile1, profile2);

  try {
    const response = await client.generateText({
      input:      prompt,
      modelId,
      projectId,
      parameters: {
    max_new_tokens: 400,
    temperature: 0.2,
    top_p: 0.9
},
    });

    console.log('[graniteService] IBM compatibility response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';
console.log("RAW AI RESPONSE:");
console.log(rawText);
    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for compatibility analysis.');
    }

    return _parseResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM COMPATIBILITY ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const analyzeProfile = analyseProfile;   // US-spelling alias

module.exports = {
  analyseCompatibility,
  analyseProfile,
  analyzeProfile,
};

