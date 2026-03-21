import authService from './auth.service.js';
import auditService from '../audit/audit.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';
import env from '../../config/env.js';

/**
 * Cookie options for access and refresh tokens.
 * HTTP-only, request-aware Secure, and configurable SameSite.
 */
const getCookieSecurityOptions = (req) => {
  const forwardedProtoHeader = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader;

  const isHttpsRequest = Boolean(req.secure || forwardedProto === 'https');
  const secure = env.COOKIE_SECURE ?? isHttpsRequest;

  // Browsers reject SameSite=None cookies unless Secure=true.
  const sameSite = secure
    ? env.COOKIE_SAME_SITE
    : env.COOKIE_SAME_SITE === 'none'
      ? 'lax'
      : env.COOKIE_SAME_SITE;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
};

const getAccessTokenCookieOptions = (req) => ({
  ...getCookieSecurityOptions(req),
  maxAge: 15 * 60 * 1000, // 15 minutes
});

const getRefreshTokenCookieOptions = (req) => ({
  ...getCookieSecurityOptions(req),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const getClientIp = (req) => req.ip || req.connection?.remoteAddress;

const sendSuccess = (res, status, message, data) => {
  const payload = { success: true, message };
  if (data !== undefined) {
    payload.data = data;
  }
  return res.status(status).json(payload);
};

const setAuthCookies = (req, res, { accessToken, refreshToken }) => {
  res.cookie('accessToken', accessToken, getAccessTokenCookieOptions(req));
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions(req));
};

const clearAuthCookies = (req, res) => {
  res.clearCookie('accessToken', getCookieSecurityOptions(req));
  res.clearCookie('refreshToken', getCookieSecurityOptions(req));
};

const logAuthEvent = ({ action, user, description, req }) => {
  auditService
    .log({
      action,
      actor: user._id,
      actorRole: user.role,
      targetType: 'User',
      targetId: user._id,
      description,
      ipAddress: getClientIp(req),
    })
    .catch(() => {});
};

/**
 * AuthController — Thin handlers that delegate to AuthService.
 * Each method sets appropriate HTTP status, cookies, and JSON response.
 */

/**
 * POST /api/auth/register
 * Register a new user. Returns 201 with user data (no tokens yet — must verify first).
 */
export const register = catchAsync(async (req, res) => {
  const { user } = await authService.register(req.body);

  return sendSuccess(
    res,
    HTTP_STATUS.CREATED,
    'Registration successful. Please check your email for the verification code.',
    { user },
  );
});

/**
 * POST /api/auth/verify-otp
 * Verify a 6-digit OTP. Returns 200 with user data.
 */
export const verifyOtp = catchAsync(async (req, res) => {
  const { user } = await authService.verifyOtp(req.body);

  return sendSuccess(res, HTTP_STATUS.OK, 'OTP verified successfully.', { user });
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP to user's email. Always returns 200 (don't reveal email existence).
 */
export const resendOtp = catchAsync(async (req, res) => {
  await authService.resendOtp(req.body);

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'If an account with that email exists, a new verification code has been sent.',
  );
});

/**
 * POST /api/auth/login
 * Authenticate user. Sets access and refresh tokens in HTTP-only cookies.
 */
export const login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  setAuthCookies(req, res, { accessToken, refreshToken });

  logAuthEvent({
    action: 'auth.login',
    user,
    description: `User ${user.email} logged in`,
    req,
  });

  return sendSuccess(res, HTTP_STATUS.OK, 'Login successful.', { user });
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using the refresh token cookie.
 * Implements token rotation.
 */
export const refresh = catchAsync(async (req, res) => {
  const refreshTokenStr = req.cookies?.refreshToken;

  const { accessToken, refreshToken } = await authService.refreshToken(refreshTokenStr);

  setAuthCookies(req, res, { accessToken, refreshToken });

  return sendSuccess(res, HTTP_STATUS.OK, 'Token refreshed successfully.');
});

/**
 * POST /api/auth/logout
 * Revoke all refresh tokens for the user, clear cookies.
 * Requires authentication.
 */
export const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user._id);

  clearAuthCookies(req, res);

  return sendSuccess(res, HTTP_STATUS.OK, 'Logged out successfully.');
});

/**
 * POST /api/auth/forgot-password
 * Send password reset OTP. Always returns 200 (don't reveal email existence).
 */
export const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body);

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'If an account with that email exists, a password reset code has been sent.',
  );
});

/**
 * POST /api/auth/reset-password
 * Reset password using OTP. Clears all sessions.
 */
export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);

  clearAuthCookies(req, res);

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Password reset successful. Please log in with your new password.',
  );
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user. Requires current password.
 */
export const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);

  return sendSuccess(res, HTTP_STATUS.OK, 'Password changed successfully.');
});

/**
 * POST /api/auth/google
 * Authenticate via Google OAuth. Verifies ID token, finds or creates user,
 * sets JWT cookies. No reCAPTCHA needed — Google handles bot detection.
 */
export const googleLogin = catchAsync(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: { code: 'MISSING_CREDENTIAL', message: 'Google credential is required.', status: 400 },
    });
  }

  const { user, accessToken, refreshToken } = await authService.googleLogin({ credential });

  setAuthCookies(req, res, { accessToken, refreshToken });

  logAuthEvent({
    action: 'auth.google_login',
    user,
    description: `User ${user.email} logged in via Google`,
    req,
  });

  return sendSuccess(res, HTTP_STATUS.OK, 'Google login successful.', { user });
});
