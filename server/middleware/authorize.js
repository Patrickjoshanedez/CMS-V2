import AppError from '../utils/AppError.js';

/**
 * Role-based authorization middleware factory.
 * Returns middleware that checks if req.user.role is in the allowed roles array.
 *
 * Must be placed AFTER the authenticate middleware.
 *
 * @param {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 *
 * @example
 *   router.delete('/users/:id', authenticate, authorize('instructor'), controller.delete);
 *   router.get('/teams', authenticate, authorize('instructor', 'adviser'), controller.list);
 */
const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action.',
          403,
          'FORBIDDEN',
        ),
      );
    }

    next();
  };
};

export default authorize;
