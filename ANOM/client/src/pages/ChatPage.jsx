import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChatMessages } from '../api/chat';
import api from '../api/client';
import { getMatches } from '../api/interests';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import { useAuth } from '../context/auth';
import { getSocket } from '../lib/socket';
import ChatSidebar from '../components/chat/ChatSidebar';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import AIStarterModal from '../components/chat/AIStarterModal';

function formatDateLabel(iso) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;

  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt);
    if (label !== currentDate) {
      currentDate = label;
      groups.push({ type: 'date', label });
    }
    groups.push({ type: 'message', data: msg });
  }

  return groups;
}

export default function ChatPage() {
  const { partnerId: urlPartnerId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id || '';

  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState('');

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [starterOpen, setStarterOpen] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const messagesRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError('');
    try {
      const res = await getMatches();
      if (res?.success) {
        setMatches(res.matches ?? []);
      } else {
        setMatchesError(res?.message || 'Could not load matches.');
      }
    } catch (err) {
      setMatchesError(err.response?.data?.message || 'Could not load matches.');
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const appendMessage = useCallback((msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const loadConversation = useCallback(async (match) => {
    const pid = match?.profile?.id;
    if (!pid) return;

    setSelected(match);
    setMessages([]);
    setMessagesError('');
    setAiSuggestion('');
    setAiError('');
    setSendError('');
    setPartnerTyping(false);
    setMessagesLoading(true);

    navigate(`/chat/${pid}`, { replace: true });

    const socket = getSocket();
    if (socket) {
      socket.emit('join_conversation', { partnerId: pid }, (res) => {
        if (res?.success) {
          setPartnerOnline(!!res.partnerOnline);
        }
      });
      socket.emit('presence:check', { partnerId: pid }, (res) => {
        if (res?.online) setPartnerOnline(true);
      });
    }

    try {
      const res = await getChatMessages(pid);
      if (res?.success) {
        setMessages(res.messages ?? []);
      } else {
        setMessagesError(res?.message || 'Failed to load messages.');
      }
    } catch (err) {
      setMessagesError(err.response?.data?.message || 'Failed to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (matchesLoading || !urlPartnerId) return;
    if (selected?.profile?.id === urlPartnerId) return;
    const match = matches.find((m) => m.profile?.id === urlPartnerId);
    if (match) loadConversation(match);
  }, [matchesLoading, urlPartnerId, matches, selected, loadConversation]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleNewMessage = (msg) => {
      const active = selectedRef.current;
      const pid = active?.profile?.id;
      if (!pid) return;

      const isConversation =
        (msg.senderId === currentUserId && msg.recipientId === pid) ||
        (msg.senderId === pid && msg.recipientId === currentUserId);

      if (isConversation) {
        appendMessage(msg);
        if (msg.senderId === pid) {
          setPartnerTyping(false);
        }
      }
    };

    const handleOnline = ({ userId }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
      if (selectedRef.current?.profile?.id === userId) {
        setPartnerOnline(true);
      }
    };

    const handleOffline = ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      if (selectedRef.current?.profile?.id === userId) {
        setPartnerOnline(false);
      }
    };

    const handleTyping = ({ userId, isTyping }) => {
      if (selectedRef.current?.profile?.id === userId) {
        setPartnerTyping(!!isTyping);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
      socket.off('typing', handleTyping);
    };
  }, [currentUserId, appendMessage]);

  useEffect(() => {
    if (selected?.profile?.id) {
      setPartnerOnline(onlineUsers.has(selected.profile.id));
    }
  }, [selected, onlineUsers]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, aiSuggestion, partnerTyping, messagesLoading]);

  const emitTyping = (isTyping) => {
    const socket = getSocket();
    const pid = selected?.profile?.id;
    if (!socket || !pid) return;
    socket.emit('typing', { recipientId: pid, isTyping });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500);
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    const pid = selected?.profile?.id;
    const socket = getSocket();

    if (!trimmed || !pid || !socket || sending) return;

    setSending(true);
    setSendError('');
    setAiSuggestion('');
    setAiError('');
    emitTyping(false);

    socket.timeout(10000).emit('send_message', { recipientId: pid, text: trimmed }, (timeoutError, res) => {
      setSending(false);
      if (timeoutError) {
        setSendError('Message delivery timed out. Please try again.');
        return;
      }
      if (res?.success && res.message) {
        appendMessage(res.message);
        setInput('');
      } else {
        setSendError(res?.message || 'Failed to send message.');
      }
    });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestReply = async () => {
    if (!selected) return;
    const lastIncoming = [...messages].reverse().find((m) => m.senderId !== currentUserId);
    const lastText = lastIncoming?.text || messages[messages.length - 1]?.text || '';
    if (!lastText.trim()) {
      setAiError('No message to base a suggestion on.');
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiSuggestion('');

    try {
      const res = await api.post('/ai/conversation-coach', { lastMessage: lastText });
      setAiSuggestion(res.data?.replySuggestion || '');
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to get suggestion.');
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = () => {
    if (!aiSuggestion) return;
    setInput((prev) => (prev ? `${prev}\n${aiSuggestion}` : aiSuggestion));
  };

  const filtered = matches.filter((m) => {
    const n = (m.profile?.name || '').toLowerCase();
    return n.includes(query.toLowerCase());
  });

  const grouped = groupMessagesByDate(messages);

  return (
    <div className="min-h-screen bg-[#e5ddd5]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="grid min-h-[70vh] grid-cols-1 md:grid-cols-[300px,1fr]">

            {/* Sidebar */}
            <ChatSidebar>
              <div className="border-b border-slate-200 bg-[#f0f2f5] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Chats</h2>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {matches.length}
                  </span>
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search matches"
                  className="mt-3 w-full rounded-xl border-0 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {matchesLoading ? (
                  <div className="space-y-1 p-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl p-3">
                        <div className="h-11 w-11 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-3/4 rounded bg-slate-200" />
                          <div className="h-2.5 w-1/2 rounded bg-slate-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matchesError ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-red-600">{matchesError}</p>
                    <button
                      type="button"
                      onClick={loadMatches}
                      className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50"
                    >
                      Retry
                    </button>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No conversations yet.{' '}
                    <Link to="/discover" className="font-semibold text-indigo-600 hover:underline">
                      Discover people
                    </Link>
                  </div>
                ) : (
                  <ul className="p-2">
                    {filtered.map((m) => {
                      const pid = m.profile?.id;
                      const isActive = selected?.profile?.id === pid;
                      const isOnline = onlineUsers.has(pid);

                      return (
                        <li key={pid}>
                          <button
                            type="button"
                            onClick={() => loadConversation(m)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white ${
                              isActive ? 'bg-white shadow-sm ring-1 ring-indigo-100' : ''
                            }`}
                          >
                            <div className="relative shrink-0">
                              <ProfileAvatar
                                name={m.profile?.name}
                                profile={m.profile}
                                size="sm"
                              />
                              <span
                                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white ${
                                  isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {m.profile?.name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {m.profile?.profession || m.profile?.city || 'Matched'}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </ChatSidebar>

            {/* Chat panel */}
            <section className="flex flex-col bg-[#efeae2]">
              {!selected ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
                    <svg className="h-10 w-10 text-indigo-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Select a conversation</h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    Choose a match from the sidebar to start chatting in real time.
                  </p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 border-b border-slate-200 bg-[#f0f2f5] px-4 py-3">
                    <ProfileAvatar
                      name={selected.profile?.name}
                      profile={selected.profile}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{selected.profile?.name}</p>
                      <p className="text-xs text-slate-500">
                        {partnerTyping ? (
                          <span className="font-medium text-indigo-600">typing…</span>
                        ) : partnerOnline ? (
                          <span className="text-emerald-600">online</span>
                        ) : (
                          'offline'
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/users/${selected.profile?.id}`)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setStarterOpen(true)}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
                    >
                      ✨ AI Starter
                    </button>
                  </div>

                  {/* Messages */}
                  <div
                    ref={messagesRef}
                    className="flex-1 overflow-y-auto px-4 py-4"
                    style={{
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d9d9d9\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    }}
                  >
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                      </div>
                    ) : messagesError ? (
                      <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700 ring-1 ring-red-200">
                        {messagesError}
                        <button
                          type="button"
                          onClick={() => loadConversation(selected)}
                          className="mt-2 block w-full font-semibold underline"
                        >
                          Retry
                        </button>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="rounded-xl bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-sm">
                          No messages yet. Say hello!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {grouped.map((item, idx) => {
                          if (item.type === 'date') {
                            return (
                              <div key={`date-${idx}`} className="my-4 flex justify-center">
                                <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                                  {item.label}
                                </span>
                              </div>
                            );
                          }

                          const m = item.data;
                          const mine = m.senderId === currentUserId;

                          return <MessageBubble key={m.id} message={m} mine={mine} />;
                        })}

                        {partnerTyping && (
                          <div className="flex justify-start">
                            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
                              <div className="flex gap-1">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI suggestion */}
                  {(aiLoading || aiError || aiSuggestion) && (
                    <div className="border-t border-slate-200 bg-[#f0f2f5] px-4 py-2">
                      {aiLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                          Generating suggestion…
                        </div>
                      ) : aiError ? (
                        <p className="text-sm text-red-600">{aiError}</p>
                      ) : (
                        <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-indigo-800">AI Suggestion</p>
                            <button
                              type="button"
                              onClick={() => { setAiSuggestion(''); setAiError(''); }}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Dismiss
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{aiSuggestion}</p>
                          <button
                            type="button"
                            onClick={applySuggestion}
                            className="mt-2 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Use suggestion
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {sendError && (
                    <div className="bg-red-50 px-4 py-2 text-center text-xs text-red-600">
                      {sendError}
                    </div>
                  )}

                  {/* Input */}
                  <ChatInput
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKey}
                    onSend={sendMessage}
                    disabled={sending}
                    canSend={!!input.trim()}
                    actions={(
                      <button type="button" onClick={suggestReply} disabled={aiLoading} className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:block">AI</button>
                    )}
                  />
                  <AIStarterModal
                    open={starterOpen}
                    onClose={() => setStarterOpen(false)}
                    userId={currentUserId}
                    matchedUserId={selected.profile?.id}
                    matchName={selected.profile?.name || 'your match'}
                    onUseStarter={(starter) => { setInput(starter); setStarterOpen(false); }}
                  />
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
