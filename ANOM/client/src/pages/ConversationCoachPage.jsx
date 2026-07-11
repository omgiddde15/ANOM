import { useState } from 'react';
import { getConversationCoach } from '../api/ai';
import AppShell from '../components/layout/AppShell';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="h-5 w-5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
    </div>
  );
}

function HistoryItem({ item, index }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-slate-500">Suggestion #{index}</p>
        <button
          onClick={handleCopy}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200 transition"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-slate-800 leading-relaxed">{item.suggestion}</p>
      <p className="mt-2 text-xs text-slate-400">
        In response to: "{item.input.substring(0, 60)}{item.input.length > 60 ? '...' : ''}"
      </p>
    </div>
  );
}

export default function ConversationCoachPage() {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  const handleImprove = async () => {
    if (!input.trim()) {
      setError('Please enter a message to improve');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestion('');

    try {
      const res = await getConversationCoach(input);
      if (res?.success) {
        const improved = res.replySuggestion;
        setSuggestion(improved);
        setHistory([{ input, suggestion: improved }, ...history]);
        setError('');
      } else {
        setError(res?.message || 'Failed to generate suggestion');
      }
    } catch (err) {
      setError(err?.message || 'Error improving message');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    setError('');
    handleImprove();
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Conversation Coach</h1>
          <p className="mt-2 text-slate-600">
            Get AI-powered suggestions to craft the perfect reply to any message
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl bg-white p-8 ring-1 ring-slate-200 shadow-lg mb-8">
          {/* Input Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Their Message
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste the message you want to reply to..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
              rows={4}
            />
            <p className="mt-2 text-xs text-slate-500">
              {input.length} characters
            </p>
          </div>

          {/* Improve Button */}
          <button
            onClick={handleImprove}
            disabled={loading || !input.trim()}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                Improving...
              </>
            ) : (
              <>
                ✨ Improve Message
              </>
            )}
          </button>

          {/* Error State */}
          {error && (
            <div className="mt-6 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-3 text-sm font-semibold text-red-700 hover:text-red-900 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Suggestion Result */}
          {suggestion && (
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Improved Reply</h2>
                <button
                  onClick={handleCopy}
                  className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 ring-1 ring-indigo-200 transition"
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-200">
                <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">
                  {suggestion}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Recent Suggestions ({history.length})
            </h2>
            <div className="space-y-3">
              {history.map((item, index) => (
                <HistoryItem key={index} item={item} index={index + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
