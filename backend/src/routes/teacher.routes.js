const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const teacher = require('../controllers/teacher.controller');

router.use(verifyToken, requireRole(['teacher']));

router.get('/dashboard', teacher.getDashboard);
router.get('/courses', teacher.getCourses);
router.get('/courses/active', teacher.getActiveCourses);
router.get('/courses/:offeringId/students', teacher.getCourseStudents);
router.get('/courses/:offeringId/students/export', teacher.exportCourseStudents);
router.put('/grades/:enrollmentId', teacher.updateGrade);
router.put('/courses/:offeringId/bulk-grades', teacher.bulkUpdateGrades);
router.get('/profile', teacher.getProfile);
router.put('/profile', teacher.updateProfile);
const teacherPhotoUpload = require('../middleware/teacherPhotoUpload');
router.put('/profile/photo', teacherPhotoUpload.single('photo'), teacher.uploadPhoto);

router.get('/courses/:offeringId/marks', teacher.getCourseMarks);
router.put('/courses/:offeringId/marks', teacher.saveCourseMarks);
router.post('/courses/:offeringId/marks/submit', teacher.submitCourseMarks);

module.exports = router;
