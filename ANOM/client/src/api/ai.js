import api from './client';

export async function analyzeProfile(bio, interests) {
  const res = await api.post('/ai/profile-analysis', { bio, interests });
  return res.data;
}

export async function getCompatibility(user1Id, user2Id) {
  const res = await api.post('/ai/compatibility', { user1Id, user2Id });
  return res.data;
}

export async function getProfileScore(userId) {
  const res = await api.post('/ai/profile-score', { userId });
  return res.data;
}

export async function getMatchExplanation(user1Id, user2Id) {
  const res = await api.post('/ai/match-explanation', { user1Id, user2Id });
  return res.data;
}

export async function getConversationCoach(lastMessage) {
  const res = await api.post('/ai/conversation-coach', { lastMessage });
  return res.data;
}

export async function improveBio(bio, interests) {
  const res = await api.post('/ai/bio-improver', { bio, interests });
  return res.data;
}

export async function getFirstMessage(user1Id, user2Id) {
  const res = await api.post('/ai/first-message', { user1Id, user2Id });
  return res.data;
}

export async function getConversationStarter(userId, matchedUserId) {
  const res = await api.post('/ai/conversation-starter', { userId, matchedUserId });
  return res.data;
}

export async function getCompatibilityExplanation(userId) {
  const res = await api.get(`/ai/compatibility/${encodeURIComponent(userId)}`);
  return res.data;
}

export async function getDateIdeas(user1Id, user2Id) {
  const res = await api.post('/ai/date-planner', { user1Id, user2Id });
  return res.data;
}

export async function getMeetingSuggestion(matchId, city, interests = []) {
  const res = await api.post('/ai/meeting-suggestion', { matchId, city, interests });
  return res.data;
}
