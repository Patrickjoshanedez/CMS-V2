/**
 * Valid statuses for an overall capstone project.
 */
export const PROJECT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  PROPOSAL_SUBMITTED: 'proposal_submitted',
  PROPOSAL_APPROVED: 'proposal_approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
});

export const PROJECT_STATUS_VALUES = Object.values(PROJECT_STATUSES);
