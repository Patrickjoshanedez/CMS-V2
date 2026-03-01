/**
 * Defense types for the Capstone Management System.
 * Distinguishes between proposal defense (Capstone 1) and final defense (Capstone 4).
 */
export const DEFENSE_TYPES = Object.freeze({
  PROPOSAL: 'proposal',
  FINAL: 'final',
});

/**
 * All valid defense type values as an array (for Mongoose enum validation).
 */
export const DEFENSE_TYPE_VALUES = Object.values(DEFENSE_TYPES);
