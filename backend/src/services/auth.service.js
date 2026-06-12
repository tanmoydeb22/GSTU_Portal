const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Sign an access token (short-lived).
 */
function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
}

/**
 * Sign a refresh token (long-lived).
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
}

/**
 * Verify a refresh token.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/**
 * Generate a secure random token for password reset.
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a temporary password for new accounts.
 */
function generateTempPassword(prefix = 'Staff') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}@${suffix}`;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  generateTempPassword,
};
