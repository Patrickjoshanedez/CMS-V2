import User from '../users/user.model.js';
import OTP from './otp.model.js';
import RefreshToken from './refreshToken.model.js';
import AppError from '../../utils/AppError.js';
import { generateOtp } from '../../utils/generateOtp.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  getRefreshTokenExpiry,
} from '../../utils/generateToken.js';
import { sendOtpEmail } from '../notifications/email.service.js';
import env from '../../config/env.js';

/**
 * AuthService — Business logic for registration, OTP verification,
 * login, token refresh, logout, and password reset flows.
 *
 * Follows the service-layer pattern: all logic lives here,
 * controllers are thin wrappers that call these methods.
 */
class AuthService {
  /**
   * Register a new user account.
   * - Checks for duplicate email
   * - Creates the user (password hashed via model pre-save hook)
   * - Generates and emails a verification OTP
   *
   * @param {Object} data - { name, email, password }
   * @returns {Object} { user }
   */
  async register({ name, email, password }) {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    // Create user (unverified)
    const user = await User.create({ name, email, password });

    // Generate verification OTP and send via email
    await this.#createAndSendOtp(email, 'verification');

    return { user };
  }

  /**
   * Verify a 6-digit OTP.
   * - For 'verification' type: marks the user as verified
   * - For 'password_reset' type: validates the code (actual reset done in resetPassword)
   *
   * @param {Object} data - { email, code, type }
   * @returns {Object} { user }
   */
  async verifyOtp({ email, code, type }) {
    // Find the most recent OTP for this email and type
    const otpRecord = await OTP.findOne({ email, type }).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new AppError('No OTP found. Please request a new one.', 400, 'OTP_NOT_FOUND');
    }

    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
      throw new AppError('OTP has expired. Please request a new one.', 400, 'OTP_EXPIRED');
    }

    // Compare the candidate code against the hashed code
    const isMatch = await otpRecord.compareCode(code);
    if (!isMatch) {
      throw new AppError('Invalid OTP code.', 400, 'OTP_INVALID');
    }

    // Delete the used OTP
    await OTP.deleteMany({ email, type });

    if (type === 'verification') {
      // Mark user as verified
      const user = await User.findOneAndUpdate(
        { email },
        { isVerified: true },
        { new: true },
      );

      if (!user) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      return { user };
    }

    // For password_reset type, just return success
    // The actual password change happens in resetPassword
    const user = await User.findOne({ email });
    return { user };
  }

  /**
   * Resend an OTP to the user's email.
   * Deletes any existing OTPs for the email/type before creating a new one.
   *
   * @param {Object} data - { email, type }
   */
  async resendOtp({ email, type }) {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether the email exists (timing-safe)
      return;
    }

    if (type === 'verification' && user.isVerified) {
      throw new AppError('Email is already verified.', 400, 'ALREADY_VERIFIED');
    }

    await this.#createAndSendOtp(email, type);
  }

  /**
   * Authenticate a user with email and password.
   * - Validates credentials
   * - Checks if user is verified and active
   * - Generates access token (JWT) and refresh token
   *
   * @param {Object} data - { email, password }
   * @returns {Object} { user, accessToken, refreshToken }
   */
  async login({ email, password }) {
    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Check verification status
    if (!user.isVerified) {
      throw new AppError(
        'Please verify your email before logging in.',
        401,
        'EMAIL_NOT_VERIFIED',
      );
    }

    // Check active status
    if (!user.isActive) {
      throw new AppError('Your account has been deactivated.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens — pass a plain payload object (jwt.sign requires it)
    const tokenPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenString = generateRefreshTokenString();
    const hashedRefreshToken = hashToken(refreshTokenString);

    // Store the hashed refresh token in DB
    await RefreshToken.create({
      userId: user._id,
      token: hashedRefreshToken,
      expiresAt: getRefreshTokenExpiry(env.JWT_REFRESH_EXPIRES_IN),
    });

    // Remove password from the user object before returning
    user.password = undefined;

    return { user, accessToken, refreshToken: refreshTokenString };
  }

  /**
   * Refresh the access token using a valid refresh token.
   * Implements token rotation: the old refresh token is revoked
   * and a new one is issued.
   *
   * @param {string} refreshTokenStr - The plaintext refresh token from cookie
   * @returns {Object} { accessToken, refreshToken }
   */
  async refreshToken(refreshTokenStr) {
    if (!refreshTokenStr) {
      throw new AppError('Refresh token is required.', 401, 'REFRESH_TOKEN_REQUIRED');
    }

    const hashedToken = hashToken(refreshTokenStr);

    // Find the refresh token in DB
    const storedToken = await RefreshToken.findOne({ token: hashedToken });

    if (!storedToken) {
      throw new AppError('Invalid refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Check if revoked (possible reuse attack)
    if (storedToken.revokedAt) {
      // Potential reuse detected — revoke all tokens for this user as a safety measure
      await RefreshToken.revokeAllForUser(storedToken.userId);
      throw new AppError(
        'Refresh token has been revoked. All sessions invalidated for security.',
        401,
        'TOKEN_REUSE_DETECTED',
      );
    }

    // Check if expired
    if (storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token has expired. Please log in again.', 401, 'REFRESH_TOKEN_EXPIRED');
    }

    // Fetch the user
    const user = await User.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or deactivated.', 401, 'USER_INVALID');
    }

    // Generate new tokens (rotation) — pass a plain payload object
    const tokenPayload = { userId: user._id.toString(), role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshTokenString = generateRefreshTokenString();
    const newHashedRefreshToken = hashToken(newRefreshTokenString);

    // Store the new refresh token
    await RefreshToken.create({
      userId: user._id,
      token: newHashedRefreshToken,
      expiresAt: getRefreshTokenExpiry(env.JWT_REFRESH_EXPIRES_IN),
    });

    // Revoke the old refresh token, linking to the replacement
    await storedToken.revoke(newHashedRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshTokenString };
  }

  /**
   * Logout — revoke all refresh tokens for the user.
   *
   * @param {string} userId - The user's ObjectId
   */
  async logout(userId) {
    await RefreshToken.revokeAllForUser(userId);
  }

  /**
   * Initiate the forgot-password flow.
   * Sends a password reset OTP to the user's email.
   *
   * @param {Object} data - { email }
   */
  async forgotPassword({ email }) {
    const user = await User.findOne({ email });

    // Don't reveal whether the email exists (security best practice)
    if (!user) return;

    if (!user.isActive) return;

    await this.#createAndSendOtp(email, 'password_reset');
  }

  /**
   * Reset the user's password after OTP verification.
   * The OTP must be verified first via verifyOtp().
   *
   * @param {Object} data - { email, code, newPassword }
   * @returns {Object} { user }
   */
  async resetPassword({ email, code, newPassword }) {
    // Verify the OTP first
    await this.verifyOtp({ email, code, type: 'password_reset' });

    // Find the user and update password
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    user.password = newPassword;
    await user.save();

    // Revoke all existing refresh tokens (force re-login on all devices)
    await RefreshToken.revokeAllForUser(user._id);

    return { user };
  }

  // --- Private methods ---

  /**
   * Create a new OTP, store it (hashed), and send it via email.
   * Deletes any existing OTPs for the same email and type first.
   *
   * @param {string} email
   * @param {'verification' | 'password_reset'} type
   */
  async #createAndSendOtp(email, type) {
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type });

    // Generate plaintext OTP
    const plainOtp = generateOtp();

    // Store OTP (code is hashed via model pre-save hook)
    await OTP.create({
      email,
      code: plainOtp,
      type,
      expiresAt: new Date(Date.now() + (Number(env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000),
    });

    // Send OTP via email
    await sendOtpEmail(email, plainOtp, type);
  }
}

export default new AuthService();
