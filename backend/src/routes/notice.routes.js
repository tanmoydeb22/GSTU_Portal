const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/notice.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const uploadNotice = require('../middleware/uploadNotice');

// Public route for all logged-in users
router.get('/', verifyToken, noticeController.getNotices);

// Admin & Dept Staff management routes
router.get('/manage', verifyToken, requireRole(['admin', 'dept_staff']), noticeController.getAllManageNotices);

router.post(
  '/', 
  verifyToken, 
  requireRole(['admin', 'dept_staff']), 
  uploadNotice.single('attachment'), 
  noticeController.createNotice
);

router.put(
  '/:id', 
  verifyToken, 
  requireRole(['admin', 'dept_staff']), 
  uploadNotice.single('attachment'), 
  noticeController.updateNotice
);

router.delete('/:id', verifyToken, requireRole(['admin', 'dept_staff']), noticeController.deleteNotice);

router.put('/:id/pin', verifyToken, requireRole(['admin', 'dept_staff']), noticeController.togglePin);

module.exports = router;
