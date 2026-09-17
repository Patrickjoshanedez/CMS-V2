/**
 * Defense types for the Capstone Management System.
 * Maps to each institutional capstone phase's evaluation event:
 * - PROPOSAL: Capstone 1 (Proposal & Chapters 1–3 Manuscript Defense)
 * - PROGRESS: Capstone 2 (System Development & Prototype Demonstration)
 * - FINAL: Capstone 3 (Final Oral Defense & Academic Journal Evaluation)
 */
export const DEFENSE_TYPES = Object.freeze({
  PROPOSAL: 'proposal', // Capstone 1 — Proposal & Manuscript (Chapters 1–3) Evaluation
  PROGRESS: 'progress', // Capstone 2 — System Development & Prototype Progress Defense
  FINAL: 'final', // Capstone 3 — Final Oral Defense & Academic Journal Evaluation
  // Backward compatibility aliases:
  MIDTERM: 'progress',
  PAPER: 'final',
});

/**
 * All valid defense type values as an array (for Mongoose enum validation).
 * Includes backward compatibility aliases 'midterm' and 'paper'.
 */
export const DEFENSE_TYPE_VALUES = ['proposal', 'progress', 'final', 'midterm', 'paper'];
