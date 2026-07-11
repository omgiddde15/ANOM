/**
 * MatchSkeleton.jsx
 * Loading placeholder for a match card in the responsive grid.
 */

export default function MatchSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm animate-pulse">
      <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200" />
      <div className="flex flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="h-5 w-2/3 rounded-lg bg-slate-200" />
          <div className="h-3.5 w-1/2 rounded-lg bg-slate-200" />
          <div className="h-3 w-1/3 rounded-lg bg-slate-200" />
        </div>
        <div className="h-6 w-28 rounded-full bg-slate-200" />
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-3 w-full rounded bg-slate-200" />
          <div className="h-3 w-5/6 rounded bg-slate-200" />
        </div>
        <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="h-10 rounded-2xl bg-slate-200" />
          <div className="h-10 rounded-2xl bg-slate-200" />
          <div className="h-10 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
