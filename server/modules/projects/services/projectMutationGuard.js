import AppError from '../../../utils/AppError.js';
import { PROJECT_STATUSES } from '@cms/shared';

export function assertProjectWritable(project) {
  if (project?.isArchived === true || project?.projectStatus === PROJECT_STATUSES.ARCHIVED) {
    throw new AppError('Archived projects are read-only.', 409, 'PROJECT_ARCHIVED');
  }
}
