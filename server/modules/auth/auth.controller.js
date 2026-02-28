import authService from './auth.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';
import env from '../../config/env.js';

/**
 * Cookie options for access and refresh tokens.
 * HTTP-only, Secure (in production), SameSite=Strict per .instructions.md Rule 2.
 */
const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
});

const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

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

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Registration successful. Please check your email for the verification code.',
    data: { user },
  });
});

/**
 * POST /api/auth/verify-otp
 * Verify a 6-digit OTP. Returns 200 with user data.
 */
export const verifyOtp = catchAsync(async (req, res) => {
  const { user } = await authService.verifyOtp(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'OTP verified successfully.',
    data: { user },
  });
});

/**
 * POST /api/auth/resend-otp
 * Resend OTP to user's email. Always returns 200 (don't reveal email existence).
 */
export const resendOtp = catchAsync(async (req, res) => {
  await authService.resendOtp(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'If an account with that email exists, a new verification code has been sent.',
  });
});

/**
 * POST /api/auth/login
 * Authenticate user. Sets access and refresh tokens in HTTP-only cookies.
 */
export const login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  // Set cookies
  res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Login successful.',
    data: { user },
  });
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using the refresh token cookie.
 * Implements token rotation.
 */
export const refresh = catchAsync(async (req, res) => {
  const refreshTokenStr = req.cookies?.refreshToken;

  const { accessToken, refreshToken } = await authService.refreshToken(refreshTokenStr);

  // Set new cookies
  res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Token refreshed successfully.',
  });
});

/**
 * POST /api/auth/logout
 * Revoke all refresh tokens for the user, clear cookies.
 * Requires authentication.
 */
export const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user._id);

  // Clear cookies
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * POST /api/auth/forgot-password
 * Send password reset OTP. Always returns 200 (don't reveal email existence).
 */
export const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'If an account with that email exists, a password reset code has been sent.',
  });
});

/**
 * POST /api/auth/reset-password
 * Reset password using OTP. Clears all sessions.
 */
export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);

  // Clear cookies in case the user is logged in on this device
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.',
  });
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user. Requires current password.
 */
export const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password changed successfully.',
  });
});
