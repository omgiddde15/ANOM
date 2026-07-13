import { useEffect, useState } from 'react';
import api from '../api/client';
import { pickEditableProfileFields } from '../api/profile';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import InterestSelector, { ALL_INTERESTS, normalizeInterests } from '../components/profile/InterestSelector';
import { useAuth } from '../context/auth';
import { toast } from '../lib/toast';

export default function ProfilePage() {
  const { user, authLogin } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    city: '',
    profession: '',
    profileImageUrl: '',
    interests: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get('/profile');
        const loadedProfile = response.data.profile || profile;
        setProfile({
          ...loadedProfile,
          interests: normalizeInterests(loadedProfile.interests)
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load profile. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const toggleInterest = (interest) => {
    setProfile((current) => {
      const lower = interest.toLowerCase();
      const next = current.interests.includes(lower)
        ? current.interests.filter(i => i !== lower)
        : [...current.interests, lower];
      return {
        ...current,
        interests: normalizeInterests(next),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Normalize interests before sending
      const payload = {
        ...pickEditableProfileFields(profile),
        interests: normalizeInterests(profile.interests)
      };
      const response = await api.put('/profile', payload);
      setProfile(response.data.profile || profile);
      if (response.data.profile && user?.id) {
        authLogin(localStorage.getItem('anom_token'), {
          ...user,
          name: response.data.profile.name,
          email: response.data.profile.email,
        });
      }
      setSuccess('Profile updated successfully.');
      toast('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(
        err.response?.data?.errors?.join(', ')
          || err.response?.data?.message
          || (err.message === 'Network Error' ? 'Unable to connect to server. Please check your connection and try again.' : 'Failed to update profile. Please try again.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Your profile
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Edit your profile details
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Keep your information up to date so matches can find the right things in common.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
              {loading ? 'Fetching profile…' : 'Profile loaded' }
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <span>Loading profile…</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {success}
                  </div>
                )}
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="flex flex-col items-center gap-3 rounded-xl bg-white/70 p-4 text-center">
                    <ProfileAvatar name={profile.name} profile={profile} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Profile picture</p>
                    </div>
                  </div>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Profile Image URL
                  <input
                    name="profileImageUrl"
                    type="url"
                    value={profile.profileImageUrl || ''}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="https://images.unsplash.com/... or https://randomuser.me/api/portraits/men/32.jpg"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Paste a public image URL. Saved when you click Save profile.
                  </p>
                </label>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Name
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Your name"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Email
                    <input
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="you@example.com"
                    />
                  </label>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    City
                    <input
                      name="city"
                      value={profile.city}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="City"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Profession
                    <input
                      name="profession"
                      value={profile.profession}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Profession"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Bio
                  <textarea
                    name="bio"
                    rows="5"
                    value={profile.bio}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Tell people about yourself"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Interests & Hobbies
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ALL_INTERESTS.map(interest => {
                      const lower = interest.toLowerCase();
                      const active = profile.interests.includes(lower);
                      return (
                        <button
                          key={lower}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                            active
                              ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Select at least a few interests to help find better matches.
                  </p>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    Update your details and save to keep the profile current.
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg ring-1 ring-slate-900 sm:p-8">
            <h2 className="text-xl font-semibold">Profile tips</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Keep your name and bio clear so people can connect with you quickly. Use the city and profession fields to highlight shared interests and what you do.
            </p>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-3xl bg-slate-900 p-4">
                <p className="font-semibold text-slate-100">Pro tip</p>
                <p className="mt-2">Short, specific details make your profile easier to read.</p>
              </div>
              <div className="rounded-3xl bg-slate-900 p-4">
                <p className="font-semibold text-slate-100">Stay current</p>
                <p className="mt-2">Save changes whenever your interests or goals change.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
