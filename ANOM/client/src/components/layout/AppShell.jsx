import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/auth';
import { getNotifications, getUnreadCount, markAllAsRead, markAsRead } from '../../api/notifications';
import { getSocket } from '../../lib/socket';
import { BellIcon, HeartIcon, ChatBubbleLeftRightIcon, CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◈' },
  { to: '/discover', label: 'Discover', icon: '⌕' },
  { to: '/matches', label: 'Matches', icon: '♥' },
  { to: '/meetings', label: 'Meetings', icon: '◷' },
  { to: '/messages', label: 'Messages', icon: '✉' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/profile', label: 'Profile', icon: '◉' },
];

function getNotificationInfo(type) {
  switch (type) {
    case 'interest':
      return {
        icon: HeartIcon,
        color: 'text-pink-600',
        bg: 'bg-pink-50',
        path: '/discover'
      };
    case 'match':
      return {
        icon: HeartIcon,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        path: '/matches'
      };
    case 'message':
      return {
        icon: ChatBubbleLeftRightIcon,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        path: '/messages'
      };
    case 'meeting_request':
      return {
        icon: CalendarIcon,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        path: '/meetings'
      };
    case 'meeting_accepted':
      return {
        icon: CheckCircleIcon,
        color: 'text-green-600',
        bg: 'bg-green-50',
        path: '/meetings'
      };
    case 'meeting_rejected':
      return {
        icon: CalendarIcon,
        color: 'text-red-600',
        bg: 'bg-red-50',
        path: '/meetings'
      };
    case 'meeting_cancelled':
      return {
        icon: CalendarIcon,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        path: '/meetings'
      };
    default:
      return {
        icon: BellIcon,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        path: '/dashboard'
      };
  }
}

function getNotificationText(notif) {
  // Use message from notification if available, else fallback to data-based
  if (notif.message) {
    return notif.message;
  }
  switch (notif.type) {
    case 'interest':
      return `${notif.data?.fromUserName || 'Someone'} sent you an interest!`;
    case 'match':
      return `You matched with ${notif.data?.fromUserName || 'someone'}!`;
    case 'message':
      return `${notif.data?.fromUserName || 'Someone'} sent you a message`;
    case 'meeting_request':
      return `${notif.data?.fromUserName || 'Someone'} requested a meeting`;
    case 'meeting_accepted':
      return `${notif.data?.fromUserName || 'Someone'} accepted your meeting request!`;
    case 'meeting_rejected':
      return `${notif.data?.fromUserName || 'Someone'} rejected your meeting request`;
    case 'meeting_cancelled':
      return `${notif.data?.fromUserName || 'Someone'} cancelled the meeting`;
    default:
      return 'New notification';
  }
}

function timeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AppShell({ children }) {
  const { user, authLogout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (e) {
      console.error('Failed to load unread count', e);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    }
    setNotificationsOpen(false);
    const info = getNotificationInfo(notification.type);
    navigate(info.path);
  };

  useEffect(() => {
    loadUnreadCount();
    const socket = getSocket();
    if (socket) {
      const onNewNotification = () => {
        loadUnreadCount();
        if (notificationsOpen) loadNotifications();
      };
      socket.on('notification:new', onNewNotification);
      return () => socket.off('notification:new', onNewNotification);
    }
  }, [loadUnreadCount, notificationsOpen]);

  useEffect(() => {
    if (notificationsOpen) {
      loadNotifications();
    }
  }, [notificationsOpen]);

  const signOut = () => {
    authLogout();
    navigate('/login');
  };

  const links = NAV_ITEMS.map(({ to, label, icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
        }`
      }
    >
      <span aria-hidden className="w-5 text-center text-base">
        {icon}
      </span>
      {label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900 lg:flex">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
        >
          ☰
        </button>
        <span className="font-bold tracking-tight text-indigo-700">
          ANOM <span className="text-slate-400">AI</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-xl p-2 text-slate-700 hover:bg-slate-100"
          >
            <BellIcon className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={signOut} className="text-xs font-bold text-rose-600">
            Sign out
          </button>
        </div>
        {notificationsOpen && (
          <div className="absolute right-4 top-14 z-50 w-80 max-h-96 overflow-auto rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View all
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center text-sm text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-sm text-slate-500">No notifications yet</div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notif) => {
                  const { icon: Icon, color, bg } = getNotificationInfo(notif.type);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex items-start gap-3 rounded-xl p-3 cursor-pointer transition ${
                        notif.read ? 'bg-slate-50' : 'bg-indigo-50'
                      } hover:bg-slate-100`}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-lg ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {getNotificationText(notif)}
                        </p>
                        <p className="text-xs text-slate-500">{timeAgo(notif.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-slate-200 bg-white p-4 shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2 py-3">
          <div>
            <p className="text-xl font-black tracking-tight text-indigo-700">
              ANOM <span className="text-slate-400">AI</span>
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Meaningful connections
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 lg:hidden"
          >
            ✕
          </button>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Main navigation">
          {links}
        </nav>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="truncate text-sm font-bold text-slate-800">
            {user?.name || 'ANOM member'}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={signOut}
            className="mt-3 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 relative">
        <div className="hidden lg:flex justify-end mb-4">
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative rounded-xl p-2 bg-white text-slate-700 hover:bg-slate-100 shadow-sm ring-1 ring-slate-200"
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-auto rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate('/notifications');
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      View all
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="text-center text-sm text-slate-500">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="text-center text-sm text-slate-500">No notifications yet</div>
                ) : (
                  <div className="space-y-2">
                    {notifications.slice(0, 5).map((notif) => {
                      const { icon: Icon, color, bg } = getNotificationInfo(notif.type);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`flex items-start gap-3 rounded-xl p-3 cursor-pointer transition ${
                            notif.read ? 'bg-slate-50' : 'bg-indigo-50'
                          } hover:bg-slate-100`}
                        >
                          <div className={`flex-shrink-0 p-2 rounded-lg ${bg}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700">
                              {getNotificationText(notif)}
                            </p>
                            <p className="text-xs text-slate-500">{timeAgo(notif.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
