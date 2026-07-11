/**
 * src/api/chat.js
 * REST helpers for chat message history.
 */

import api from './client';

/** GET /api/chat/:partnerId/messages */
export async function getChatMessages(partnerId) {
  const res = await api.get(`/chat/${encodeURIComponent(partnerId)}/messages`);
  return res.data;
}

/** GET /api/chat/:matchId -- compact history endpoint for external clients. */
export async function getMatchChat(matchId) {
  const res = await api.get(`/chat/${encodeURIComponent(matchId)}`);
  return res.data;
}

/** POST /api/chat/send -- REST fallback; Socket.IO remains the live transport. */
export async function sendChatMessage(recipientId, text) {
  const res = await api.post('/chat/send', { recipientId, text });
  return res.data;
}
