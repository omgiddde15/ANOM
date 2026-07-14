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
import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import { useAuth } from '../../context/auth';
import ProfileAvatar from '../profile/ProfileAvatar';
import api from '../../api/client';

const MAX_BIO = 90;

export default function UserCard({ 
  user, 
  onSendInterest, 
  onWithdraw,
  status = null, 
  processing = false,
  isSentByUs = false,
}) {
  const navigate = useNavigate();
  const {
    id,
    name            = '',
    city            = '',
    profession      = '',
    bio             = '',
    profilePhotoUrl = '',
    interests       = [],
  } = user;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMatched = status === 'matched';
  const isPending = status === 'pending';

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const { user: currentUser } = useAuth();

  const currentUserId = currentUser?.id || currentUser?.userId || currentUser?._id || '';

  const aiActions = [
    { key: 'compatibilityExplanation', label: '✨ Why this match?', endpoint: `/ai/compatibility/${encodeURIComponent(id)}` },
    { key: 'compatibility', label: '❤️ Compatibility', endpoint: '/ai/compatibility' },
    { key: 'matchExplanation', label: '🧠 Match Explanation', endpoint: '/ai/match-explanation' },
    { key: 'firstMessage', label: '💬 First Message', endpoint: '/ai/first-message' },
    { key: 'datePlanner', label: '📅 Date Planner', endpoint: '/ai/date-planner' },
  ];

  const buildPayload = () => {
    return {
      user1Id: currentUserId,
      user2Id: id,
    };
  };

  const handleAiAction = async (actionKey, endpoint, label) => {
    if (!currentUserId) {
      setAiError('Unable to determine your user ID. Please sign in again.');
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiResponse(null);

    try {
      const response = actionKey === 'compatibilityExplanation'
        ? await api.get(endpoint)
        : await api.post(endpoint, buildPayload());
      setAiResponse({ actionKey, label, data: response.data });
    } catch (err) {
      setAiError(
        err.response?.data?.message || err.message || 'Failed to fetch AI result. Try again.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const renderAiResult = () => {
    if (!aiResponse) return null;

    const { actionKey, data } = aiResponse;

    if (actionKey === 'compatibility') {
      return (
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900 mb-2">Compatibility Score</p>
            <p className="text-base text-slate-700">{data.score ?? 'N/A'} / 100</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900 mb-2">Summary</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-slate-700">
              {(data.reasons ?? []).map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900 mb-2">Conversation Starter</p>
            <p className="mt-1 text-base text-slate-700">{data.conversationStarter || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900 mb-2">Meeting Suggestion</p>
            <p className="mt-1 text-base text-slate-700">{data.meetingSuggestion || 'N/A'}</p>
          </div>
        </div>
      );
    }

    if (actionKey === 'compatibilityExplanation') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
            <span className="text-3xl font-bold">{data.score ?? 0}%</span>
            <span className="text-indigo-100 text-base">AI compatibility score</span>
          </div>
          <div className="rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
            <p className="text-lg font-semibold text-indigo-900 mb-2">Why this match?</p>
            <ul className="mt-1 space-y-1 text-base text-indigo-800">
              {(data.explanation ?? []).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-lg font-semibold text-emerald-900 mb-2">Strengths</p>
              <ul className="mt-1 space-y-1 text-base text-emerald-800">
                {(data.strengths ?? []).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-lg font-semibold text-amber-900 mb-2">Challenges</p>
              <ul className="mt-1 space-y-1 text-base text-amber-800">
                {(data.challenges ?? []).map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-xl bg-purple-50 p-4">
            <p className="text-lg font-semibold text-purple-900 mb-2">Suggestions</p>
            <ul className="mt-1 space-y-1 text-base text-purple-800">
              {(data.relationshipTips ?? []).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (actionKey === 'matchExplanation') {
      return (
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900 mb-2">Compatibility Level</p>
            <p className="mt-1 text-base text-slate-700">{data.compatibilityLevel || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900 mb-2">Summary</p>
            <p className="mt-1 text-base text-slate-700">{data.summary || 'N/A'}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-lg font-semibold text-slate-900 mb-2">Strengths</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-slate-700">
                {(data.strengths ?? []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-lg font-semibold text-slate-900 mb-2">Challenges</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-slate-700">
                {(data.possibleChallenges ?? []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900 mb-2">Suggestions</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-slate-700">
              {(data.tips ?? []).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (actionKey === 'firstMessage') {
      return (
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-lg font-semibold text-slate-900 mb-2">First Message</p>
          <p className="mt-1 whitespace-pre-wrap text-base text-slate-700">{data.message || 'N/A'}</p>
        </div>
      );
    }

    if (actionKey === 'datePlanner') {
      return (
        <div className="space-y-3">
          {(data.dateIdeas ?? []).map((idea, index) => (
            <div key={index} className="rounded-xl bg-slate-50 p-4">
              <p className="text-lg font-semibold text-slate-900 mb-2">{idea.title || `Idea ${index + 1}`}</p>
              {idea.locationType && (
                <p className="mt-1 text-sm text-slate-500">Location: {idea.locationType}</p>
              )}
              <p className="mt-1 text-base text-slate-700">{idea.description || 'No description available.'}</p>
            </div>
          ))}
          {!(data.dateIdeas?.length) && <p className="text-base text-slate-700">No date ideas returned.</p>}
        </div>
      );
    }

    return <p className="text-base text-slate-700">No AI response available.</p>;
  };

  // Inline expanded profile panel — provides a quick view without routing
  const bioPreview = bio.length > MAX_BIO ? bio.slice(0, MAX_BIO).trimEnd() + '…' : bio;

  async function handleSend() {
    if (processing) return;
    await onSendInterest(id);
  }

  return (
    <article
      className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm
        hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden"
    >
      {/* ── Header: avatar + identity ── */}
      <div className="flex items-start gap-4 p-5 pb-3">
        <ProfileAvatar name={name} profile={user} size="md" />
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
      <div className="mt-auto border-t border-gray-100">
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isModalOpen}
            className="py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            AI Features
          </button>

          {/* Conditional buttons based on status */}
          {isMatched ? (
            <button
              type="button"
              disabled
              className="py-3 text-xs font-semibold text-green-600 bg-green-50 cursor-default"
            >
              💜 Matched
            </button>
          ) : isSentByUs ? (
            <button
              type="button"
              onClick={() => onWithdraw(id)}
              disabled={processing}
              className="py-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Withdraw Interest
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={processing}
              className={`py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                processing
                  ? 'text-indigo-400 bg-indigo-50 cursor-wait'
                  : 'text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100'
              }`}
            >
              {processing && (
                <span className="h-3 w-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              )}
              {processing ? 'Sending…' : 'Send Interest'}
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 mt-3">
<button
    onClick={() => navigate(`/users/${id}`)}
    className="py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
>
    View Profile
</button>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-[1150px] max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">AI Features</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Generate compatibility insights, match explanations, first messages, and date ideas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close AI features dialog"
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Sticky Feature Buttons */}
            <div className="px-6 py-4 border-b border-slate-200 sticky top-[88px] bg-white z-10">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {aiActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => handleAiAction(action.key, action.endpoint, action.label)}
                    className={`h-[50px] rounded-2xl border text-sm font-semibold text-left px-4 py-2 transition flex items-center justify-center text-center ${
                      aiResponse?.actionKey === action.key
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {aiLoading ? (
                <div className="flex items-center gap-3 text-slate-600 py-8">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  Loading AI response…
                </div>
              ) : aiError ? (
                <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
                  {aiError}
                </div>
              ) : aiResponse ? (
                <div className="space-y-4">
                  <div className="text-lg font-semibold text-slate-900 mb-2">{aiResponse.label}</div>
                  {renderAiResult()}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-8">
                  Choose an AI feature to see results for this user.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
