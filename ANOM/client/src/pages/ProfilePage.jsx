/**
 * src/pages/ProfilePage.jsx
 *
 * Fetches the user's profile on mount (GET /api/profile),
 * then lets them edit and save it (PUT /api/profile).
 */

import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../api/profile';
import AppShell from '../components/layout/AppShell';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import ProfileForm from '../components/profile/ProfileForm';

export default function ProfilePage() {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');
  const [success,  setSuccess]  = useState('');

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    getProfile()
      .then((data) => setProfile(data.profile))
      .catch(() => setApiError('Could not load profile. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave(formData) {
    setSaving(true);
    setApiError('');
    setSuccess('');
    try {
      const data = await updateProfile(formData);
      setProfile(data.profile);
      setSuccess('Profile saved successfully!');
      // Auto-dismiss the success banner after 3 s
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        'Failed to save profile. Please try again.';
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8">
          {profile && (
            <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl} size="lg" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile?.name || 'Your Profile'}
            </h1>
            {profile?.updatedAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Last updated {new Date(profile.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Loading profile…
            </div>
          ) : (
            <>
              {/* Success banner */}
              {success && (
                <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-200">
                  {success}
                </div>
              )}
              <ProfileForm
                initialValues={profile}
                onSave={handleSave}
                saving={saving}
                apiError={apiError}
              />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
