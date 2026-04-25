/**
 * Valid statuses for a project title throughout its lifecycle.
 *
 * Status flow:
 *  DRAFT → SUBMITTED → APPROVED           (clean approval, Capstone 1 unlocks)
 *                    → REVISION_REQUIRED  (rejected outright, resubmit required)
 *                    → APPROVED_WITH_REVISION (approved but title must change first)
 *
 *  APPROVED_WITH_REVISION → PENDING_MODIFICATION (student submits proposed new title)
 *  PENDING_MODIFICATION   → APPROVED             (instructor accepts → fully unlocked)
 */
export const TITLE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REVISION_REQUIRED: 'revision_required',
  /** Approved conceptually, but the team must revise the title before Capstone 1 unlocks. */
  APPROVED_WITH_REVISION: 'approved_with_revision',
  PENDING_MODIFICATION: 'pending_modification',
});

export const TITLE_STATUS_VALUES = Object.values(TITLE_STATUSES);
