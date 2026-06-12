import { create } from 'zustand';
import axios from '../api/axios';

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  setAccessToken: (token) => set({ accessToken: token }),
  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  login: async (identifier, password, role) => {
    const { data } = await axios.post('/auth/login', { identifier, password, role, user_agent: navigator.userAgent });
    sessionStorage.setItem('tab_session', 'active');
    set({
      user: data.data.user,
      accessToken: data.data.accessToken,
      role: role,
      isAuthenticated: true,
    });
    return data.data;
  },

  logout: async () => {
    try { await axios.post('/auth/logout'); } catch {}
    sessionStorage.removeItem('tab_session');
    set({ user: null, accessToken: null, role: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!sessionStorage.getItem('tab_session')) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await axios.post('/auth/refresh');
      if (data.success) {
        set({ accessToken: data.data.accessToken });
        const meRes = await axios.get('/auth/me');
        if (meRes.data.success) {
          set({
            user: meRes.data.data,
            role: meRes.data.data.role,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
    } catch {}
    set({ isLoading: false, isAuthenticated: false });
  },

  changePassword: async (currentPassword, newPassword) => {
    const { data } = await axios.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
    if (data.success) {
      set(state => ({
        user: { ...state.user, must_change_password: 0 }
      }));
    }
    return data;
  },

  completeTour: async () => {
    try {
      await axios.post('/auth/tour-completed');
      set(state => ({ user: { ...state.user, tour_completed: 1 } }));
    } catch {}
  },

  restartTour: () => {
    set(state => ({ user: { ...state.user, tour_completed: 0 } }));
    localStorage.removeItem('gstu-tour-completed');
  }
}));

export default useAuthStore;
