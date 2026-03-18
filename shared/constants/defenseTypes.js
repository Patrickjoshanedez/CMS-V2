/**
 * Defense types for the Capstone Management System.
 * Maps to each capstone phase's evaluation event.
 */
export const DEFENSE_TYPES = Object.freeze({
  PROPOSAL: 'proposal', // Capstone 1 — paper/manuscript evaluation
  MIDTERM: 'midterm', // Capstone 2 — presentation/progress defense
  PAPER: 'paper', // Capstone 3 — chapters 4-5 paper evaluation
  FINAL: 'final', // Capstone 4 — final system defense
});

/**
 * All valid defense type values as an array (for Mongoose enum validation).
 */
export const DEFENSE_TYPE_VALUES = Object.values(DEFENSE_TYPES);
