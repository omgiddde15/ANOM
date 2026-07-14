import { useState } from 'react';
import { improveBio } from '../api/ai';

export default function BioImprover() {
  const [bio, setBio] = useState('');
  const [improvedBio, setImprovedBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setImprovedBio('');

    if (!bio.trim()) {
      setError('Please enter your bio before improving it.');
      return;
    }

    setLoading(true);

    try {
      const response = await improveBio(bio.trim(), []);
      setImprovedBio(response?.improvedBio || 'No improved bio returned.');
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || 'Unable to improve your bio. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
      <h2 className="text-2xl font-semibold text-slate-900">Bio Improver</h2>
      <p className="mt-2 text-sm text-slate-500">
        Paste your current profile bio below and get an improved version you can use on your profile.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700" htmlFor="bio">
          Current bio
        </label>
        <textarea
          id="bio"
          rows="6"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Write your current bio here..."
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Improving...' : 'Improve'}
        </button>
      </form>

      {improvedBio && (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Improved bio</h3>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {improvedBio}
          </p>
        </div>
      )}
    </div>
  );
}
