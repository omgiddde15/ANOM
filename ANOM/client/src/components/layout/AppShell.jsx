/**
 * src/components/layout/AppShell.jsx
 *
 * Shared app shell: sidebar navigation + main content area.
 * Used by every authenticated page (Dashboard, Profile, …).
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: '⊞' },
  { to: '/discover',  label: 'Discover',   icon: '🔍' },
  { to: '/matches',   label: 'Matches',    icon: '♥'  },
  { to: '/profile',   label: 'Profile',    icon: '👤' },
];

export default function AppShell({ children }) {
  const { user, authLogout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    authLogout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="text-xl font-bold text-indigo-600">ANOM AI</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-800 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 text-xs font-medium text-red-500 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
