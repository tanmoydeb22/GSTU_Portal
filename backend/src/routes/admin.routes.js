const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, requireRole } = require('../middleware/auth');
const admin = require('../controllers/admin.controller');
const staffPdf = require('../controllers/staff_pdf.controller');

// All admin routes require admin role
router.use(verifyToken, requireRole(['admin']));

// Multer setup for CSV uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Dashboard
router.get('/dashboard', admin.getDashboard);

// Sub-admins
router.post('/admins', admin.createAdmin);

// Departments
router.get('/departments', admin.getDepartments);
router.get('/departments/:id', admin.getDepartmentOverview);
router.get('/departments/:id/students', admin.getDepartmentStudents);
router.get('/departments/:id/teachers', admin.getDepartmentTeachers);
router.get('/departments/:id/results', admin.getDepartmentResults);
router.get('/results/:semesterId/board', admin.getSemesterResultBoard);
router.get('/results/:semesterId/pdf', staffPdf.generateOfficialResultPDF);
router.get('/departments/:id/staff-access', admin.getDepartmentStaffAccess);
router.post('/departments/:id/staff-access', admin.createDepartmentStaffAccess);
router.post('/departments', admin.createDepartment);
router.put('/departments/:id', admin.updateDepartment);

// Dept Staff
router.get('/dept-staff', admin.getDeptStaff);
router.put('/staff/:staffId/reset-password', admin.resetStaffPassword);
router.put('/staff/:staffId/toggle-status', admin.toggleStaffStatus);
router.delete('/staff/:staffId', admin.deleteDeptStaff);

// Teachers & Students (read-only)
router.get('/teachers', admin.getTeachers);
router.get('/students', admin.getStudents);

// Reports
router.get('/reports/enrollment', admin.getEnrollmentReport);

// Bulk Upload
router.post('/bulk-upload/students', upload.single('file'), admin.bulkUploadStudents);

// Global User Management
router.get('/users/search', admin.globalUserSearch);
router.put('/users/:role/:id', admin.updateGlobalUser);

// Settings
router.get('/settings/grading-scale', admin.getGradingScale);
router.put('/settings/grading-scale', admin.updateGradingScale);
router.get('/settings/grading', admin.getGradingScale); // Alias for cached frontends
router.put('/settings/grading', admin.updateGradingScale); // Alias for cached frontends
router.get('/settings/marks-config', admin.getMarksConfig);
router.put('/settings/marks-config', admin.updateMarksConfig);

module.exports = router;
