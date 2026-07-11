/**
 * MatchCard.jsx
 * Displays a mutual match with profile details, AI insights, and action buttons.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompatibility, analyzeProfile } from '../../api/ai';
import { getUser } from '../../api/users';
import ProfileAvatar from '../profile/ProfileAvatar';
import { resolveProfileImageUrl } from '../../lib/profileImage';
import ConversationStarterModal from './ConversationStarterModal';

function formatMatchDate(isoDate) {
  if (!isoDate) return 'Recently matched';
  try {
    return new Date(isoDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently matched';
  }
}

function scoreBadgeClass(score) {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (score >= 60) return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
  return 'bg-amber-50 text-amber-700 ring-amber-200';
}

export default function MatchCard({ match, currentUserId, onMessage }) {
  const navigate = useNavigate();
  const { matchedAt, profile } = match;
  const {
    id: profileId,
    name = 'Unknown',
    city = '',
    profession = '',
    profilePhotoUrl = '',
    profileImageUrl = '',
    photoUrl = '',
  } = profile ?? {};

  const photo = resolveProfileImageUrl({ profileImageUrl, profilePhotoUrl, photoUrl });

  const [compatibility, setCompatibility] = useState(null);
  const [conversationStarter, setConversationStarter] = useState('');
  const [personalitySummary, setPersonalitySummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(true);
  const [aiError, setAiError] = useState('');
  const [starterOpen, setStarterOpen] = useState(false);

  useEffect(() => {
    if (!currentUserId || !profileId) {
      setLoadingAi(false);
      return;
    }

    let cancelled = false;

    async function loadInsights() {
      setLoadingAi(true);
      setAiError('');

      try {
        const [compatRes, userRes] = await Promise.all([
          getCompatibility(currentUserId, profileId),
          getUser(profileId),
        ]);

        if (cancelled) return;

        if (compatRes?.success) {
          setCompatibility(compatRes.score ?? null);
          setConversationStarter(compatRes.conversationStarter || '');
        }

        const user = userRes?.user;
        if (user) {
          const analysis = await analyzeProfile(user.bio || '', user.interests || []);
          if (!cancelled && analysis?.success) {
            setPersonalitySummary(
              analysis.summary ||
              analysis.personality ||
              'A thoughtful person worth getting to know.'
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAiError(err.response?.data?.message || err.message || 'Could not load AI insights.');
        }
      } finally {
        if (!cancelled) setLoadingAi(false);
      }
    }

    loadInsights();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, profileId]);

  return (
    <>
      <article className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-indigo-200">
        {/* Hero photo */}
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ProfileAvatar name={name} photoUrl="" size="lg" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />

          {loadingAi ? (
            <div className="absolute right-4 top-4 h-8 w-24 animate-pulse rounded-full bg-white/40" />
          ) : compatibility !== null ? (
            <div className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ring-1 backdrop-blur-sm ${scoreBadgeClass(compatibility)}`}>
              {compatibility}% Match
            </div>
          ) : null}

          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-white drop-shadow-sm">{name}</h3>
            {profession && (
              <p className="mt-0.5 text-sm font-medium text-indigo-100">{profession}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {city && (
              <span className="inline-flex items-center gap-1">
                <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {city}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <svg className="h-4 w-4 text-pink-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Matched {formatMatchDate(matchedAt)}
            </span>
          </div>

          {/* AI Personality Summary */}
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">AI Personality</p>
            {loadingAi ? (
              <div className="mt-2 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
              </div>
            ) : aiError ? (
              <p className="mt-2 text-sm text-slate-500">Insights unavailable right now.</p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-700 line-clamp-3">
                {personalitySummary || 'A unique personality waiting to be discovered.'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate(`/users/${profileId}`)}
              className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              View Profile
            </button>
            <button
              type="button"
              onClick={() => onMessage(profileId)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Message
            </button>
            <button
              type="button"
              onClick={() => setStarterOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-purple-700 sm:col-span-3 xl:col-span-1"
            >
              AI Conversation Starter
            </button>
          </div>
        </div>
      </article>

      <ConversationStarterModal
        open={starterOpen}
        onClose={() => setStarterOpen(false)}
        matchName={name}
        currentUserId={currentUserId}
        profileId={profileId}
        initialMessage={conversationStarter}
      />
    </>
  );
}
