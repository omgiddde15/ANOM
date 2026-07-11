import { useEffect, useState } from 'react';

export default function MeetingForm({ matches, onSubmit, busy, selectedVenue, prefill }) {
  const [form, setForm] = useState({ partnerId: '', date: '', time: '', venue: '', title: '', description: '' });
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  useEffect(() => {
    if (selectedVenue) setForm((current) => ({ ...current, venue: selectedVenue.address || selectedVenue.name }));
  }, [selectedVenue]);
  useEffect(() => {
    if (prefill) {
      setForm((current) => ({
        ...current,
        partnerId: prefill.partnerId || current.partnerId,
        venue: prefill.venue || current.venue,
        title: prefill.title || current.title,
        description: prefill.description || current.description
      }));
    }
  }, [prefill]);
  const submit = async (event) => {
    event.preventDefault();
    if (await onSubmit(form)) setForm({ partnerId: '', date: '', time: '', venue: '', title: '', description: '' });
  };

  return <form onSubmit={submit} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
    <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">📅</span><div><h2 className="font-bold text-slate-900">Create a meeting</h2><p className="text-sm text-slate-500">Send a plan to one of your matches.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <select required name="partnerId" value={form.partnerId} onChange={change} className="rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"><option value="">Choose a match</option>{matches.map((match) => <option key={match.profile?.id} value={match.profile?.id}>{match.profile?.name}</option>)}</select>
      <input required type="date" name="date" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={change} className="rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
      <input required type="time" name="time" value={form.time} onChange={change} className="rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
      <input required name="venue" value={form.venue} onChange={change} placeholder="Venue or meeting place" className="rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
      <input name="title" value={form.title} onChange={change} placeholder="Meeting title (optional)" className="rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 sm:col-span-2" />
      <textarea name="description" value={form.description} onChange={change} placeholder="Description (optional)" rows={3} className="rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 sm:col-span-2" />
    </div>
    <button disabled={busy} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Sending request…' : 'Send meeting request'}</button>
  </form>;
}
