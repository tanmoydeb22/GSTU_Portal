/**
 * denyRoleSwitch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Security middleware to enforce strict role boundaries on WRITE operations.
 *
 * Blocks mutating requests (POST/PUT/PATCH/DELETE) on academic data routes
 * if the authenticated dept_staff token does not carry a valid deptId.
 *
 * A real section officer always has deptId set in their JWT.
 * If deptId is missing/null it means something is wrong with the token.
 */

const { error } = require('../utils/response');

function requireDeptOwnership(req, res, next) {
  const readMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (readMethods.includes(req.method)) return next(); // reads are always fine

  const { deptId, role } = req.user || {};

  if (role !== 'dept_staff') {
    return error(res, 'Only department section officers may modify academic records.', 403);
  }

  if (!deptId) {
    return error(res, 'Your account is not linked to a department. Contact the administrator.', 403);
  }

  next();
}

module.exports = { requireDeptOwnership };
