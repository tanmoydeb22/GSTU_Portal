const jwt = require('jsonwebtoken');

/**
 * Verify JWT access token from Authorization header.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    
    // Block limited tokens from accessing anything other than change-password
    if (req.user.limited && req.path !== '/change-password') {
      return res.status(403).json({ success: false, error: 'Password change required', must_change_password: true });
    }
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
}

/**
 * Require specific role(s).
 * Usage: requireRole(['admin', 'dept_staff'])
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
