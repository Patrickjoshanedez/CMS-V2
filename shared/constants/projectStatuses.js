/**
 * Valid statuses for an overall capstone project.
 */
export const PROJECT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  PROPOSAL_APPROVED: 'proposal_approved',
  PENDING_FOR_SUBMISSION: 'pending_for_submission',
  PENDING_IN_REVIEW: 'pending_in_review',
  REVISION_NEEDED: 'revision_needed',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
});

export const PROJECT_STATUS_VALUES = Object.values(PROJECT_STATUSES);
