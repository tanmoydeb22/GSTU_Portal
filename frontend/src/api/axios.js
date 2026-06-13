import ax from 'axios';
import useAuthStore from '../store/useAuthStore';

const axios = ax.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5001/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Auto-refresh on 401 with queued retry ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (err, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token);
  });
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Skip refresh loop for the refresh call itself and for login
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return axios(original);
        }).catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/auth/refresh` : 'http://localhost:5001/api/auth/refresh';
        const { data } = await ax.post(
          refreshUrl,
          {},
          { withCredentials: true }
        );

        const newToken = data.data?.accessToken || data.accessToken;
        if (!newToken) throw new Error('No access token in refresh response');

        useAuthStore.getState().setAccessToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        processQueue(null, newToken);

        original.headers.Authorization = `Bearer ${newToken}`;
        return axios(original);

      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear auth state and redirect to login
        useAuthStore.setState({ user: null, accessToken: null, role: null, isAuthenticated: false });
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
