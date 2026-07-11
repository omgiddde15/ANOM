/**
 * ConversationStarterModal.jsx
 * Displays an AI-generated conversation starter with copy, regenerate, and close actions.
 */

import { useCallback, useEffect, useState } from 'react';
import { getCompatibility } from '../../api/ai';
import { toast } from '../../lib/toast';

export default function ConversationStarterModal({
  open,
  onClose,
  matchName = 'your match',
  currentUserId,
  profileId,
  initialMessage = '',
}) {
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!currentUserId || !profileId) {
      setError('Unable to generate a starter. Please sign in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await getCompatibility(currentUserId, profileId);
      if (res?.success && res.conversationStarter) {
        setMessage(res.conversationStarter);
      } else {
        setError(res?.message || 'No conversation starter was returned. Try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate conversation starter.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, profileId]);

  useEffect(() => {
    if (!open) return;

    setCopied(false);
    setError('');

    if (initialMessage) {
      setMessage(initialMessage);
      return;
    }

    generate();
  }, [open, initialMessage, generate]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleCopy = async () => {
    if (!message) return;

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conversation-starter-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">AI Conversation Starter</p>
              <h2 id="conversation-starter-title" className="mt-1 text-lg font-semibold text-slate-900">
                Message for {matchName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                A personalized opening line based on your shared interests.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full bg-white p-2 text-slate-500 transition hover:text-slate-700 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500">✨ AI is creating suggestions…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200 text-center">
              <p className="text-sm text-red-700 font-medium">⚠ Couldn't generate suggestions.</p>
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={generate}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <blockquote className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-5 text-sm leading-relaxed text-slate-800 ring-1 ring-indigo-100">
              &ldquo;{message}&rdquo;
            </blockquote>
          )}

          {!loading && !error && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!message}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={generate}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
