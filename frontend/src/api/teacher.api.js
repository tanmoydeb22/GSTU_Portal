import axios from './axios';

export const getTeacherDashboard = () => axios.get('/teacher/dashboard');
export const getTeacherCourses = () => axios.get('/teacher/courses');
export const getActiveCourses = () => axios.get('/teacher/courses/active');
export const getCourseStudents = (offeringId) => axios.get(`/teacher/courses/${offeringId}/students`);
export const getTeacherProfile = () => axios.get('/teacher/profile');
export const updateTeacherProfile = (data) => axios.put('/teacher/profile', data);
export const uploadTeacherPhoto = (data) => axios.put('/teacher/profile/photo', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateCourseStudentGrade = (enrollmentId, data) => axios.put(`/teacher/grades/${enrollmentId}`, data);
export const bulkUpdateCourseGrades = (offeringId, data) => axios.put(`/teacher/courses/${offeringId}/bulk-grades`, data);
export const exportCourseStudents = (offeringId, format) => axios.get(`/teacher/courses/${offeringId}/students/export`, { params: { format }, responseType: 'blob' });
export const getCourseMarks = (offeringId) => axios.get(`/teacher/courses/${offeringId}/marks`);
export const saveCourseMarks = (offeringId, data) => axios.put(`/teacher/courses/${offeringId}/marks`, data);
export const submitCourseMarks = (offeringId) => axios.post(`/teacher/courses/${offeringId}/marks/submit`);
