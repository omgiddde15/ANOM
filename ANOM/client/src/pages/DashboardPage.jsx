/**
 * src/pages/DashboardPage.jsx
 * Main landing page after login — uses AppShell for consistent nav.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell';
import ProfileAvatar from '../components/profile/ProfileAvatar';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8 flex items-center gap-6">
          <ProfileAvatar name={user?.name} photoUrl={user?.photoUrl} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back{user?.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
            <Link
              to="/profile"
              className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              View &amp; edit your profile →
            </Link>
          </div>
        </div>

        {/* Placeholder panels */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['Matches', 'Messages', 'Discover', 'Settings'].map((item) => (
            <div
              key={item}
              className="rounded-xl bg-white ring-1 ring-gray-100 p-6 text-center shadow-sm"
            >
              <p className="text-sm font-medium text-gray-400 italic">{item} — coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
