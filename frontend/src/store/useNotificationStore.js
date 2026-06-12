import { create } from 'zustand';
import axios from '../api/axios';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,

  /**
   * Fetch paginated notifications from the API.
   * Called on mount of the bell component and notifications page.
   */
  fetchNotifications: async (page = 1, type = 'all') => {
    set({ isLoading: true });
    try {
      const params = { page, limit: 20 };
      if (type && type !== 'all') params.type = type;
      const { data } = await axios.get('/notifications', { params });
      if (data.success) {
        set({
          notifications: page === 1 ? data.data.notifications : [...get().notifications, ...data.data.notifications],
          unreadCount: data.data.unreadCount,
          total: data.data.total,
          page: data.data.page,
          totalPages: data.data.totalPages,
        });
      }
    } catch (err) {
      console.error('[NotifStore] fetch failed:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Prepend a new real-time notification from the socket.
   */
  addNew: (notif) => {
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      total: state.total + 1,
    }));
  },

  /**
   * Mark a single notification as read.
   */
  markRead: async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.notification_id === id ? { ...n, is_read: 1 } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - (
          state.notifications.find(n => n.notification_id === id)?.is_read ? 0 : 1
        )),
      }));
    } catch (err) {
      console.error('[NotifStore] markRead failed:', err.message);
    }
  },

  /**
   * Mark all notifications as read.
   */
  markAllRead: async () => {
    try {
      await axios.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: 1 })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('[NotifStore] markAllRead failed:', err.message);
    }
  },

  /**
   * Delete a notification.
   */
  deleteNotification: async (id) => {
    try {
      await axios.delete(`/notifications/${id}`);
      set((state) => {
        const notif = state.notifications.find(n => n.notification_id === id);
        return {
          notifications: state.notifications.filter(n => n.notification_id !== id),
          unreadCount: Math.max(0, state.unreadCount - (notif?.is_read ? 0 : 1)),
          total: state.total - 1,
        };
      });
    } catch (err) {
      console.error('[NotifStore] delete failed:', err.message);
    }
  },

  /** Reset store on logout */
  reset: () => set({ notifications: [], unreadCount: 0, total: 0, page: 1, totalPages: 1 }),
}));

export default useNotificationStore;
