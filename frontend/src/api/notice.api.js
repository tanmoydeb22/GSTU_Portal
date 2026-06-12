import api from './axios';

export const getNotices = (category = 'All', page = 1, limit = 10) => {
  return api.get('/notices', { params: { category, page, limit } });
};

// Admin & Dept Staff APIs
export const getManageNotices = () => {
  return api.get('/notices/manage');
};

export const createNotice = (formData) => {
  return api.post('/notices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const updateNotice = (id, formData) => {
  return api.put(`/notices/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const deleteNotice = (id) => {
  return api.delete(`/notices/${id}`);
};

export const togglePinNotice = (id) => {
  return api.put(`/notices/${id}/pin`);
};
