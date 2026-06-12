import axios from './axios';

// Departments
export const getDepartments = () => axios.get('/staff/departments');

// Dashboard
export const getDashboardStats = () => axios.get('/staff/dashboard/stats');
export const getDashboardPendingTasks = () => axios.get('/staff/dashboard/pending-tasks');
export const getDashboardCgpaDistribution = () => axios.get('/staff/dashboard/cgpa-distribution');
export const getDashboardPaymentStatus = () => axios.get('/staff/dashboard/payment-status');
export const getDashboardRecentActivity = () => axios.get('/staff/dashboard/recent-activity');

// Teachers
export const getTeachers = (params) => axios.get('/staff/teachers', { params });
export const createTeacher = (data) => axios.post('/staff/teachers', data);
export const updateTeacher = (id, data) => axios.put(`/staff/teachers/${id}`, data);
export const deleteTeacher = (id) => axios.delete(`/staff/teachers/${id}`);
export const resetTeacherPassword = (id) => axios.put(`/staff/teachers/${id}/reset-password`);

// Students
export const getStudents = (params) => axios.get('/staff/students', { params });
export const getStudentDetail = (id) => axios.get(`/staff/students/${id}`);
export const createStudent = (data) => axios.post('/staff/students', data);
export const updateStudent = (id, data) => axios.put(`/staff/students/${id}`, data);
export const deleteStudent = (id) => axios.delete(`/staff/students/${id}`);
export const bulkAdvanceStudents = (data) => axios.post('/staff/students/bulk-advance', data);
export const advanceStudent = (id, data) => axios.put(`/staff/students/${id}/level-term`, data);
export const bulkUploadStudents = (formData) => axios.post('/staff/students/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const changeStudentStatus = (id, status) => axios.put(`/staff/students/${id}/status`, { student_status: status });
export const resetStudentPassword = (id) => axios.put(`/staff/students/${id}/reset-password`);
export const exportStudents = (params) => axios.get('/staff/students/export', { params, responseType: 'blob' });

// Courses
export const getCourses = (params) => axios.get('/staff/courses', { params });
export const createCourse = (data) => axios.post('/staff/courses', data);
export const updateCourse = (id, data) => axios.put(`/staff/courses/${id}`, data);
export const deleteCourse = (id) => axios.delete(`/staff/courses/${id}`);

// Semesters
export const getSemesters = (params) => axios.get('/staff/semesters', { params });
export const createSemester = (data) => axios.post('/staff/semesters', data);
export const updateSemester = (id, data) => axios.put(`/staff/semesters/${id}`, data);
export const toggleSemester = (id) => axios.put(`/staff/semesters/${id}/toggle`);
export const deleteSemester = (id) => axios.delete(`/staff/semesters/${id}`);

// Offerings
export const getOfferings = (params) => axios.get('/staff/offerings', { params });
export const createOffering = (data) => axios.post('/staff/offerings', data);
export const updateOffering = (id, data) => axios.put(`/staff/offerings/${id}`, data);
export const deleteOffering = (id) => axios.delete(`/staff/offerings/${id}`);

// Grades
// Grading Workflow
export const getSessions = () => axios.get('/staff/sessions');
export const getGradingStudents = (session) => axios.get('/staff/grading-students', { params: { session } });
export const getStudentEnrollments = (studentId, level, term) => axios.get(`/staff/student-enrollments/${studentId}`, { params: { level, term } });
export const saveGradeManual = (data) => axios.post('/staff/grades/save-manual', data);

// Grades
export const getGradeStatus = () => axios.get('/staff/grades/status');
export const getCourseGrades = (semesterId, offeringId) => axios.get(`/staff/grades/${semesterId}/${offeringId}`);
export const saveSingleGrade = (enrollmentId, data) => axios.put(`/staff/grades/${enrollmentId}`, data);
export const bulkUploadGradesPreview = (formData) => axios.post('/staff/grades/bulk-upload/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const bulkUploadGradesConfirm = (data) => axios.post('/staff/grades/bulk-upload/confirm', data);
export const publishGrades = (offeringId) => axios.post(`/staff/grades/${offeringId}/publish`);
// Marks Entry System
export const getSemesterMarksStatus = (semesterId) => axios.get(`/staff/marks/${semesterId}`);
export const getCourseMarksForReview = (semesterId, offeringId) => axios.get(`/staff/marks/${semesterId}/${offeringId}`);
export const saveStaffCourseMarks = (semesterId, offeringId, data) => axios.put(`/staff/marks/${semesterId}/${offeringId}`, data);
export const publishSemesterResult = (semesterId) => axios.post(`/staff/marks/${semesterId}/publish`);

// Restored old Grade endpoints for GradeReview/GradeEntry components
export const overrideStudentGrade = (offeringId, data) => axios.put(`/staff/grades/${offeringId}/override`, data);
export const bulkUpdateGrades = (offeringId, grades) => axios.put(`/staff/grades/${offeringId}/bulk-update`, { grades });
export const getBatchCourseGrades = (session, level, term, courseId) => axios.get(`/staff/grades/batch/${session}/${level}/${term}/${courseId}`);

// Enrollments
export const getEnrollments = (params) => axios.get('/staff/enrollments', { params });


export const getResultReport = (params) => axios.get('/staff/reports/results', { params });
export const exportResultReportPDF = (params) => axios.get('/staff/reports/results/export', { params, responseType: 'blob' });
export const getFailureRates = (params) => axios.get('/staff/reports/failure-rates', { params });
export const getPaymentsReport = (params) => axios.get('/staff/reports/payments', { params });
export const exportPaymentsCSV = (params) => axios.get('/staff/reports/payments/export', { params, responseType: 'blob' });
export const getPerformanceTrend = (params) => axios.get('/staff/reports/performance-trend', { params });

// Fee Structure
export const getFees = () => axios.get('/staff/fees');
export const createFee = (data) => axios.post('/staff/fees', data);
export const updateFee = (id, data) => axios.put(`/staff/fees/${id}`, data);

// Payments
export const getPayments = (params) => axios.get('/staff/payments', { params });
export const closeRegistrationAndGeneratePayments = (semester_id) => axios.post('/staff/payments/close-registration', { semester_id });
export const verifyPayment = (id, data) => axios.put(`/staff/payments/${id}/verify`, data);

// Official Result PDF & Committee
export const getExamCommittee = (semesterId) => axios.get(`/staff/results/${semesterId}/committee`);
export const addExamCommitteeMember = (semesterId, data) => axios.post(`/staff/results/${semesterId}/committee`, data);
export const removeExamCommitteeMember = (semesterId, id) => axios.delete(`/staff/results/${semesterId}/committee/${id}`);
export const downloadOfficialResultPDF = (semesterId) => axios.get(`/staff/results/${semesterId}/pdf`, { responseType: 'blob' });

// Historical Data Entry
export const getClosedSemesters = () => axios.get('/staff/historical/semesters');
export const getHistoricalOfferings = (semesterId) => axios.get(`/staff/historical/${semesterId}/offerings`);
export const assignHistoricalTeachers = (semesterId, data) => axios.put(`/staff/historical/${semesterId}/teachers`, data);
export const bulkEnrollHistorical = (semesterId, data) => axios.post(`/staff/historical/${semesterId}/enroll`, data);
export const getMarksTemplate = (semesterId) => axios.get(`/staff/historical/${semesterId}/template`, { responseType: 'blob' });
export const bulkGradeEntryHistorical = (semesterId, formData) => axios.post(`/staff/historical/${semesterId}/grades`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
export const getHistoricalStatus = (semesterId) => axios.get(`/staff/historical/${semesterId}/status`);

