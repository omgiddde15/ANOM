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
const { generateTextWithRetry } = require('./watsonxRateLimiter');
const { extractJson } = require('./extractJson');

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
const parseJson = extractJson;

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

const parsed = parseJson(rawText);

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
    const response = await generateTextWithRetry(client, {
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
    const response = await generateTextWithRetry(client, {
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

    const parsed = parseJson(rawText);

    // Normalise: model sometimes returns "reason" (singular) instead of "reasons"
    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons
                  : Array.isArray(parsed.reason)  ? parsed.reason
                  : [];

    return {
      score:               Number(parsed.score)              || 0,
      reasons,
      conversationStarter: String(parsed.conversationStarter || ''),
      meetingSuggestion:   String(parsed.meetingSuggestion   || ''),
    };

  } catch (err) {
    console.error('[graniteService] IBM COMPATIBILITY ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Bio Improver prompt + parser ────────────────────────────────────────────

/**
 * Build a bio-improver prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {string}   bio
 * @param {string[]} interests
 * @returns {string}
 */
function _buildBioPrompt(bio, interests) {
  const interestList = Array.isArray(interests) && interests.length
    ? interests.join(', ')
    : 'None listed';

  return `You are a dating profile copywriter.
Rewrite the bio below to make it attractive, natural, confident, friendly and under 120 words.
Use the person's interests as inspiration but do not just list them.
Respond with ONLY a valid JSON object — no explanation, no markdown, no code fences.

Bio: ${bio || 'No bio provided.'}
Interests: ${interestList}

Return exactly this JSON structure (no extra keys):
{
  "improvedBio": "<rewritten bio, under 120 words>"
}`;
}

/**
 * Parse the model's raw text into the bio-improver shape.
 * Strips markdown fences and extracts the first `{…}` block.
 *
 * @param {string} rawText
 * @returns {{ improvedBio: string }}
 */
function _parseBioResponse(rawText) {
  let text = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '');

  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Model did not return a JSON object. Raw output: ' + rawText.slice(0, 200));
  }

  const parsed = parseJson(rawText);
  return {
    improvedBio: String(parsed.improvedBio || ''),
  };
}

// ─── Public API ─────────────────────────────────────────── (bio improver) ────

/**
 * Rewrite a user's dating profile bio using IBM watsonx.ai.
 *
 * @param {string}   bio
 * @param {string[]} interests
 * @returns {Promise<{ improvedBio: string }>}
 */
async function improveBio(bio, interests) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── improveBio ───────────────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildBioPrompt(bio, interests);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     300,
        min_new_tokens:     20,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM bio-improver response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for bio improver.');
    }

    return _parseBioResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM BIO IMPROVER ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Ice Breaker prompt + parser ─────────────────────────────────────────────

/**
 * Build an ice-breaker prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {object} p1
 * @param {object} p2
 * @returns {string}
 */
function _buildIceBreakerPrompt(p1, p2) {
  const fmt = (p) => [
    `Name: ${p.name       || 'Unknown'}`,
    `Bio: ${p.bio         || 'No bio'}`,
    `Profession: ${p.profession || 'Not specified'}`,
    `City: ${p.city       || 'Not specified'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
  ].join('\n');

  return `Generate exactly five natural conversation starters for these two people.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Profile 1
${fmt(p1)}

Profile 2
${fmt(p2)}

Return exactly this JSON structure (no extra keys):
{
  "iceBreakers": [
    "<question 1>",
    "<question 2>",
    "<question 3>",
    "<question 4>",
    "<question 5>"
  ]
}

Do not include markdown.
Do not explain anything.`;
}

/**
 * Parse the model's raw text into the ice-breaker shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ iceBreakers: string[] }}
 */
function _parseIceBreakerResponse(rawText) {
  const parsed = parseJson(rawText);

  const iceBreakers = Array.isArray(parsed.iceBreakers) ? parsed.iceBreakers : [];

  return { iceBreakers };
}

// ─── Public API ──────────────────────────────────────── (ice breaker) ────────

/**
 * Generate five ice-breaker conversation starters for two matched profiles.
 *
 * @param {object} profile1
 * @param {object} profile2
 * @returns {Promise<{ iceBreakers: string[] }>}
 */
async function generateIceBreakers(profile1, profile2) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateIceBreakers ──────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildIceBreakerPrompt(profile1, profile2);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     400,
        min_new_tokens:     20,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM ice-breaker response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for ice breaker.');
    }

    return _parseIceBreakerResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM ICE BREAKER ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── First Message prompt + parser ───────────────────────────────────────────

/**
 * Build a first-message prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {object} p1  – the sender
 * @param {object} p2  – the recipient
 * @returns {string}
 */
function _buildFirstMessagePrompt(p1, p2) {
  const fmt = (p) => [
    `Name: ${p.name       || 'Unknown'}`,
    `City: ${p.city       || 'Not specified'}`,
    `Profession: ${p.profession || 'Not specified'}`,
    `Bio: ${p.bio         || 'No bio'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
  ].join('\n');

  return `Generate one friendly, natural first message for User 1 to send to User 2.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

User 1 (sender):
${fmt(p1)}

User 2 (recipient):
${fmt(p2)}

Requirements:
- Under 80 words
- Not cheesy
- Mention one common interest if any exist, otherwise reference something from User 2's bio or profession
- Sound human and genuine
- Do not use emojis

Return exactly this JSON structure (no extra keys):
{
  "message": "<the opening message>"
}`;
}

/**
 * Parse the model's raw text into the first-message shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ message: string }}
 */
function _parseFirstMessageResponse(rawText) {
  const parsed = parseJson(rawText);

  return {
    message: String(parsed.message || ''),
  };
}

// ─── Public API ────────────────────────────────────── (first message) ────────

/**
 * Generate one personalised opening message from profile1 to profile2.
 *
 * @param {object} profile1  – the sender
 * @param {object} profile2  – the recipient
 * @returns {Promise<{ message: string }>}
 */
async function generateFirstMessage(profile1, profile2) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateFirstMessage ──────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildFirstMessagePrompt(profile1, profile2);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     200,
        min_new_tokens:     20,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM first-message response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for first message.');
    }

    return _parseFirstMessageResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM FIRST MESSAGE ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Conversation Coach prompt + parser ────────────────────────────────────

/**
 * Build a conversation coach prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {string} lastMessage
 * @returns {string}
 */
function _buildConversationCoachPrompt(lastMessage) {
  return `You are a friendly conversation coach for a dating app user.
Read the user's incoming message below and suggest one short, natural reply the user can send next.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Last message: ${lastMessage}

Requirements:
- Keep the reply conversational, supportive, and easy to continue.
- Do not include emojis.
- Do not add coach commentary or analysis.
- Keep it under 60 words.

Return exactly this JSON structure (no extra keys):
{
  "replySuggestion": "<the reply suggestion>"
}`;
}

/**
 * Parse the model's raw text into the conversation coach shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ replySuggestion: string }}
 */
function _parseConversationCoachResponse(rawText) {
  const parsed = parseJson(rawText);

  return {
    replySuggestion: String(parsed.replySuggestion || ''),
  };
}

// ─── Public API ────────────────────────────────────────────────────── (conversation coach) ───

/**
 * Generate a single short reply suggestion from the user's last message.
 *
 * @param {string} lastMessage
 * @returns {Promise<{ replySuggestion: string }>}
 */
async function generateConversationCoach(lastMessage) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateConversationCoach ───────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildConversationCoachPrompt(lastMessage);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     120,
        min_new_tokens:     20,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM conversation-coach response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for conversation coach.');
    }

    return _parseConversationCoachResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM CONVERSATION COACH ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Match Explanation prompt + parser ───────────────────────────────────────

/**
 * Build a match-explanation prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {object} p1
 * @param {object} p2
 * @returns {string}
 */
function _buildMatchExplanationPrompt(p1, p2) {
  const fmt = (p) => [
    `Name: ${p.name       || 'Unknown'}`,
    `Bio: ${p.bio         || 'No bio'}`,
    `Profession: ${p.profession || 'Not specified'}`,
    `City: ${p.city       || 'Not specified'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
  ].join('\n');

  return `Explain why these two people are a good match.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Profile 1:
${fmt(p1)}

Profile 2:
${fmt(p2)}

Return exactly this JSON structure (no extra keys):
{
  "compatibilityLevel": "<one word or short phrase: e.g. Excellent, Good, Moderate>",
  "summary": "<2-3 sentence overall explanation of why they are compatible>",
  "strengths": [
    "<shared trait or complementary quality 1>",
    "<shared trait or complementary quality 2>",
    "<shared trait or complementary quality 3>",
    "<shared trait or complementary quality 4>",
    "<shared trait or complementary quality 5>"
  ],
  "possibleChallenges": [
    "<potential challenge 1>",
    "<potential challenge 2>"
  ],
  "tips": [
    "<actionable tip for a successful connection 1>",
    "<actionable tip for a successful connection 2>",
    "<actionable tip for a successful connection 3>"
  ]
}`;
}

/**
 * Parse the model's raw text into the match-explanation shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ compatibilityLevel: string, summary: string, strengths: string[], possibleChallenges: string[], tips: string[] }}
 */
function _parseMatchExplanationResponse(rawText) {
  const parsed = parseJson(rawText);

  return {
    compatibilityLevel: String(parsed.compatibilityLevel       || ''),
    summary:            String(parsed.summary                  || ''),
    strengths:          Array.isArray(parsed.strengths)         ? parsed.strengths         : [],
    possibleChallenges: Array.isArray(parsed.possibleChallenges) ? parsed.possibleChallenges : [],
    tips:               Array.isArray(parsed.tips)              ? parsed.tips              : [],
  };
}

// ─── Public API ──────────────────────────────────── (match explanation) ──────

/**
 * Generate a detailed compatibility explanation for two matched profiles.
 *
 * @param {object} profile1
 * @param {object} profile2
 * @returns {Promise<{ compatibilityLevel: string, summary: string, strengths: string[], possibleChallenges: string[], tips: string[] }>}
 */
async function generateMatchExplanation(profile1, profile2) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateMatchExplanation ──────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildMatchExplanationPrompt(profile1, profile2);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     600,
        min_new_tokens:     50,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM match-explanation response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for match explanation.');
    }

    return _parseMatchExplanationResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM MATCH EXPLANATION ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const analyzeProfile = analyseProfile;   // US-spelling alias

// ─── Date Planner prompt + parser ────────────────────────────────────────────

/**
 * Build a date-planner prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {object} p1
 * @param {object} p2
 * @returns {string}
 */
function _buildDatePlannerPrompt(p1, p2) {
  const fmt = (p) => [
    `Name: ${p.name       || 'Unknown'}`,
    `City: ${p.city       || 'Not specified'}`,
    `Profession: ${p.profession || 'Not specified'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
    `Bio: ${p.bio         || 'No bio'}`,
  ].join('\n');

  return `You are a creative date planner for a social matching app.
Generate exactly three personalised date ideas for the two people below.
Base the ideas on their shared interests, city, and personalities.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Profile 1:
${fmt(p1)}

Profile 2:
${fmt(p2)}

Return exactly this JSON structure (no extra keys):
{
  "dateIdeas": [
    {
      "activityName": "<short date title>",
      "location": "<suggested location in their city>",
      "category": "<e.g. Outdoors, Food & Drink, Arts & Culture, Active, Cozy>",
      "estimatedDuration": "<e.g. 2-3 hours, Half day, Full day>",
      "estimatedBudget": "<e.g. Low ($0-$20), Medium ($20-$50), High ($50+), Free>",
      "description": "<2-3 sentence description of the date idea>"
    },
    {
      "activityName": "<short date title>",
      "location": "<suggested location in their city>",
      "category": "<e.g. Outdoors, Food & Drink, Arts & Culture, Active, Cozy>",
      "estimatedDuration": "<e.g. 2-3 hours, Half day, Full day>",
      "estimatedBudget": "<e.g. Low ($0-$20), Medium ($20-$50), High ($50+), Free>",
      "description": "<2-3 sentence description of the date idea>"
    },
    {
      "activityName": "<short date title>",
      "location": "<suggested location in their city>",
      "category": "<e.g. Outdoors, Food & Drink, Arts & Culture, Active, Cozy>",
      "estimatedDuration": "<e.g. 2-3 hours, Half day, Full day>",
      "estimatedBudget": "<e.g. Low ($0-$20), Medium ($20-$50), High ($50+), Free>",
      "description": "<2-3 sentence description of the date idea>"
    }
  ]
}`;
}

/**
 * Parse the model's raw text into the date-planner shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ dateIdeas: Array<{ title: string, description: string, locationType: string }> }}
 */
function _parseDatePlannerResponse(rawText) {
  const parsed = parseJson(rawText);

  const raw = Array.isArray(parsed.dateIdeas) ? parsed.dateIdeas : [];

  const dateIdeas = raw.map((idea) => ({
    activityName:   String(idea.activityName   || idea.title || ''),
    location:       String(idea.location       || idea.locationType || ''),
    category:       String(idea.category       || idea.locationType || ''),
    estimatedDuration: String(idea.estimatedDuration || ''),
    estimatedBudget: String(idea.estimatedBudget || ''),
    description:    String(idea.description    || ''),
  }));

  return { dateIdeas };
}

// ─── Public API ────────────────────────────────────────── (date planner) ─────

/**
 * Generate three personalised date ideas for two matched profiles.
 *
 * @param {object} profile1
 * @param {object} profile2
 * @returns {Promise<{ dateIdeas: Array<{ title: string, description: string, locationType: string }> }>}
 */
async function generateDateIdeas(profile1, profile2) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateDateIdeas ─────────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildDatePlannerPrompt(profile1, profile2);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     500,
        min_new_tokens:     50,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM date-planner response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for date planner.');
    }

    return _parseDatePlannerResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM DATE PLANNER ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Profile Recommendation prompt + parser ───────────────────────────────────

/**
 * Build a profile-recommendation prompt.
 * Embeds the source profile and a compact list of candidates, then asks the
 * model to rank the TOP 5 by compatibility and return ONLY valid JSON.
 *
 * @param {object}   sourceProfile
 * @param {object[]} candidates      – array from getAllProfiles()
 * @returns {string}
 */
function _buildProfileRecommendationPrompt(sourceProfile, candidates) {
  const fmtSource = (p) => [
    `Name: ${p.name       || 'Unknown'}`,
    `City: ${p.city       || 'Not specified'}`,
    `Profession: ${p.profession || 'Not specified'}`,
    `Bio: ${p.bio         || 'No bio'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
  ].join('\n');

  const fmtCandidate = (p) => [
    `userId: ${p.id        || p.userId || ''}`,
    `Name: ${p.name        || 'Unknown'}`,
    `City: ${p.city        || 'Not specified'}`,
    `Profession: ${p.profession || 'Not specified'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
    `Bio: ${p.bio          || 'No bio'}`,
  ].join(', ');

  const candidateList = candidates
    .slice(0, 30)                           // cap prompt size — top 30 candidates
    .map((p, i) => `${i + 1}. ${fmtCandidate(p)}`)
    .join('\n');

  return `You are a matchmaking AI for a social matching app.
Given the source user's profile and a list of candidate profiles, recommend the TOP 5 best matches.
Base your scoring on shared interests, compatible lifestyles, and complementary traits.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Source User:
${fmtSource(sourceProfile)}

Candidates:
${candidateList}

Return exactly this JSON structure (no extra keys):
{
  "recommendations": [
    { "userId": "<candidate userId>", "name": "<candidate name>", "score": <integer 0-100>, "reason": "<1-2 sentence reason>" },
    { "userId": "<candidate userId>", "name": "<candidate name>", "score": <integer 0-100>, "reason": "<1-2 sentence reason>" },
    { "userId": "<candidate userId>", "name": "<candidate name>", "score": <integer 0-100>, "reason": "<1-2 sentence reason>" },
    { "userId": "<candidate userId>", "name": "<candidate name>", "score": <integer 0-100>, "reason": "<1-2 sentence reason>" },
    { "userId": "<candidate userId>", "name": "<candidate name>", "score": <integer 0-100>, "reason": "<1-2 sentence reason>" }
  ]
}

Rules:
- Return exactly 5 recommendations, ordered by score descending.
- "score" must be an integer between 0 and 100.
- "reason" must be specific to the two people, not generic.`;
}

/**
 * Parse the model's raw text into the profile-recommendation shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ recommendations: Array<{ userId: string, name: string, score: number, reason: string }> }}
 */
function _parseProfileRecommendationResponse(rawText) {
  const parsed = parseJson(rawText);

  const raw = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

  const recommendations = raw.map((r) => ({
    userId: String(r.userId || ''),
    name:   String(r.name   || ''),
    score:  Number(r.score) || 0,
    reason: String(r.reason || ''),
  }));

  return { recommendations };
}

// ─── Public API ────────────────────────────────── (profile recommendation) ───

/**
 * Recommend the top 5 profiles for a given source user.
 *
 * @param {object}   sourceProfile  – the requesting user's profile
 * @param {object[]} candidates     – all other profiles from getAllProfiles()
 * @returns {Promise<{ recommendations: Array<{ userId: string, name: string, score: number, reason: string }> }>}
 */
async function generateProfileRecommendations(sourceProfile, candidates) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateProfileRecommendations ─');
  console.log('[graniteService] modelId      :', modelId);
  console.log('[graniteService] projectId    :', projectId);
  console.log('[graniteService] candidates   :', candidates.length);
  console.log('[graniteService] URL          :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildProfileRecommendationPrompt(sourceProfile, candidates);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     600,
        min_new_tokens:     50,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM profile-recommendation response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for profile recommendations.');
    }

    return _parseProfileRecommendationResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM PROFILE RECOMMENDATION ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

// ─── Profile Score prompt + parser ───────────────────────────────────────────

/**
 * Build a profile-score prompt that instructs the model to evaluate a single
 * profile and return ONLY valid JSON with a score and improvement tips.
 *
 * @param {object} profile
 * @returns {string}
 */
function _buildProfileScorePrompt(profile) {
  const interestList = Array.isArray(profile.interests) && profile.interests.length
    ? profile.interests.join(', ')
    : 'None listed';

  // Derive simple completeness signals the model can reason about
  const hasPhoto    = !!(profile.profileImageUrl || profile.photoUrl || profile.profilePhotoUrl);
  const bioWords    = (profile.bio || '').trim().split(/\s+/).filter(Boolean).length;
  const interestCnt = Array.isArray(profile.interests) ? profile.interests.length : 0;

  return `You are a dating profile quality evaluator for a social matching app.
Score the profile below out of 100 and give 2-4 specific, actionable improvement tips.
Do NOT include any explanation, markdown, or code fences — raw JSON only.

Profile:
Name: ${profile.name        || 'Not provided'}
City: ${profile.city        || 'Not provided'}
Profession: ${profile.profession || 'Not provided'}
Bio: ${profile.bio          || 'Not provided'} (${bioWords} words)
Interests: ${interestList} (${interestCnt} listed)
Has profile photo: ${hasPhoto ? 'Yes' : 'No'}

Scoring criteria:
- Bio completeness and quality (30 pts)
- Number and variety of interests (20 pts)
- Profession and city provided (15 pts)
- Profile photo present (20 pts)
- Overall appeal and authenticity (15 pts)

Return exactly this JSON structure (no extra keys):
{
  "score": <integer 0-100>,
  "tips": [
    "<specific improvement tip 1>",
    "<specific improvement tip 2>",
    "<specific improvement tip 3>"
  ]
}`;
}

/**
 * Parse the model's raw text into the profile-score shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ score: number, tips: string[] }}
 */
function _parseProfileScoreResponse(rawText) {
  const parsed = parseJson(rawText);

  return {
    score: Number(parsed.score)             || 0,
    tips:  Array.isArray(parsed.tips) ? parsed.tips : [],
  };
}

// ─── Public API ──────────────────────────────────────── (profile score) ──────

/**
 * Score a user's dating profile and return improvement tips.
 *
 * @param {object} profile  – profile from getProfile()
 * @returns {Promise<{ score: number, tips: string[] }>}
 */
async function generateProfileScore(profile) {
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateProfileScore ───────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] URL       :', process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com');

  const prompt = _buildProfileScorePrompt(profile);

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     200,
        min_new_tokens:     20,
        repetition_penalty: 1.1,
      },
    });

    console.log('[graniteService] IBM profile-score response:');
    console.dir(response, { depth: null });

    const rawText = response?.result?.results?.[0]?.generated_text ?? '';

    console.log('RAW AI RESPONSE:');
    console.log(rawText);

    if (!rawText.trim()) {
      throw new Error('watsonx.ai returned an empty response for profile score.');
    }

    return _parseProfileScoreResponse(rawText);

  } catch (err) {
    console.error('[graniteService] IBM PROFILE SCORE ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    throw err;
  }
}

