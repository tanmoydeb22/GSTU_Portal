import axios from './axios';

export const getStudentDashboard = () => axios.get('/student/dashboard');
export const getAvailableCourses = () => axios.get('/student/available-courses');
export const enrollCourse = (offering_id) => axios.post('/student/enroll', { offering_id });
export const dropCourse = (enrollmentId) => axios.delete(`/student/enroll/${enrollmentId}`);
export const getStudentEnrollments = () => axios.get('/student/enrollments');
export const getTranscript = () => axios.get('/student/transcript');
export const getCGPA = () => axios.get('/student/cgpa');
export const getStudentProfile = () => axios.get('/student/profile');
export const updateStudentProfile = (data) => axios.put('/student/profile', data);
export const uploadStudentPhoto = (formData) => axios.put('/student/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const changeStudentPassword = (data) => axios.put('/student/password', data);
export const getStudentLoginHistory = () => axios.get('/student/login-history');
export const getGraduationStatus = () => axios.get('/student/graduation-status');
export const getGpaTrendApi = () => axios.get('/student/gpa-trend');
export const getMyCoursesApi = (semester = 'active') => axios.get(`/student/my-courses?semester=${semester}`);
export const getTeacherPublicProfile = (teacherCode) => axios.get(`/student/teachers/${teacherCode}`);
// Retake & Improvement
export const getEligibleRetakeImprove = () => axios.get('/student/eligible-retake-improve');
export const enrollRetake = (data) => axios.post('/student/retake', data);
export const enrollImprove = (data) => axios.post('/student/improve', data);

// Payments
export const getMyPayment = () => axios.get('/student/payment');
export const initiatePayment = (payment_id) => axios.post('/student/payment/initiate', { payment_id });
export const submitManualPayment = (formData) => axios.post('/student/payment/manual-submit', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getPaymentHistory = () => axios.get('/student/payment/history');

// Official PDF Transcript — returns blob for download
export const downloadTranscriptPDF = () =>
  axios.get('/student/transcript/pdf', { responseType: 'blob' });

export const getCourseBreakdown = (enrollmentId) => axios.get(`/student/transcript/marks/${enrollmentId}`);

// Public Result Board
export const getPublishedSemesters = () => axios.get('/student/results/semesters');
export const getResultBoard = (semesterId) => axios.get(`/student/results/board/${semesterId}`);
