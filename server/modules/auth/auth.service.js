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
import { OAuth2Client } from 'google-auth-library';

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
   * @param {Object} data - { firstName, middleName, lastName, email, password }
   * @returns {Object} { user }
   */
  async register({ firstName, middleName, lastName, email, password }) {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409, 'DUPLICATE_EMAIL');
    }

    // Create user (unverified)
    const user = await User.create({ firstName, middleName, lastName, email, password });

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
      const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });

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

    if (user.authProvider === 'google' || !user.password) {
      throw new AppError(
        'This account uses Google sign-in. Please continue with Google.',
        401,
        'GOOGLE_ACCOUNT_PASSWORD_LOGIN_BLOCKED',
      );
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Check verification status
    if (!user.isVerified) {
      throw new AppError('Please verify your email before logging in.', 401, 'EMAIL_NOT_VERIFIED');
    }

    // Check active status
    if (!user.isActive) {
      throw new AppError('Your account has been deactivated.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const { accessToken, refreshToken } = await this.#issueTokens(user);

    // Remove password from the user object before returning
    user.password = undefined;

    return { user, accessToken, refreshToken };
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
      throw new AppError(
        'Refresh token has expired. Please log in again.',
        401,
        'REFRESH_TOKEN_EXPIRED',
      );
    }

    // Fetch the user
    const user = await User.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or deactivated.', 401, 'USER_INVALID');
    }

    // Generate new tokens (rotation)
    const { accessToken, refreshToken, hashedRefreshToken } = await this.#issueTokens(user);

    // Revoke the old refresh token, linking to the replacement
    await storedToken.revoke(hashedRefreshToken);

    return { accessToken, refreshToken };
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
   * The OTP was already verified and deleted in the verify-otp step,
   * so this method only updates the password.
   *
   * @param {Object} data - { email, newPassword }
   * @returns {Object} { user }
   */
  async resetPassword({ email, newPassword }) {
    // Find the user and update password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Prevent reusing the current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new AppError(
        'New password must be different from your current password.',
        400,
        'PASSWORD_REUSE',
      );
    }

    user.password = newPassword;
    await user.save();

    // Revoke all existing refresh tokens (force re-login on all devices)
    await RefreshToken.revokeAllForUser(user._id);

    return { user };
  }

  /**
   * Change the password for an authenticated user.
   * Requires the current password for verification.
   * Revokes all refresh tokens after change (force re-login on other devices).
   *
   * @param {string} userId - The authenticated user's ID.
   * @param {Object} data - { currentPassword, newPassword }
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS');
    }

    // Prevent reusing the current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new AppError(
        'New password must be different from your current password.',
        400,
        'PASSWORD_REUSE',
      );
    }

    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens (force re-login on other devices)
    await RefreshToken.revokeAllForUser(user._id);
  }

  /**
   * Authenticate a user via Google OAuth.
   * - Verifies the Google ID token server-side using google-auth-library
   * - If the user already exists (by googleId or email), logs them in
   * - If the user is new, creates an account (authProvider: 'google', verified, no password)
   * - If an existing local user tries Google login, links the Google account
   *
   * @param {Object} data - { credential } where credential is the Google ID token
   * @returns {Object} { user, accessToken, refreshToken }
   */
  async googleLogin({ credential }) {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google login is not configured.', 500, 'GOOGLE_NOT_CONFIGURED');
    }

    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

    // Verify the Google ID token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch {
      throw new AppError('Invalid Google token.', 401, 'GOOGLE_TOKEN_INVALID');
    }

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      email_verified,
    } = payload;

    if (!email_verified) {
      throw new AppError('Google email is not verified.', 401, 'GOOGLE_EMAIL_NOT_VERIFIED');
    }

    // Try to find an existing user by googleId first, then by email
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        // Existing local user — link their Google account
        user.googleId = googleId;
        user.authProvider = user.authProvider === 'local' ? 'local' : 'google';
        await user.save({ validateBeforeSave: false });
      } else {
        // Brand-new user — create with Google provider
        user = await User.create({
          firstName: firstName || 'Google',
          lastName: lastName || 'User',
          email,
          googleId,
          authProvider: 'google',
          isVerified: true, // Google already verified the email
          isActive: true,
        });
      }
    }

    // Check active status
    if (!user.isActive) {
      throw new AppError('Your account has been deactivated.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const { accessToken, refreshToken } = await this.#issueTokens(user);

    // Ensure password is not in the response
    user.password = undefined;

    return { user, accessToken, refreshToken };
  }

  // --- Private methods ---

  /**
   * Generate an access token and a refresh token for the given user,
   * persist the hashed refresh token, and return all three values.
   *
   * Centralises the token-issuance pipeline that was previously
   * duplicated in login(), refreshToken(), and googleLogin().
   *
   * @param {Object} user - Mongoose user document (needs _id, role)
   * @returns {Promise<{ accessToken: string, refreshToken: string, hashedRefreshToken: string }>}
   */
  async #issueTokens(user) {
    const tokenPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenString = generateRefreshTokenString();
    const hashed = hashToken(refreshTokenString);

    await RefreshToken.create({
      userId: user._id,
      token: hashed,
      expiresAt: getRefreshTokenExpiry(env.JWT_REFRESH_EXPIRES_IN),
    });

    return { accessToken, refreshToken: refreshTokenString, hashedRefreshToken: hashed };
  }

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
