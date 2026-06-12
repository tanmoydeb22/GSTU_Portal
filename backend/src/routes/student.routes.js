const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const student = require('../controllers/student.controller');
const payment = require('../controllers/payment.controller');
const reports = require('../controllers/reports.controller');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken, requireRole(['student']));

router.get('/dashboard', student.getDashboard);
router.get('/available-courses', student.getAvailableCourses);
router.post('/enroll', student.enroll);
router.delete('/enroll/:enrollmentId', student.dropCourse);
router.get('/enrollments', student.getEnrollments);
router.get('/transcript', student.getTranscript);
router.get('/cgpa', student.getCGPA);
router.get('/graduation-status', student.getGraduationStatus);
router.get('/profile', student.getProfile);
router.put('/profile', student.updateProfile);
const photoUpload = require('../middleware/photoUpload');
router.put('/profile/photo', photoUpload.single('photo'), student.uploadPhoto);
router.put('/password', student.changePassword);
router.get('/login-history', student.getLoginHistory);
router.get('/gpa-trend', student.getGpaTrend);
router.get('/my-courses', student.getMyCourses);
router.get('/teachers/:teacherCode', student.getTeacherPublicProfile);
// Retake & Improvement
router.get('/eligible-retake-improve', student.getEligibleRetakeImprove);
router.post('/retake', student.enrollRetake);
router.post('/improve', student.enrollImprove);

// Payments
const upload = require('../middleware/upload');
router.get('/payment', payment.getMyPayment);
router.post('/payment/initiate', paymentLimiter, payment.initiatePayment);
router.post('/payment/manual-submit', upload.single('receipt'), payment.submitManualPayment);
router.get('/payment/history', payment.getPaymentHistory);

// Transcript PDF download
router.get('/transcript/pdf', student.getTranscriptPDF);


router.get('/transcript/marks/:enrollmentId', student.getCourseBreakdown);

// Public Result Board
router.get('/results/semesters', student.getPublishedSemesters);
router.get('/results/board/:semesterId', student.getResultBoard);

module.exports = router;
