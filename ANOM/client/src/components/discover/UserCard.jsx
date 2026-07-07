/**
 * src/components/discover/UserCard.jsx
 *
 * Card displayed in the Discover grid.
 * Props:
 *   user      — profile object { userId, name, city, profession, interests, photoUrl, … }
 *   onSendInterest(userId) — callback for the Send Interest button
 */

import ProfileAvatar from '../profile/ProfileAvatar';

export default function UserCard({ user, onSendInterest, interestSent = false }) {
  const { userId, name, city, profession, interests = [], photoUrl } = user;

  return (
    <article className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm
      hover:shadow-md transition-shadow flex flex-col overflow-hidden">

      {/* ── Top: avatar + name block ── */}
      <div className="flex items-center gap-4 p-5 pb-4">
        <ProfileAvatar name={name} photoUrl={photoUrl} size="md" />
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name || 'Unknown'}</h3>
          {(city || profession) && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {[profession, city].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ── Interests ── */}
      {interests.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {interests.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-indigo-50 px-2.5 py-0.5
                text-xs font-medium text-indigo-600 capitalize"
            >
              {tag}
            </span>
          ))}
          {interests.length > 5 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
              +{interests.length - 5}
            </span>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="mt-auto border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
        <a
          href={`/profile/view/${userId}`}
          onClick={(e) => e.preventDefault()}          /* placeholder — no view page yet */
          title="View Profile (coming soon)"
          className="py-3 text-center text-xs font-medium text-gray-500
            hover:bg-gray-50 hover:text-indigo-600 transition-colors cursor-not-allowed"
        >
          View Profile
        </a>
        <button
          type="button"
          onClick={() => !interestSent && onSendInterest(userId)}
          disabled={interestSent}
          className={`py-3 text-center text-xs font-medium transition-colors
            ${interestSent
              ? 'text-green-600 bg-green-50 cursor-default'
              : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
        >
          {interestSent ? '✓ Interest Sent' : 'Send Interest'}
        </button>
      </div>
    </article>
  );
}
