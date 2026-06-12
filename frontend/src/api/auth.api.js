import axios from './axios';

export const loginApi = (identifier, password, role) =>
  axios.post('/auth/login', { identifier, password, role, user_agent: navigator.userAgent });

export const logoutApi = () => axios.post('/auth/logout');

export const refreshApi = () => axios.post('/auth/refresh');

export const forgotPasswordApi = (email, role) =>
  axios.post('/auth/forgot-password', { email, role });

export const resetPasswordApi = (token, newPassword) =>
  axios.post('/auth/reset-password', { token, newPassword });

export const changePasswordApi = (currentPassword, newPassword) =>
  axios.put('/auth/change-password', { currentPassword, newPassword });

export const getMeApi = () => axios.get('/auth/me');

export const getPhoneForResetApi = (identifier, role) =>
  axios.get('/auth/get-phone-for-reset', { params: { identifier, role } });

export const resetPasswordWithOtpApi = (identifier, role, idToken, newPassword) =>
  axios.post('/auth/reset-password-otp', { identifier, role, idToken, newPassword });

export const getSessionsApi = () => axios.get('/auth/sessions');
export const getLoginHistoryApi = () => axios.get('/auth/login-history');

export const logoutAllApi = () => axios.post('/auth/logout-all');

export const logoutSessionApi = (sid) => axios.delete(`/auth/logout/${sid}`);

export const completeTourApi = () => axios.post('/auth/tour-completed');
