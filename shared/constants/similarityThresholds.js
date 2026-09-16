/**
 * Canonical Title Similarity & Plagiarism Threshold Constants
 *
 * Single authoritative source of truth for BukSU CMS-V2 similarity clearance.
 */

/** Default title similarity threshold as a decimal ratio [0..1] */
export const DEFAULT_TITLE_SIMILARITY_THRESHOLD = 0.65;

/** Default title similarity threshold as a percentage [0..100] */
export const DEFAULT_TITLE_SIMILARITY_PERCENTAGE = 65.0;

/** Default plagiarism warning tolerance (≤ 75% original, i.e. 25% similarity) */
export const DEFAULT_PLAGIARISM_TOLERANCE_PERCENTAGE = 25.0;
