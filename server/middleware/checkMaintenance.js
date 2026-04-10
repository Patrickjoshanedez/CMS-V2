import settingsService from '../modules/settings/settings.service.js';
import { ROLES } from '@cms/shared';
import AppError from '../utils/AppError.js';

/**
 * Maintenance Mode Middleware Factory
 *
 * If maintenance mode is active (maintenanceMode === true) and the user is NOT an instructor,
 * returns 503 Service Unavailable.
 *
 * Instructors and unauthenticated requests bypass maintenance mode.
 *
 * Must be placed AFTER authenticate middleware.
 *
 * @returns {Function} Express middleware
 *
 * @example
 *   import checkMaintenance from './middleware/checkMaintenance.js';
 *   router.use(authenticate, checkMaintenance());
 */
const checkMaintenance = () => {
  return async (req, res, next) => {
    try {
      // If no user, allow the request (e.g., /api/auth/login for non-authenticated)
      if (!req.user) {
        return next();
      }

      // Instructors always bypass maintenance mode
      if (req.user.role === ROLES.INSTRUCTOR) {
        return next();
      }

      // Check if maintenance mode is active
      const settings = await settingsService.getSettings();

      if (settings.maintenanceMode) {
        return next(
          new AppError(
            'The system is currently under maintenance. Please try again later.',
            503,
            'SERVICE_UNAVAILABLE',
          ),
        );
      }

      next();
    } catch (error) {
      // If settings retrieval fails, log but allow the request (fail-open)
      console.error('Error checking maintenance mode:', error);
      next();
    }
  };
};

export default checkMaintenance;
