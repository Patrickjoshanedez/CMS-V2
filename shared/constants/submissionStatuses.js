/**
 * Valid statuses for individual chapter / proposal submissions.
 */
export const SUBMISSION_STATUSES = Object.freeze({
  PENDING: 'pending',
  PENDING_STUDENT_UPLOAD: 'pending_student_upload',
  PENDING_INSTRUCTOR_REVIEW: 'pending_instructor_review',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  ACCEPTED: 'accepted',
  REVISIONS_REQUIRED: 'revisions_required',
  REJECTED: 'rejected',
  LOCKED: 'locked',
});

export const SUBMISSION_STATUS_VALUES = Object.values(SUBMISSION_STATUSES);
