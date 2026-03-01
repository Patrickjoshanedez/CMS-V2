/**
 * Evaluation (defense grading) statuses for the Capstone Management System.
 * Used during defense evaluations where panelists grade student projects.
 */
export const EVALUATION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  RELEASED: 'released',
});

/**
 * All valid evaluation status values as an array (for Mongoose enum validation).
 */
export const EVALUATION_STATUS_VALUES = Object.values(EVALUATION_STATUSES);
