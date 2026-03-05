import Project from '../modules/projects/project.model.js';
import AppError from '../utils/AppError.js';
import { TITLE_STATUSES } from '@cms/shared';

/**
 * CheckLock middleware — prevents title mutations on approved projects.
 *
 * Must be placed AFTER authenticate and BEFORE the controller.
 * Expects `req.params.id` to reference a valid project document.
 *
 * If the project's titleStatus is APPROVED, the request is rejected
 * with HTTP 403 and error code TITLE_LOCKED, enforcing the "locked
 * once approved" business rule at the middleware layer.
 */
const checkTitleLock = async (req, _res, next) => {
  try {
    const project = await Project.findById(req.params.id).select('titleStatus').lean();

    if (!project) {
      return next(new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND'));
    }

    if (project.titleStatus === TITLE_STATUSES.APPROVED) {
      return next(
        new AppError(
          'This title has been approved and is locked. Submit a modification request to make changes.',
          403,
          'TITLE_LOCKED',
        ),
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default checkTitleLock;
