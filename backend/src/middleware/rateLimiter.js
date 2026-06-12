const rateLimit = require('express-rate-limit');

// Login: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 500,
  message: {
    success: false,
    error: 'Too many login attempts. Try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Password reset: 3 requests per hour per IP
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many password reset requests. Try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment Initiation: 10 requests per hour per IP
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many payment requests. Try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, resetLimiter, apiLimiter, paymentLimiter };
