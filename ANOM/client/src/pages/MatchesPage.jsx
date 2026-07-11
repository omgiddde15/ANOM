/**
 * src/pages/MatchesPage.jsx
 *
 * Displays all mutual matches from GET /api/interests/matches
 * in a responsive grid of MatchCard components.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMatches } from '../api/interests';
import AppShell from '../components/layout/AppShell';
import MatchCard from '../components/matches/MatchCard';
import MatchSkeleton from '../components/matches/MatchSkeleton';
import { useAuth } from '../context/auth';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-6 py-20 text-center ring-1 ring-indigo-100">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-indigo-100">
        <svg className="h-12 w-12 text-indigo-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-slate-900">No matches yet</h3>
      <p className="mt-3 max-w-md text-slate-600">
        Discover more people to create new matches.
      </p>
      <Link
        to="/discover"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg"
      >
        Discover People
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl bg-red-50 px-6 py-8 text-center ring-1 ring-red-200">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-900">Couldn&apos;t load matches</h3>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}

export default function MatchesPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUserId = currentUser?.id;

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await getMatches();
      if (res?.success) {
        setMatches(res.matches || []);
      } else {
        setError(res?.message || 'Failed to load matches');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleMessage = (profileId) => {
    navigate(`/chat/${profileId}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" role="main" aria-busy={loading}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Matches</h1>
          <p className="mt-2 text-slate-600">
            {loading
              ? 'Loading your connections…'
              : error
                ? 'Something went wrong'
                : `${matches.length} ${matches.length === 1 ? 'match' : 'matches'} waiting for you`}
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MatchSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState message={error} onRetry={loadMatches} />
        )}

        {!loading && !error && matches.length === 0 && (
          <EmptyState />
        )}

        {!loading && !error && matches.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <MatchCard
                key={match.profile?.id ?? match.matchedAt}
                match={match}
                currentUserId={currentUserId}
                onMessage={handleMessage}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
