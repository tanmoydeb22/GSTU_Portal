import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import useNotificationStore from '../store/useNotificationStore';
import { getSocket, disconnectSocket } from '../api/socket';

const TYPE_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: '🔔' };

/**
 * useSocket — initializes the Socket.io connection when authenticated,
 * wires up the notification:new listener, and tears down on unmount or logout.
 *
 * Call this hook once from Header.jsx (always mounted while authenticated).
 */
export default function useSocket() {
  const { isAuthenticated, user } = useAuthStore();
  const addNew = useNotificationStore((s) => s.addNew);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const reset = useNotificationStore((s) => s.reset);

  // Derive a stable identity key for the effect dependency
  const userKey = user?.student_id || user?.teacher_code || user?.staff_code || user?.admin_id;

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    if (!socket) return;

    // Initial fetch so badge shows on login
    fetchNotifications(1);

    const handleNewNotification = (notif) => {
      addNew(notif);

      const icon = TYPE_ICONS[notif.type] || '🔔';
      const toastFn = notif.type === 'error' ? toast.error
        : notif.type === 'success' ? toast.success
        : toast;
      toastFn(`${icon} ${notif.title} — ${notif.message}`, {
        duration: 5000,
        id: `notif-${notif.notification_id}`,
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [isAuthenticated, userKey, fetchNotifications, addNew]);

  // Hard cleanup on component unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
      reset();
    };
  }, [reset]);
}
