import { useCallback, useEffect, useState } from 'react';
import { getDateIdeas } from '../../api/ai';
import { toast } from '../../lib/toast';

export default function DatePlannerModal({ open, onClose, currentUserId, profileId, matchName, onUseForMeeting }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDateIdeas = useCallback(async () => {
    if (!currentUserId || !profileId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getDateIdeas(currentUserId, profileId);
      if (res?.success) {
        setData(res);
      } else {
        throw new Error(res?.message || 'Could not generate date ideas');
      }
    } catch (err) {
      setError(err?.message || 'Could not generate date ideas');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, profileId]);

  useEffect(() => {
    if (open) loadDateIdeas();
  }, [open, loadDateIdeas]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleCopyPlan = (plan) => {
    const text = `${plan.activityName}\n📍 ${plan.location}\n⭐ ${plan.category}\n⏱️ ${plan.estimatedDuration}\n💰 ${plan.estimatedBudget}\n\n${plan.description}`;
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard!');
  };

  const handleUseForMeeting = (plan) => {
    onUseForMeeting?.(plan);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">AI Date Planner</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Date ideas with {matchName}</h2>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close"
            className="rounded-full bg-white p-2 text-slate-500 shadow-sm hover:text-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500">✨ AI is creating suggestions...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200 text-center">
              <p className="text-sm text-red-700 font-medium">⚠️ Couldn't generate suggestions.</p>
              <div className="mt-4 flex gap-2 justify-center">
                <button 
                  onClick={loadDateIdeas} 
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
                >
                  Retry
                </button>
                <button 
                  onClick={onClose} 
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {data?.dateIdeas?.length > 0 && !loading && !error && (
            <div className="grid gap-4">
              {data.dateIdeas.map((idea, index) => (
                <div 
                  key={index} 
                  className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        📅 {idea.activityName}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {idea.location && (
                          <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                            📍 {idea.location}
                          </span>
                        )}
                        {idea.category && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                            ⭐ {idea.category}
                          </span>
                        )}
                        {idea.estimatedDuration && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            ⏱️ {idea.estimatedDuration}
                          </span>
                        )}
                        {idea.estimatedBudget && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            💰 {idea.estimatedBudget}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {idea.description && (
                    <p className="text-sm text-slate-700 leading-relaxed mb-4">
                      {idea.description}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleCopyPlan(idea)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Copy Plan
                    </button>
                    <button 
                      onClick={() => handleUseForMeeting(idea)}
                      className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Use For Meeting
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
