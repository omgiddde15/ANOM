/**
 * src/pages/DiscoverPage.jsx
 *
 * Fetches all user profiles (GET /api/users) and renders them as cards.
 * On mount also seeds the "already sent" set from GET /api/interests/sent.
 * Send Interest button calls POST /api/interests/send.
 */

import { useEffect, useState, useMemo } from 'react';
import { getUsers } from '../api/users';
import { sendInterest, getSentInterests, getReceivedInterests, getMatches, removeInterest } from '../api/interests';
import AppShell from '../components/layout/AppShell';
import UserCard from '../components/discover/UserCard';

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-gray-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-100 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 bg-gray-100 rounded w-full" />
        <div className="h-2 bg-gray-100 rounded w-5/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-100" />
        <div className="h-5 w-16 rounded-full bg-gray-100" />
        <div className="h-5 w-12 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ searching }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <svg className="h-20 w-20 text-indigo-100 mb-5" viewBox="0 0 80 80"
        fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="40" fill="currentColor" />
        <circle cx="40" cy="30" r="12" fill="#a5b4fc" />
        <path d="M18 62c0-12.15 9.85-22 22-22s22 9.85 22 22"
          stroke="#a5b4fc" strokeWidth="4" strokeLinecap="round" />
        {searching && (
          <>
            <circle cx="58" cy="20" r="8" stroke="#818cf8" strokeWidth="3" fill="none" />
            <line x1="64" y1="26" x2="70" y2="32" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
      <h3 className="text-base font-semibold text-gray-700">
        {searching ? 'No matches found' : 'No members yet'}
      </h3>
      <p className="mt-1 text-sm text-gray-400 max-w-xs">
        {searching
          ? 'Try a different name, city, or profession.'
          : "Be the first to invite someone — once others join, they'll appear here."}
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sentMap, setSentMap] = useState(new Map()); // userId -> status
  const [matchedSet, setMatchedSet] = useState(new Set());
  const [processingId, setProcessingId] = useState(null);

  // ── Loader: fetch users + sent/matches ───────────────────────────────
  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [usersData, sentData, matchesData] = await Promise.all([
        getUsers(),
        getSentInterests(),
        getMatches(),
      ]);
      setUsers(usersData.users ?? []);

      // Build sentMap: { [userId]: status }
      const newSentMap = new Map();
      (sentData.interests ?? []).forEach(i => {
        newSentMap.set(i.toUserId, i.status);
      });
      setSentMap(newSentMap);

      // Build matchedSet: userIds we are matched with
      const newMatchedSet = new Set((matchesData.matches ?? []).map(m => m.profile?.id || m.matchedUserId));
      setMatchedSet(newMatchedSet);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load members. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(({ name = '', city = '', profession = '' }) =>
      name.toLowerCase().includes(q) ||
      city.toLowerCase().includes(q) ||
      profession.toLowerCase().includes(q)
    );
  }, [users, query]);

  // ── Handlers for interest actions ──────────────────────────────────────────────
  async function handleSendInterest(userId) {
    if (processingId || sentMap.has(userId) || matchedSet.has(userId)) return;
    setProcessingId(userId);
    try {
      const res = await sendInterest(userId);
      const newSentMap = new Map(sentMap);
      newSentMap.set(userId, res.interest.status);
      setSentMap(newSentMap);
      if (res.matched) {
        setMatchedSet(prev => new Set([...prev, userId]));
      }
    } finally {
      setProcessingId(null);
    }
  }

  async function handleWithdrawInterest(userId) {
    if (processingId) return;
    setProcessingId(userId);
    try {
      await removeInterest(userId);
      const newSentMap = new Map(sentMap);
      newSentMap.delete(userId);
      setSentMap(newSentMap);
      setMatchedSet(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto" role="main" aria-busy={loading}>

        {/* ── Page header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover People</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading
                ? 'Loading members…'
                : `${filtered.length} member${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, city, or profession…"
              className="pl-9 pr-3 py-2 w-full sm:w-64 rounded-lg border border-gray-200
                bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 flex items-center justify-between">
            <div>{error}</div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="rounded-md bg-white px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50">Retry</button>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState searching={!!query.trim()} />
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((user) => {
              let status = null;
              let isSentByUs = false;
              if (matchedSet.has(user.id)) {
                status = 'matched';
              } else if (sentMap.has(user.id)) {
                status = sentMap.get(user.id);
                isSentByUs = true;
              }
              return (
                <UserCard
                  key={user.id}
                  user={user}
                  onSendInterest={handleSendInterest}
                  onWithdraw={handleWithdrawInterest}
                  status={status}
                  processing={processingId === user.id}
                  isSentByUs={isSentByUs}
                />
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
