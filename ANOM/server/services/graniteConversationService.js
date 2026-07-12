/**
 * Focused Granite workflows for match conversation starters and explanations.
 * Keeping these prompts here prevents presentation code from needing to know
 * anything about watsonx.ai response formatting.
 */
'use strict';

const { WatsonXAI } = require('@ibm-cloud/watsonx-ai');
const { IamAuthenticator } = require('ibm-cloud-sdk-core');
const { generateTextWithRetry } = require('./watsonxRateLimiter');
const { extractJson } = require('./extractJson');

let client;

function getClient() {
  if (client) return client;

  const apiKey = process.env.WATSONX_API_KEY || process.env.WATSONX_APIKEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new Error('IBM Granite is not configured. Set WATSONX_API_KEY and WATSONX_PROJECT_ID.');
  }

  client = new WatsonXAI({
    version: '2024-05-31',
    serviceUrl: process.env.WATSONX_URL || 'https://au-syd.ml.cloud.ibm.com',
    authenticator: new IamAuthenticator({ apikey: apiKey }),
  });
  client._projectId = projectId;
  return client;
}

function profileSummary(profile = {}) {
  return {
    name: String(profile.name || 'Not provided'),
    city: String(profile.city || 'Not provided'),
    profession: String(profile.profession || 'Not provided'),
    bio: String(profile.bio || 'Not provided'),
    interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 12) : [],
  };
}

const parseJson = extractJson;

async function generate(prompt, maxTokens = 550) {
  const watsonx = getClient();
  const response = await generateTextWithRetry(watsonx, {
    input: prompt,
    modelId: process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-instruct-v2',
    projectId: watsonx._projectId,
    parameters: { decoding_method: 'greedy', max_new_tokens: maxTokens, min_new_tokens: 40, repetition_penalty: 1.08 },
  });
  const text = response?.result?.results?.[0]?.generated_text;
  if (!text?.trim()) throw new Error('Granite returned an empty response.');
  return parseJson(text);
}

async function generateConversationStarter(userProfile, matchedProfile) {
  const result = await generate(`You are a relationship assistant.

Given these two profiles, generate:
1. First opening message
2. Three ice breakers
3. Three common interests
4. Fun activity suggestion
5. Coffee conversation topic

User profile: ${JSON.stringify(profileSummary(userProfile))}
Matched user profile: ${JSON.stringify(profileSummary(matchedProfile))}

Return JSON only, exactly:
{"starter":"","iceBreakers":["","", ""],"commonInterests":["","", ""],"activity":"","topic":""}`);

  return {
    starter: String(result.starter || ''),
    iceBreakers: Array.isArray(result.iceBreakers) ? result.iceBreakers.filter(Boolean).slice(0, 3) : [],
    commonInterests: Array.isArray(result.commonInterests) ? result.commonInterests.filter(Boolean).slice(0, 3) : [],
    activity: String(result.activity || ''),
    topic: String(result.topic || ''),
  };
}

async function generateCompatibilityExplanation(userProfile, matchedProfile) {
  const result = await generate(`You are a relationship assistant. Assess this potential match using only the supplied profiles. Be warm, specific, and avoid claims that are not supported by the profiles.

User profile: ${JSON.stringify(profileSummary(userProfile))}
Matched user profile: ${JSON.stringify(profileSummary(matchedProfile))}

Return JSON only, exactly:
{"score":92,"explanation":["Same profession","Similar interests","Same city","Similar communication style","Personality compatibility"],"strengths":["","", ""],"challenges":["",""],"relationshipTips":["","", ""]}`);

  return {
    score: Math.max(0, Math.min(100, Number(result.score) || 0)),
    explanation: Array.isArray(result.explanation) ? result.explanation.filter(Boolean).slice(0, 5) : [],
    strengths: Array.isArray(result.strengths) ? result.strengths.filter(Boolean).slice(0, 3) : [],
    challenges: Array.isArray(result.challenges) ? result.challenges.filter(Boolean).slice(0, 3) : [],
    relationshipTips: Array.isArray(result.relationshipTips) ? result.relationshipTips.filter(Boolean).slice(0, 3) : [],
  };
}

module.exports = { generateConversationStarter, generateCompatibilityExplanation };
