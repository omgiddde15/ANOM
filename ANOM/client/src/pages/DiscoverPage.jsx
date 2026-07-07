/**
 * src/pages/DiscoverPage.jsx
 *
 * Fetches all user profiles (GET /api/users) and renders them as cards.
 * Includes a client-side search filter on name, city, and profession.
 */

import { useEffect, useState, useMemo } from 'react';
import { getUsers } from '../api/users';
import AppShell from '../components/layout/AppShell';
import UserCard from '../components/discover/UserCard';

export default function DiscoverPage() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [query,      setQuery]      = useState('');
  // Track which userIds have had interest sent (local state — no backend yet)
  const [sentSet,    setSentSet]    = useState(new Set());

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    getUsers()
      .then((data) => setUsers(data.users ?? []))
      .catch(() => setError('Could not load users. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Client-side filter ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(({ name = '', city = '', profession = '' }) =>
      name.toLowerCase().includes(q) ||
      city.toLowerCase().includes(q) ||
      profession.toLowerCase().includes(q)
    );
  }, [users, query]);

  // ── Send Interest (local toggle — matching not implemented yet) ─────────────
  function handleSendInterest(userId) {
    setSentSet((prev) => new Set([...prev, userId]));
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover People</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Loading…' : `${filtered.length} member${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {/* Search bar */}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city, or profession…"
            className="w-full sm:w-72 rounded-lg border border-gray-200 bg-white
              px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* ── States ── */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl ring-1 ring-gray-100 h-44 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-gray-400 text-sm">
              {query ? 'No members match your search.' : 'No other members yet.'}
            </p>
          </div>
        )}

        {/* ── User grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                onSendInterest={handleSendInterest}
                interestSent={sentSet.has(user.userId)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
