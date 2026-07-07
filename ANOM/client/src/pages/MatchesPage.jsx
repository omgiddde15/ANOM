/**
 * src/pages/MatchesPage.jsx
 *
 * Displays all mutual matches fetched from GET /api/interests/matches.
 * Each match shows the partner's profile photo, name, city, and profession.
 */

import { useEffect, useState } from 'react';
import { getMatches } from '../api/interests';
import AppShell from '../components/layout/AppShell';
import ProfileAvatar from '../components/profile/ProfileAvatar';

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonMatch() {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 p-5 flex items-center gap-4 animate-pulse">
      <div className="h-14 w-14 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-8 w-24 rounded-lg bg-gray-100" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function NoMatches() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <svg className="h-20 w-20 text-indigo-100 mb-5" viewBox="0 0 80 80"
        fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="40" fill="currentColor" />
        {/* Two hearts */}
        <path d="M28 36c0-4 3-7 7-7s7 3 7 7c0 5-7 11-7 11s-7-6-7-11z"
          fill="#a5b4fc" />
        <path d="M38 36c0-4 3-7 7-7s7 3 7 7c0 5-7 11-7 11s-7-6-7-11z"
          fill="#c4b5fd" opacity="0.7" />
      </svg>
      <h3 className="text-base font-semibold text-gray-700">No matches yet</h3>
      <p className="mt-1 text-sm text-gray-400 max-w-xs">
        When someone you've shown interest in shows interest back, they'll appear here.
      </p>
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────
function MatchCard({ match }) {
  const { profile, matchedAt } = match;
  const { name = '', city = '', profession = '', profilePhotoUrl = '' } = profile;

  const matchDate = matchedAt
    ? new Date(matchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm
      hover:shadow-md transition-shadow duration-200 flex items-center gap-4 p-5">

      {/* Avatar */}
      <ProfileAvatar name={name} photoUrl={profilePhotoUrl} size="md" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name || 'Unknown'}</p>
        {profession && (
          <p className="text-xs font-medium text-indigo-600 truncate mt-0.5">{profession}</p>
        )}
        {city && (
          <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {city}
          </p>
        )}
        {matchDate && (
          <p className="text-xs text-gray-300 mt-1">Matched {matchDate}</p>
        )}
      </div>

      {/* Mutual badge */}
      <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 ring-1 ring-green-100">
        ♥ Mutual
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getMatches()
      .then((data) => setMatches(data.matches ?? []))
      .catch(() => setError('Could not load matches. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Matches</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Loading…'
              : `${matches.length} mutual match${matches.length !== 1 ? 'es' : ''}`}
          </p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonMatch key={i} />)}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && matches.length === 0 && <NoMatches />}

        {/* ── Match list ── */}
        {!loading && matches.length > 0 && (
          <div className="flex flex-col gap-3">
            {matches.map((m) => (
              <MatchCard key={m.profile?.id ?? m.matchedAt} match={m} />
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}
