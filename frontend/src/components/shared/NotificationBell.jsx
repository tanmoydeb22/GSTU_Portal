import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import useNotificationStore from '../../store/useNotificationStore';
import useAuthStore from '../../store/useAuthStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString();
}

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-500',  bg: 'bg-blue-50',  border: 'border-blue-100' },
  success: { icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  error:   { icon: XCircle,       color: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-100' },
};

function NotifIcon({ type, size = 16 }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <span className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${cfg.bg} ${cfg.border} border`}>
      <Icon size={size} className={cfg.color} />
    </span>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotifItem({ notif, onRead, onDelete, onNavigate }) {
  const isUnread = !notif.is_read;

  return (
    <div
      className={`group flex gap-3 items-start p-3 rounded-xl cursor-pointer transition-all duration-150
        ${isUnread ? 'bg-brand-50/60 hover:bg-brand-50' : 'hover:bg-gray-50'}`}
      onClick={() => {
        if (isUnread) onRead(notif.notification_id);
        if (notif.link) onNavigate(notif.link);
      }}
    >
      <NotifIcon type={notif.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {notif.title}
          </p>
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
        <p className="text-[10px] text-gray-400 mt-1 font-medium">{timeAgo(notif.created_at)}</p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notif.notification_id); }}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Delete"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { role } = useAuthStore();

  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotificationStore();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifLink = `/${role}/notifications`;
  const preview = notifications.slice(0, 8);

  const handleNavigate = (link) => {
    setOpen(false);
    navigate(link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 rounded-xl transition-all duration-200
          ${open ? 'bg-brand-50 text-brand-600' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50'}`}
        title="Notifications"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out]' : ''} />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
            px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold leading-none shadow-sm
            animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-w-[calc(100vw-16px)]
          bg-white rounded-2xl shadow-2xl shadow-gray-200/80 border border-gray-100
          animate-in slide-in-from-top-2 fade-in duration-200 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-brand-600" />
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto px-2 py-2 space-y-0.5">
            {preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell size={32} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-0.5">We'll let you know when something arrives</p>
              </div>
            ) : (
              preview.map((n) => (
                <NotifItem
                  key={n.notification_id}
                  notif={n}
                  onRead={markRead}
                  onDelete={deleteNotification}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button
              onClick={() => handleNavigate(notifLink)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 py-1.5 rounded-xl hover:bg-brand-50 transition-colors"
            >
              View all notifications
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
