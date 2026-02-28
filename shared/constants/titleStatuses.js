/**
 * Valid statuses for a project title throughout its lifecycle.
 */
export const TITLE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REVISION_REQUIRED: 'revision_required',
  PENDING_MODIFICATION: 'pending_modification',
});

export const TITLE_STATUS_VALUES = Object.values(TITLE_STATUSES);
