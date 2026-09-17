/**
 * Capstone project phases.
 * A project progresses through these institutional phases sequentially:
 * 1 (Capstone 1) → 2 (Capstone 2) → 3 (Capstone 3: Final Defense & Archival).
 */
export const CAPSTONE_PHASES = Object.freeze({
  PHASE_1: 1, // Capstone 1: Proposal & Chapters 1–3 Manuscript
  PHASE_2: 2, // Capstone 2: System Development & Prototype
  PHASE_3: 3, // Capstone 3: Chapters 4–5, Academic Journal, Final Defense & Archival
  // Backward compatibility alias:
  PHASE_4: 3,
});

export const CAPSTONE_PHASE_VALUES = [1, 2, 3];