// ─── Meeting Venue prompt + parser ───────────────────────────────────────────

function _meetingVenueFallback(city) {
  const location = city || 'Your city';
  return [
    { name: 'Cafe Coffee Day', address: location, reason: 'Good place to talk' },
    { name: 'Starbucks',       address: location, reason: 'Popular meeting place' },
    { name: 'Public Library',  address: location, reason: 'Quiet environment' },
    { name: 'Central Park',    address: location, reason: 'Outdoor meetup' },
    { name: 'Shopping Mall',   address: location, reason: 'Multiple activities' },
  ];
}

/**
 * Build a meeting-venue prompt that instructs the model to return ONLY valid JSON.
 *
 * @param {string}   city
 * @param {string[]} interests
 * @param {object}   personA
 * @param {object}   personB
 * @returns {string}
 */
function _buildMeetingVenuePrompt(city, interests, personA, personB) {
  const fmt = (p, label) => [
    `${label}:`,
    `Name: ${p.name || 'Unknown'}`,
    `Bio: ${p.bio || 'No bio'}`,
    `Interests: ${(Array.isArray(p.interests) ? p.interests : []).join(', ') || 'None listed'}`,
    `City: ${p.city || 'Not specified'}`,
    `Profession: ${p.profession || 'Not specified'}`,
  ].join('\n');

  const interestList = Array.isArray(interests) && interests.length
    ? interests.join(', ')
    : 'None shared';

  return `You are an assistant helping two matched users choose a meeting place.
Return ONLY valid JSON.

{
  "venues":[
    {
      "name":"Cafe Coffee Day",
      "address":"Mumbai",
      "reason":"Quiet cafe for conversation"
    },
    {
      "name":"Starbucks",
      "address":"Mumbai",
      "reason":"Comfortable seating"
    },
    {
      "name":"Phoenix Mall",
      "address":"Mumbai",
      "reason":"Food and activities together"
    },
    {
      "name":"Sanjay Gandhi National Park",
      "address":"Mumbai",
      "reason":"Nature walk"
    },
    {
      "name":"Marine Drive",
      "address":"Mumbai",
      "reason":"Relaxed evening meetup"
    }
  ]
}

${fmt(personA, 'Person A profile')}
${fmt(personB, 'Person B profile')}
City: ${city}
Shared interests: ${interestList}

Suggest exactly five safe, public meeting places in the given city, personalized to both profiles and their shared interests.
Use real or realistic venue names for the city.
Return the JSON object only — no markdown, no code fences, no extra text.`;
}

