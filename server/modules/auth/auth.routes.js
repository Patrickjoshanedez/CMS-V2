import { Router } from 'express';
import * as authController from './auth.controller.js';
import validate from '../../middleware/validate.js';
import authenticate from '../../middleware/authenticate.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';

const router = Router();

/**
 * Auth routes — /api/auth
 *
 * All public routes have aggressive rate limiting per .instructions.md Rule 2A.
 * Login and OTP endpoints get the strictest limits to mitigate brute-force attacks.
 */

// Public routes (no authentication required)
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/resend-otp', otpLimiter, validate(resendOtpSchema), authController.resendOtp);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/forgot-password', otpLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Protected routes (authentication required)
router.post('/logout', authenticate, authController.logout);

export default router;
