import AppError from '../utils/AppError.js';
import Project from '../modules/projects/project.model.js';
import { ROLES } from '@cms/shared';

/**
 * Role-based authorization middleware factory.
 * Returns middleware that checks if req.user.role is in the allowed roles array.
 * Note: 'faculty' users are automatically granted permissions for 'adviser' and 'panelist' roles.
 *
 * Must be placed AFTER the authenticate middleware.
 *
 * @param {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    const userRole = req.user.role;

    // Direct match
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Faculty persona compatibility: 'faculty' satisfies 'adviser' and 'panelist'
    if (
      userRole === ROLES.FACULTY &&
      (allowedRoles.includes(ROLES.ADVISER) || allowedRoles.includes(ROLES.PANELIST))
    ) {
      return next();
    }

    // Legacy role compatibility: 'adviser' and 'panelist' satisfy 'faculty'
    if (
      allowedRoles.includes(ROLES.FACULTY) &&
      (userRole === ROLES.ADVISER || userRole === ROLES.PANELIST)
    ) {
      return next();
    }

    return next(
      new AppError(
        'You do not have permission to perform this action.',
        403,
        'FORBIDDEN',
      ),
    );
  };
};

/**
 * Project-specific panel role authorization middleware.
 * Validates that a faculty user is assigned to the specified project with one of the allowed panel roles
 * (e.g., 'chair' for issuing verdicts, 'secretary' for uploading defense minutes, 'member' for scoring).
 * Instructors are automatically authorized.
 *
 * @param {...string} allowedPanelRoles - e.g. 'chair', 'secretary', 'member'
 * @returns {Function} Express middleware
 */
export const authorizePanelRole = (...allowedPanelRoles) => {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    // Instructors have full oversight
    if (req.user.role === ROLES.INSTRUCTOR) {
      return next();
    }

    const projectId =
      req.params.projectId ||
      req.params.id ||
      req.body.projectId;

    if (!projectId) {
      return next(new AppError('Project context is required for panel authorization.', 400, 'PROJECT_REQUIRED'));
    }

    const userIdStr = req.user._id.toString();

    // 1. Check embedded panelAssignments on req.user if populated
    if (Array.isArray(req.user.panelAssignments) && req.user.panelAssignments.length > 0) {
      const assignment = req.user.panelAssignments.find(
        (a) => a.projectId && a.projectId.toString() === projectId.toString(),
      );
      if (assignment && allowedPanelRoles.includes(assignment.role)) {
        return next();
      }
    }

    // 2. Check project record directly
    try {
      const project = await Project.findById(projectId).select('panelists panelistIds adviserId');
      if (!project) {
        return next(new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND'));
      }

      // Check panelists array with discrete roles
      if (Array.isArray(project.panelists) && project.panelists.length > 0) {
        const panelistMatch = project.panelists.find(
          (p) => p.userId && p.userId.toString() === userIdStr,
        );
        if (panelistMatch && allowedPanelRoles.includes(panelistMatch.role)) {
          return next();
        }
      }

      // Fallback: If no discrete role found but user is in panelistIds and allowedPanelRoles includes 'member'
      if (
        Array.isArray(project.panelistIds) &&
        project.panelistIds.some((id) => id && id.toString() === userIdStr) &&
        allowedPanelRoles.includes('member')
      ) {
        return next();
      }

      return next(
        new AppError(
          `Action requires one of the following panel assignments: ${allowedPanelRoles.join(', ')}`,
          403,
          'PANEL_ROLE_FORBIDDEN',
        ),
      );
    } catch (err) {
      return next(err);
    }
  };
};

export default authorize;
