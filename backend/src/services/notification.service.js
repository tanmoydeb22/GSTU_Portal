const pool = require('../config/db');
const { getIO } = require('../config/socket');

/**
 * Persist a notification to DB and emit via Socket.io.
 *
 * @param {Object} opts
 * @param {string|null} opts.userId      - Specific user ID, or null for broadcast
 * @param {string}      opts.userType    - 'student'|'teacher'|'dept_staff'|'admin'|'all'
 * @param {number|null} opts.deptId      - Department filter for broadcasts, or null
 * @param {string}      opts.title
 * @param {string}      opts.message
 * @param {string}      [opts.type]      - 'info'|'success'|'warning'|'error'
 * @param {string|null} [opts.link]      - Optional frontend route to navigate on click
 */
async function sendNotification({ userId, userType, deptId = null, title, message, type = 'info', link = null }) {
  // 1. Persist to database
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, user_type, dept_id, title, message, type, link)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, userType, deptId || null, title, message, type, link || null]
  );

  const notification = {
    notification_id: result.insertId,
    user_id: userId || null,
    user_type: userType,
    dept_id: deptId || null,
    title,
    message,
    type,
    link: link || null,
    is_read: 0,
    created_at: new Date().toISOString(),
  };

  // 2. Emit via Socket.io — target the appropriate room
  try {
    const io = getIO();
    if (!io) return notification; // Socket not ready yet (e.g. during startup)

    if (userId) {
      // Direct to specific user
      io.to(`user:${userId}`).emit('notification:new', notification);
    } else if (deptId && userType !== 'all') {
      // All users of a role in a specific department
      io.to(`dept:${deptId}:role:${userType}`).emit('notification:new', notification);
    } else if (userType === 'all') {
      // Every connected user
      io.to('role:all').emit('notification:new', notification);
    } else {
      // All users of a given role across all departments
      io.to(`role:${userType}`).emit('notification:new', notification);
    }
  } catch (err) {
    console.error('[NotificationService] Socket emit failed:', err.message);
  }

  return notification;
}

/**
 * Send the same notification to multiple specific users in bulk.
 * Used for grade publishes, payment generation, etc.
 */
async function sendBulkNotifications(userIds, userType, opts) {
  for (const userId of userIds) {
    try {
      await sendNotification({ ...opts, userId, userType });
    } catch (err) {
      console.error(`[NotificationService] Failed for ${userId}:`, err.message);
    }
  }
}

module.exports = { sendNotification, sendBulkNotifications };
