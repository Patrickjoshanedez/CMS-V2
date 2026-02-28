/**
 * Valid statuses for individual chapter / proposal submissions.
 */
export const SUBMISSION_STATUSES = Object.freeze({
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REVISIONS_REQUIRED: 'revisions_required',
  REJECTED: 'rejected',
  LOCKED: 'locked',
});

export const SUBMISSION_STATUS_VALUES = Object.values(SUBMISSION_STATUSES);
