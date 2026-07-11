import { useCallback, useEffect, useState } from 'react';
import { getConversationStarter } from '../../api/ai';
import { toast } from '../../lib/toast';

function DetailList({ title, icon, items }) {
  if (!items?.length) return null;
  return (
    <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <h3 className="text-sm font-semibold text-slate-900">{icon} {title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
        {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span className="text-indigo-500">•</span><span>{item}</span></li>)}
      </ul>
    </section>
  );
}

export default function AIStarterModal({ open, onClose, userId, matchedUserId, matchName, onUseStarter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadStarter = useCallback(async () => {
    if (!userId || !matchedUserId) return;
    setLoading(true); setError(''); setCopied(false);
    try {
      const result = await getConversationStarter(userId, matchedUserId);
      if (!result?.success) throw new Error(result?.message || 'No starter was returned.');
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not create an AI starter. Please try again.');
    } finally { setLoading(false); }
  }, [userId, matchedUserId]);

  useEffect(() => { if (open) loadStarter(); }, [open, loadStarter]);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const copyStarter = async () => {
    try { 
      await navigator.clipboard.writeText(data?.starter || ''); 
      setCopied(true); 
      toast('Copied to clipboard!');
      setTimeout(() => setCopied(false), 1800); 
    }
    catch { 
      setError('Your browser could not copy the message.'); 
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ai-starter-title" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl flex flex-col" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-6 py-5 border-b border-slate-100 z-10">
          <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">AI Conversation Starter</p><h2 id="ai-starter-title" className="mt-1 text-xl font-bold text-slate-900">A natural way to start with {matchName}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-white p-2 text-slate-500 shadow-sm hover:text-slate-800">✕</button>
        </header>
        <div className="space-y-4 p-6">
          {loading ? <div className="flex flex-col items-center justify-center py-10 gap-3"><div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" /><p className="text-sm text-slate-500">✨ AI is creating suggestions…</p></div>
            : error ? <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200 text-center"><p className="text-sm text-red-700 font-medium">⚠ Couldn't generate suggestions.</p><div className="mt-4 flex gap-2 justify-center"><button type="button" onClick={loadStarter} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition">Retry</button><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Close</button></div></div>
            : data && <>
              <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-wider text-indigo-100">Opening message</p><p className="mt-2 text-base leading-relaxed">“{data.starter}”</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={copyStarter} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">{copied ? '✓ Copied' : 'Copy message'}</button><button type="button" onClick={() => onUseStarter?.(data.starter)} className="rounded-xl bg-indigo-500/60 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/30 hover:bg-indigo-500">Use in chat</button></div></section>
              <div className="grid gap-4 sm:grid-cols-2"><DetailList title="Ice breakers" icon="🧊" items={data.iceBreakers} /><DetailList title="Common interests" icon="✨" items={data.commonInterests} /></div>
              <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><h3 className="text-sm font-semibold text-amber-900">🎯 Suggested activity</h3><p className="mt-2 text-sm text-amber-800">{data.activity}</p></div><div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100"><h3 className="text-sm font-semibold text-rose-900">☕ Coffee topic</h3><p className="mt-2 text-sm text-rose-800">{data.topic}</p></div></section>
            </>}
        </div>
      </div>
    </div>
  );
}
