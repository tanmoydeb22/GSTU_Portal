const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, requireRole } = require('../middleware/auth');
const { requireDeptOwnership } = require('../middleware/denyRoleSwitch');
const staff = require('../controllers/staff.controller');
const staffDashboard = require('../controllers/staff_dashboard.controller');
const staffGrading = require('../controllers/staff_grading.controller');
const payment = require('../controllers/payment.controller');
const reports = require('../controllers/reports.controller');
const staffPdf = require('../controllers/staff_pdf.controller');
const historical = require('../controllers/staff_historical.controller');

// All staff routes require a valid dept_staff JWT
router.use(verifyToken, requireRole(['dept_staff']));

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Only CSV files allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// --- Departments ---
router.get('/departments', staff.getDepartments);

// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard/stats', staffDashboard.getDashboardStats);
router.get('/dashboard/pending-tasks', staffDashboard.getDashboardPendingTasks);
router.get('/dashboard/cgpa-distribution', staffDashboard.getDashboardCgpaDistribution);
router.get('/dashboard/payment-status', staffDashboard.getDashboardPaymentStatus);
router.get('/dashboard/recent-activity', staffDashboard.getDashboardRecentActivity);

// ─── Teachers ────────────────────────────────────────────────────────────────
router.get('/teachers', staff.getTeachers);
router.post('/teachers',              requireDeptOwnership, staff.createTeacher);
router.put('/teachers/:id',           requireDeptOwnership, staff.updateTeacher);
router.delete('/teachers/:id',        requireDeptOwnership, staff.deleteTeacher);
router.put('/teachers/:id/reset-password', requireDeptOwnership, staff.resetTeacherPassword);

// ─── Students ────────────────────────────────────────────────────────────────
router.get('/students', staff.getStudents);
router.get('/students/export',        staff.exportStudentsExcel);
router.get('/students/:studentId', staff.getStudentDetail);
router.post('/students',              requireDeptOwnership, staff.createStudent);
router.put('/students/:studentId',    requireDeptOwnership, staff.updateStudent);
router.delete('/students/:studentId', requireDeptOwnership, staff.deleteStudent);
router.post('/students/bulk-advance', requireDeptOwnership, staff.bulkAdvanceStudents);
router.put('/students/:studentId/level-term', requireDeptOwnership, staff.advanceStudent);
router.put('/students/:studentId/status', requireDeptOwnership, staff.changeStudentStatus);
router.put('/students/:studentId/reset-password', requireDeptOwnership, staff.resetStudentPassword);
router.post('/students/bulk-upload',  requireDeptOwnership, upload.single('file'), staff.bulkUploadStudents);

// ─── Courses ─────────────────────────────────────────────────────────────────
router.get('/courses', staff.getCourses);
router.post('/courses',               requireDeptOwnership, staff.createCourse);
router.put('/courses/:id',            requireDeptOwnership, staff.updateCourse);
router.delete('/courses/:id',         requireDeptOwnership, staff.deleteCourse);

// ─── Semesters ───────────────────────────────────────────────────────────────
router.get('/semesters', staff.getSemesters);
router.post('/semesters',             requireDeptOwnership, staff.createSemester);
router.put('/semesters/:id',          requireDeptOwnership, staff.updateSemester);
router.put('/semesters/:id/toggle',   requireDeptOwnership, staff.toggleSemester);
router.delete('/semesters/:id',        requireDeptOwnership, staff.deleteSemester);

// ─── Course Offerings ────────────────────────────────────────────────────────
router.get('/offerings', staff.getOfferings);
router.post('/offerings',             requireDeptOwnership, staff.createOffering);
router.put('/offerings/:id',          requireDeptOwnership, staff.updateOffering);
router.delete('/offerings/:id',       requireDeptOwnership, staff.deleteOffering);

