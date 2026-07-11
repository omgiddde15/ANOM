import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import AppShell from '../components/layout/AppShell';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';

function timeAgo(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes || 1}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function getNotificationInfo(type) {
  switch (type) {
    case 'interest':
      return {
        icon: HeartIcon,
        title: 'New Interest',
        color: 'text-pink-600',
        bg: 'bg-pink-50',
        path: '/discover'
      };
    case 'match':
      return {
        icon: HeartIcon,
        title: 'New Match',
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        path: '/matches'
      };
    case 'message':
      return {
        icon: ChatBubbleLeftRightIcon,
        title: 'New Message',
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        path: '/messages'
      };
    case 'meeting_request':
      return {
        icon: CalendarIcon,
        title: 'Meeting Request',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        path: '/meetings'
      };
    case 'meeting_accepted':
      return {
        icon: CheckCircleIcon,
        title: 'Meeting Accepted',
        color: 'text-green-600',
        bg: 'bg-green-50',
        path: '/meetings'
      };
    case 'meeting_rejected':
      return {
        icon: CalendarIcon,
        title: 'Meeting Rejected',
        color: 'text-red-600',
        bg: 'bg-red-50',
        path: '/meetings'
      };
    case 'meeting_cancelled':
      return {
        icon: CalendarIcon,
        title: 'Meeting Cancelled',
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        path: '/meetings'
      };
    default:
      return {
        icon: BellIcon,
        title: 'Notification',
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        path: '/dashboard'
      };
  }
}

function getNotificationMessage(notification) {
  if (notification.message) {
    return notification.message;
  }
  const { type, data } = notification;
  switch (type) {
    case 'interest':
      return `${data?.fromUserName || 'Someone'} sent you an interest!`;
    case 'match':
      return `You matched with ${data?.fromUserName || 'someone'}!`;
    case 'message':
      return `${data?.fromUserName || 'Someone'}: ${data?.messageText || 'New message'}`;
    case 'meeting_request':
      return `${data?.fromUserName || 'Someone'} requested a meeting on ${data?.date} at ${data?.time}`;
    case 'meeting_accepted':
      return `${data?.fromUserName || 'Someone'} accepted your meeting on ${data?.date} at ${data?.time}`;
    case 'meeting_rejected':
      return `${data?.fromUserName || 'Someone'} rejected your meeting request`;
    case 'meeting_cancelled':
      return `${data?.fromUserName || 'Someone'} cancelled the meeting`;
    default:
      return 'New notification';
  }
}

function groupNotificationsByDate(notifications) {
  const groups = { today: [], yesterday: [], earlier: [] };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  notifications.forEach(notification => {
    const notifDate = new Date(notification.createdAt).getTime();
    if (notifDate >= today) {
      groups.today.push(notification);
    } else if (notifDate >= yesterday) {
      groups.yesterday.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return groups;
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-3xl bg-slate-200/70 ${className}`} />;
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <p className="text-lg font-semibold text-slate-700">You're all caught up!</p>
      <p className="text-sm text-slate-500 mt-1">No new notifications.</p>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    const info = getNotificationInfo(notification.type);
    navigate(info.path);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const grouped = groupNotificationsByDate(notifications);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-7">
        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-8 text-white shadow-xl sm:px-9">
          <div className="relative z-10">
            <p className="text-sm font-semibold text-indigo-200">ANOM AI</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Notifications</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">
              Stay updated on your matches, messages, and meetings.
            </p>
          </div>
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
          >
            {error}{' '}
            <button onClick={load} className="font-bold underline">
              Retry
            </button>
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">All Notifications</h2>
            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-6">
              {grouped.today.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-3">Today</h3>
                  <div className="space-y-2">
                    {grouped.today.map(notification => {
                      const { icon: Icon, color, bg } = getNotificationInfo(notification.type);
                      const message = getNotificationMessage(notification);

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition hover:bg-slate-50 ${
                            notification.read ? 'bg-slate-50' : 'bg-indigo-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 p-3 rounded-xl ${bg}`}>
                            <Icon className={`h-6 w-6 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                  {notification.title || getNotificationInfo(notification.type).title}
                </p>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-700">{message}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {timeAgo(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {grouped.yesterday.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-3">Yesterday</h3>
                  <div className="space-y-2">
                    {grouped.yesterday.map(notification => {
                      const { icon: Icon, color, bg } = getNotificationInfo(notification.type);
                      const message = getNotificationMessage(notification);

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition hover:bg-slate-50 ${
                            notification.read ? 'bg-slate-50' : 'bg-indigo-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 p-3 rounded-xl ${bg}`}>
                            <Icon className={`h-6 w-6 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                  {notification.title || getNotificationInfo(notification.type).title}
                </p>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-700">{message}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {timeAgo(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {grouped.earlier.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-3">Earlier</h3>
                  <div className="space-y-2">
                    {grouped.earlier.map(notification => {
                      const { icon: Icon, color, bg } = getNotificationInfo(notification.type);
                      const message = getNotificationMessage(notification);

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition hover:bg-slate-50 ${
                            notification.read ? 'bg-slate-50' : 'bg-indigo-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 p-3 rounded-xl ${bg}`}>
                            <Icon className={`h-6 w-6 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                  {notification.title || getNotificationInfo(notification.type).title}
                </p>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-700">{message}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {timeAgo(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
