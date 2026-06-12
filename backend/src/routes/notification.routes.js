const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const notif = require('../controllers/notification.controller');

// All notification routes require authentication
router.use(verifyToken);

router.get('/', notif.getMyNotifications);
router.put('/read-all', notif.markAllRead);
router.put('/:id/read', notif.markOneRead);
router.delete('/:id', notif.deleteOne);

// Admin broadcast — admin role only
router.post('/broadcast', requireRole(['admin']), notif.adminBroadcast);

module.exports = router;
