/**
 * AIInsightCard.jsx
 * Reusable component for displaying AI insight cards with loading/error states
 */

export function LoadingCard({ title: _title, icon }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div className="h-6 bg-slate-200 rounded w-40" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 rounded" />
        <div className="h-4 bg-slate-200 rounded w-5/6" />
        <div className="h-4 bg-slate-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export function ErrorCard({ title, icon, error, onRetry }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
        <p className="text-sm text-red-700 font-medium">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-red-700 hover:text-red-900 underline"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export function AIInsightCard({ title, icon, children }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default AIInsightCard;