/**
 * Parse the model's raw text into the meeting-venue shape.
 * Reuses the shared parseJson() helper.
 *
 * @param {string} rawText
 * @returns {{ venues: Array<{ name: string, address: string, reason: string }> }}
 */
function _parseMeetingVenueResponse(rawText) {
  const parsed = parseJson(rawText);
  const raw = Array.isArray(parsed.venues) ? parsed.venues : [];

  const venues = raw.map((v) => ({
    name:    String(v.name    || ''),
    address: String(v.address || ''),
    reason:  String(v.reason  || ''),
  })).filter((v) => v.name);

  return { venues };
}

// ─── Public API ──────────────────────────────────────── (meeting venues) ──────

/**
 * Generate five personalised meeting-venue suggestions for two matched users.
 *
 * @param {string}   city
 * @param {string[]} interests
 * @param {object}   personA
 * @param {object}   personB
 * @returns {Promise<{ venues: Array<{ name: string, address: string, reason: string }> }>}
 */
async function generateMeetingVenues(city, interests = [], personA = {}, personB = {}) {
  const fallbackVenues = _meetingVenueFallback(city);
  const client    = _getClient();
  const projectId = client._projectId;
  const modelId   = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2';

  console.log('[graniteService] ── generateMeetingVenues ────────');
  console.log('[graniteService] modelId   :', modelId);
  console.log('[graniteService] projectId :', projectId);
  console.log('[graniteService] city      :', city);

  const prompt = _buildMeetingVenuePrompt(city, interests, personA, personB);

  let rawText = '';
  let parsed  = null;
  let venues  = fallbackVenues;

  try {
    const response = await generateTextWithRetry(client, {
      input:      prompt,
      modelId,
      projectId,
      parameters: {
        decoding_method:    'greedy',
        max_new_tokens:     700,
        min_new_tokens:     50,
        repetition_penalty: 1.1,
      },
    });

    rawText = response?.result?.results?.[0]?.generated_text ?? '';
    console.log('Meeting AI Raw:', rawText);

    if (!rawText.trim()) {
      console.log('Meeting Parsed:', null);
      console.log('Meeting Final:', fallbackVenues);
      return { venues: fallbackVenues };
    }

    try {
      parsed = _parseMeetingVenueResponse(rawText);
      console.log('Meeting Parsed:', parsed);

      if (parsed.venues.length) {
        venues = parsed.venues.slice(0, 5);
      }
    } catch (parseError) {
      console.error('[graniteService] Meeting venue parse failed:', parseError.message);
      parsed = null;
      venues = fallbackVenues;
    }

    if (!venues.length) {
      venues = fallbackVenues;
    }

    console.log('Meeting Final:', venues);
    return { venues };

  } catch (err) {
    console.error('[graniteService] MEETING VENUE ERROR:');
    console.error(err?.result ?? err?.response?.data ?? err.message ?? err);
    console.log('Meeting AI Raw:', rawText);
    console.log('Meeting Parsed:', parsed);
    console.log('Meeting Final:', fallbackVenues);
    return { venues: fallbackVenues };
  }
}

module.exports = {
  analyseCompatibility,
  analyseProfile,
  analyzeProfile,
  improveBio,
  generateIceBreakers,
  generateFirstMessage,
  generateConversationCoach,
  generateMatchExplanation,
  generateDateIdeas,
  generateProfileRecommendations,
  generateProfileScore,
  generateMeetingVenues,
};
