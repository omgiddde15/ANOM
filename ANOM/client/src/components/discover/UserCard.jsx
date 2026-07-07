/**
 * src/components/discover/UserCard.jsx
 *
 * Card displayed in the Discover grid.
 * Consumes the public-safe user shape returned by GET /api/users:
 *   { id, name, city, profession, bio, profilePhotoUrl, interests }
 *
 * Props:
 *   user            — profile object
 *   onSendInterest(userId) → Promise  — called when Send Interest is clicked
 *   interestSent    — boolean, controls button state
 */

import { useState } from 'react';
import ProfileAvatar from '../profile/ProfileAvatar';

const MAX_BIO = 90;

export default function UserCard({ user, onSendInterest, interestSent = false }) {
  const {
    id,
    name            = '',
    city            = '',
    profession      = '',
    bio             = '',
    profilePhotoUrl = '',
    interests       = [],
  } = user;

  const [sending, setSending] = useState(false);

  const bioPreview = bio.length > MAX_BIO ? bio.slice(0, MAX_BIO).trimEnd() + '…' : bio;

  async function handleSend() {
    if (interestSent || sending) return;
    setSending(true);
    try {
      await onSendInterest(id);
    } finally {
      setSending(false);
    }
  }

  return (
    <article
      className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm
        hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden"
    >
      {/* ── Header: avatar + identity ── */}
      <div className="flex items-start gap-4 p-5 pb-3">
        <ProfileAvatar name={name} photoUrl={profilePhotoUrl} size="md" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-semibold text-gray-900 truncate leading-tight">
            {name || 'Anonymous'}
          </h3>
          {profession && (
            <p className="text-xs font-medium text-indigo-600 mt-0.5 truncate">
              {profession}
            </p>
          )}
          {city && (
            <p className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1">
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
        </div>
      </div>

      {/* ── Bio preview ── */}
      {bioPreview && (
        <p className="px-5 pb-3 text-xs text-gray-500 leading-relaxed line-clamp-2">
          {bioPreview}
        </p>
      )}

      {/* ── Interest tags ── */}
      {interests.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {interests.slice(0, 4).map((tag) => (
            <span key={tag}
              className="rounded-full bg-indigo-50 px-2.5 py-0.5
                text-xs font-medium text-indigo-600 capitalize">
              {tag}
            </span>
          ))}
          {interests.length > 4 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-400">
              +{interests.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="mt-auto border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
        {/* View Profile — placeholder */}
        <button type="button" disabled title="Coming soon"
          className="py-3 text-xs font-medium text-gray-400 cursor-not-allowed hover:bg-gray-50 transition-colors">
          View Profile
        </button>

        {/* Send / Interested button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={interestSent || sending}
          className={`py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5
            ${interestSent
              ? 'text-green-600 bg-green-50 cursor-default'
              : sending
                ? 'text-indigo-400 bg-indigo-50 cursor-wait'
                : 'text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100'
            }`}
        >
          {sending && (
            <span className="h-3 w-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          )}
          {interestSent ? '♥ Interested' : sending ? 'Sending…' : 'Send Interest'}
        </button>
      </div>
    </article>
  );
}
