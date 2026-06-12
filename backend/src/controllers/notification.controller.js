const pool = require('../config/db');
const { success, badRequest, notFound } = require('../utils/response');
const { sendNotification } = require('../services/notification.service');

/**
 * Build WHERE clause for fetching notifications belonging to the current user.
 * A user sees:
 *   1. Notifications addressed directly to them (user_id = userId, user_type = role)
 *   2. Role-level broadcasts for their role (user_id IS NULL, user_type = role, dept matches or is null)
 *   3. Global broadcasts (user_type = 'all')
 */
function buildUserFilter(userId, role, deptId) {
  const conditions = `(
    (user_type = ? AND user_id = ?) OR
    (user_type = ? AND user_id IS NULL AND (dept_id = ? OR dept_id IS NULL)) OR
    (user_type = 'all')
  )`;
  const params = [role, userId, role, deptId || null];
  return { conditions, params };
}

/**
 * GET /api/notifications
 * Returns paginated notifications for the authenticated user.
 */
async function getMyNotifications(req, res, next) {
  try {
    const { userId, role, deptId } = req.user;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * parseInt(limit);

    const { conditions, params } = buildUserFilter(userId, role, deptId);

    // Optional type filter
    let typeClause = '';
    const typeParams = [];
    if (type && type !== 'all') {
      typeClause = ' AND type = ?';
      typeParams.push(type);
    }

    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE ${conditions}${typeClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, ...typeParams, parseInt(limit), offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM notifications WHERE ${conditions}${typeClause}`,
      [...params, ...typeParams]
    );

    const [unreadRows] = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE ${conditions} AND is_read = 0`,
      params
    );

    return success(res, {
      notifications: rows,
      total: countRows[0].total,
      unreadCount: unreadRows[0].count,
      page: parseInt(page),
      totalPages: Math.ceil(countRows[0].total / parseInt(limit)),
    });
  } catch (err) { next(err); }
}

/**
 * PUT /api/notifications/:id/read
 */
async function markOneRead(req, res, next) {
  try {
    const [r] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ?',
      [req.params.id]
    );
    if (r.affectedRows === 0) return notFound(res, 'Notification not found');
    return success(res, null, 'Marked as read');
  } catch (err) { next(err); }
}

/**
 * PUT /api/notifications/read-all
 */
async function markAllRead(req, res, next) {
  try {
    const { userId, role, deptId } = req.user;
    const { conditions, params } = buildUserFilter(userId, role, deptId);
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE ${conditions}`,
      params
    );
    return success(res, null, 'All notifications marked as read');
  } catch (err) { next(err); }
}

/**
 * DELETE /api/notifications/:id
 */
async function deleteOne(req, res, next) {
  try {
    const [r] = await pool.query(
      'DELETE FROM notifications WHERE notification_id = ?',
      [req.params.id]
    );
    if (r.affectedRows === 0) return notFound(res, 'Notification not found');
    return success(res, null, 'Notification deleted');
  } catch (err) { next(err); }
}

/**
 * POST /api/notifications/broadcast  — Admin only
 * Body: { title, message, type, userType, deptId, link }
 */
async function adminBroadcast(req, res, next) {
  try {
    const { title, message, type = 'info', userType = 'all', deptId, link } = req.body;
    if (!title || !message) return badRequest(res, 'Title and message are required');
    if (!['student', 'teacher', 'dept_staff', 'admin', 'all'].includes(userType)) {
      return badRequest(res, 'Invalid userType');
    }

    const notif = await sendNotification({
      userId: null,
      userType,
      deptId: deptId || null,
      title,
      message,
      type,
      link: link || null,
    });

    return success(res, notif, `Notification broadcast to ${userType}`);
  } catch (err) { next(err); }
}

module.exports = { getMyNotifications, markOneRead, markAllRead, deleteOne, adminBroadcast };
