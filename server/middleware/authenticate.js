import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../modules/users/user.model.js';
import AppError from '../utils/AppError.js';

/**
 * Authentication middleware.
 * Extracts JWT from the HTTP-only 'accessToken' cookie,
 * verifies it, and attaches the user document to req.user.
 *
 * Must be placed before any route that requires authentication.
 */
const authenticate = async (req, _res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401, 'AUTH_REQUIRED');
    }

    // Verify and decode the JWT
    const decoded = verifyAccessToken(token);

    // Fetch the user from DB to ensure they still exist and are active
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      throw new AppError('User no longer exists.', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated.', 401, 'ACCOUNT_DEACTIVATED');
    }

    if (!user.isVerified) {
      throw new AppError('Email not verified. Please verify your email first.', 401, 'EMAIL_NOT_VERIFIED');
    }

    // Attach user to request for downstream middleware/controllers
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