// ─── Grades ──────────────────────────────────────────────────────────────────
router.get('/grades/status', staffGrading.getGradeStatus);
router.get('/grades/:semesterId/:offeringId', staffGrading.getCourseGrades);
router.put('/grades/:enrollmentId', requireDeptOwnership, staffGrading.saveSingleGrade);
router.post('/grades/bulk-upload/preview', requireDeptOwnership, upload.single('file'), staffGrading.bulkUploadPreview);
router.post('/grades/bulk-upload/confirm', requireDeptOwnership, staffGrading.bulkUploadConfirm);
router.post('/grades/:offeringId/publish', requireDeptOwnership, staffGrading.publishGrades);
router.put('/grades/:offeringId/bulk-update', requireDeptOwnership, staffGrading.bulkUpdateGrades);
router.get('/grades/batch/:session/:level/:term/:courseId', requireDeptOwnership, staffGrading.getBatchCourseGrades);

// (Legacy Grading Workflow endpoints - kept for compatibility)
router.get('/sessions', staff.getSessions);
router.get('/grading-students', staff.getGradingStudents);
router.get('/student-enrollments/:studentId', staff.getStudentEnrollmentsByLevelTerm);
router.post('/grades/save-manual',           requireDeptOwnership, staff.saveGradeManual);

// ─── Enrollments ─────────────────────────────────────────────────────────────
router.get('/enrollments', staff.getEnrollments);

// ─── Reports ─────────────────────────────────────────────────────────────────
router.get('/reports/results', requireDeptOwnership, reports.getResultReport);
router.get('/reports/results/export', requireDeptOwnership, reports.exportResultReportPDF);
router.get('/reports/failure-rates', requireDeptOwnership, reports.getFailureRates);
router.get('/reports/payments', requireDeptOwnership, reports.getPayments);
router.get('/reports/payments/export', requireDeptOwnership, reports.exportPaymentsCSV);
router.get('/reports/performance-trend', requireDeptOwnership, reports.getPerformanceTrend);


// ─── Fee Structure ───────────────────────────────────────────────────────────
router.get('/fees', payment.getFees);
router.post('/fees', requireDeptOwnership, payment.createFee);
router.put('/fees/:id', requireDeptOwnership, payment.updateFee);

// ─── Payments ────────────────────────────────────────────────────────────────
router.get('/payments', payment.getPayments);
router.post('/payments/close-registration', requireDeptOwnership, payment.closeRegistrationAndGeneratePayments);
router.put('/payments/:id/verify', requireDeptOwnership, payment.verifyPayment);

// Marks Entry System
router.get('/marks/:semesterId', staff.getSemesterMarksStatus);
router.get('/marks/:semesterId/:offeringId', staff.getCourseMarksForReview);
router.put('/marks/:semesterId/:offeringId', requireDeptOwnership, staff.saveStaffCourseMarks);
router.post('/marks/:semesterId/publish', requireDeptOwnership, staff.publishSemesterResult);

// Official Result PDF & Committee
router.get('/results/:semesterId/committee', staffPdf.getCommitteeMembers);
router.post('/results/:semesterId/committee', requireDeptOwnership, staffPdf.addCommitteeMember);
router.delete('/results/:semesterId/committee/:id', requireDeptOwnership, staffPdf.removeCommitteeMember);
router.get('/results/:semesterId/pdf', staffPdf.generateOfficialResultPDF);

// ─── Historical Data Entry ───────────────────────────────────────────────────
router.get('/historical/semesters', historical.getClosedSemesters);
router.get('/historical/:semesterId/offerings', historical.getHistoricalOfferings);
router.put('/historical/:semesterId/teachers', requireDeptOwnership, historical.assignTeachers);
router.post('/historical/:semesterId/enroll', requireDeptOwnership, historical.bulkEnroll);
router.get('/historical/:semesterId/template', historical.getMarksTemplate);
router.post('/historical/:semesterId/grades', requireDeptOwnership, upload.single('file'), historical.bulkGradeEntry);
router.get('/historical/:semesterId/status', historical.getStatus);

module.exports = router;
