import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import MeetingForm from '../components/meetings/MeetingForm';
import MeetingCard from '../components/meetings/MeetingCard';
import MeetingSuggestion from '../components/meetings/MeetingSuggestion';
import { getMatches } from '../api/interests';
import { acceptMeeting, createMeeting, deleteMeeting, getMeetings, rejectMeeting } from '../api/meetings';
import { toast } from '../lib/toast';
import { useAuth } from '../context/auth';

function MeetingList({ title, items, empty, matches, currentUserId, onAccept, onReject, onCancel }) {
  const partnerName = (meeting) => {
    const partnerId = meeting.requesterId === currentUserId ? meeting.partnerId : meeting.requesterId;
    return matches.find((match) => match.profile?.id === partnerId)?.profile?.name;
  };
  return <section><h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>{items.length ? <div className="space-y-4">{items.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} partnerName={partnerName(meeting)} isInvitee={meeting.partnerId === currentUserId} onAccept={onAccept} onReject={onReject} onCancel={onCancel} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">{empty}</div>}</section>;
}

export default function MeetingSchedulerPage() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [meetings, setMeetings] = useState([]); const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [toastMessage, setToastMessage] = useState(''); const [selectedVenue, setSelectedVenue] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const showToast = (message) => { setToastMessage(message); toast(message); setTimeout(() => setToastMessage(''), 3200); };
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [meetingData, matchData] = await Promise.all([getMeetings(), getMatches()]); setMeetings(meetingData.meetings || []); setMatches(matchData.matches || []); } catch (err) { setError(err.response?.data?.message || 'Unable to load meetings.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const storedPrefill = sessionStorage.getItem('meetingPrefill');
    if (storedPrefill) {
      try {
        setPrefill(JSON.parse(storedPrefill));
        sessionStorage.removeItem('meetingPrefill');
      } catch (e) {
        console.error('Failed to parse meeting prefill:', e);
      }
    }
  }, []);
  const submit = async (data) => { setSaving(true); setError(''); try { const result = await createMeeting(data); setMeetings((current) => [...current, result.meeting]); showToast('Meeting request sent.'); return true; } catch (err) { setError(err.response?.data?.message || 'Unable to send meeting request.'); return false; } finally { setSaving(false); } };
  const update = async (action, id, success) => { setError(''); try { const result = await action(id); if (result.meeting) setMeetings((current) => current.map((meeting) => meeting.id === id ? result.meeting : meeting)); else setMeetings((current) => current.filter((meeting) => meeting.id !== id)); showToast(success); } catch (err) { setError(err.response?.data?.message || 'Unable to update meeting.'); } };
  const today = new Date().toISOString().slice(0, 10);
  const pending = meetings.filter((meeting) => meeting.status === 'pending');
  const upcoming = meetings.filter((meeting) => meeting.status === 'accepted' && meeting.date >= today);
  return <AppShell><div className="mx-auto max-w-6xl"><header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Plans together</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Meeting scheduler</h1><p className="mt-2 text-slate-600">Turn a great conversation into a safe, thoughtful meetup.</p></div><span className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">{meetings.length} meeting{meetings.length === 1 ? '' : 's'}</span></header>{toastMessage && <div role="status" className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">✓ {toastMessage}</div>}{error && <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{error} <button onClick={load} className="font-semibold underline">Retry</button></div>}<MeetingForm matches={matches} onSubmit={submit} busy={saving} selectedVenue={selectedVenue} prefill={prefill} /><MeetingSuggestion matches={matches} onSelect={setSelectedVenue} />{loading ? <div className="py-16 text-center text-sm text-slate-500"><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />Loading your meetings…</div> : <div className="mt-8 grid gap-8 lg:grid-cols-2"><MeetingList title="Pending requests" items={pending} empty="No pending requests right now." matches={matches} currentUserId={currentUserId} onAccept={(id) => update(acceptMeeting, id, 'Meeting accepted.')} onReject={(id) => update(rejectMeeting, id, 'Meeting request rejected.')} onCancel={(id) => update(deleteMeeting, id, 'Meeting cancelled.')} /><MeetingList title="Upcoming meetings" items={upcoming} empty="No meetings scheduled." matches={matches} currentUserId={currentUserId} onAccept={() => {}} onReject={() => {}} onCancel={(id) => update(deleteMeeting, id, 'Meeting cancelled.')} /></div>}</div></AppShell>;
}
