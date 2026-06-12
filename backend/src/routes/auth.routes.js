const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { verifyToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginLimiter, resetLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/auth.controller');

// Validation schemas
const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({ 'any.required': 'Identifier is required' }),
  password: Joi.string().required().messages({ 'any.required': 'Password is required' }),
  role: Joi.string().valid('admin', 'dept_staff', 'teacher', 'student').required(),
});

const forgotSchema = Joi.object({
  email: Joi.string().required(),
  role: Joi.string().valid('admin', 'dept_staff', 'teacher', 'student').required(),
});

const resetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const changeSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).required(),
});

// Routes
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', resetLimiter, validate(forgotSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetSchema), authController.resetPassword);
router.put('/change-password', verifyToken, validate(changeSchema), authController.changePassword);
router.get('/me', verifyToken, authController.me);

// Session Management
router.get('/sessions', verifyToken, authController.getSessions);
router.get('/login-history', verifyToken, authController.getLoginHistory);
router.post('/logout-all', verifyToken, authController.logoutAll);
router.delete('/logout/:sid', verifyToken, authController.logoutSession);
router.post('/tour-completed', verifyToken, authController.completeTour);

// OTP Password Reset
router.get('/get-phone-for-reset', authController.getPhoneForReset);
router.post('/reset-password-otp', authController.resetPasswordOtp);

module.exports = router;
