import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Info, CheckCircle2, AlertTriangle, XCircle,
  CheckCheck, Trash2, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import useNotificationStore from '../../store/useNotificationStore';
import EmptyState from '../ui/EmptyState';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'info',    label: 'Info' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error',   label: 'Error' },
];

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-500',  bg: 'bg-blue-50',  border: 'border-blue-100',  badge: 'bg-blue-100 text-blue-700'  },
  success: { icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', badge: 'bg-green-100 text-green-700' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700' },
  error:   { icon: XCircle,       color: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-100',   badge: 'bg-red-100 text-red-700'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGroup(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d))      return 'Today';
  if (isYesterday(d))  return 'Yesterday';
  if (isThisWeek(d))   return 'This Week';
  return 'Older';
}

function groupByDate(notifications) {
  const order = ['Today', 'Yesterday', 'This Week', 'Older'];
  const groups = {};
  for (const n of notifications) {
    const g = getGroup(n.created_at);
    if (!groups[g]) groups[g] = [];
    groups[g].push(n);
  }
  return order.filter(g => groups[g]).map(g => ({ label: g, items: groups[g] }));
}

function TypeIcon({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <span className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border`}>
      <Icon size={18} className={cfg.color} />
    </span>
  );
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
      {type}
    </span>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({ notif, onRead, onDelete, onNavigate }) {
  const isUnread = !notif.is_read;

  const handleClick = () => {
    if (isUnread) onRead(notif.notification_id);
    if (notif.link) onNavigate(notif.link);
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex gap-4 items-start p-4 rounded-2xl cursor-pointer transition-all duration-150 border
        ${isUnread
          ? 'bg-brand-50/50 border-brand-100 hover:bg-brand-50 hover:border-brand-200'
          : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
        }`}
    >
      <TypeIcon type={notif.type} />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-sm leading-tight ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
            {notif.title}
          </span>
          <TypeBadge type={notif.type} />
          {isUnread && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{notif.message}</p>
        <p className="text-xs text-gray-400 mt-1.5 font-medium">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>

      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUnread && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(notif.notification_id); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Mark as read"
          >
            <CheckCheck size={14} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notif.notification_id); }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();

  const {
    notifications, unreadCount, total, page, totalPages, isLoading,
    fetchNotifications, markRead, markAllRead, deleteNotification,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(1, activeFilter);
  }, [activeFilter]);

  const grouped = groupByDate(notifications);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} total{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications(1, activeFilter)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors border border-brand-100"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setActiveFilter(f.key); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
              activeFilter === f.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && notifications.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={activeFilter !== 'all' ? 'Try switching the filter above.' : "You're all caught up!"}
        />
      )}

      {/* Grouped notification list */}
      {grouped.map(({ label, items }) => (
        <div key={label}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">{label}</p>
          <div className="space-y-2">
            {items.map((n) => (
              <NotifRow
                key={n.notification_id}
                notif={n}
                onRead={markRead}
                onDelete={deleteNotification}
                onNavigate={(link) => navigate(link)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => fetchNotifications(page - 1, activeFilter)}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-500 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => fetchNotifications(page + 1, activeFilter)}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
