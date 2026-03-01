/**
 * Plagiarism / Originality Checking Service.
 *
 * Architecture:
 *   1. **Internal engine (always available):** Jaccard token-overlap similarity
 *      comparing the submitted text against all stored texts in the archive.
 *   2. **External API (Copyleaks):** When COPYLEAKS_EMAIL and COPYLEAKS_API_KEY
 *      are configured, the system submits to Copyleaks for a professional scan.
 *   3. **Fallback mock mode:** When neither the external API nor an archive is
 *      available, returns a mock score (70-100%) for development/testing.
 *
 * The service adapter pattern ensures swapping providers requires changes
 * in only this single file.
 *
 * @module services/plagiarism.service
 */
import env from '../config/env.js';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Tokenization & Similarity Helpers                                */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Tokenize text: lowercase, strip punctuation, split on whitespace.
 * Removes tokens shorter than 3 characters to reduce noise.
 *
 * @param {string} text
 * @returns {string[]} Array of normalized tokens
 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // strip punctuation
    .split(/\s+/) // split on whitespace
    .filter((t) => t.length >= 3); // drop very short tokens
}

/**
 * Compute Jaccard similarity coefficient between two token sets.
 * Returns a value between 0 (no overlap) and 1 (identical).
 *
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number} Similarity coefficient (0–1)
 */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build n-grams (shingles) from a token array for more accurate overlap.
 * Using 3-grams provides a balance between sensitivity and noise reduction.
 *
 * @param {string[]} tokens
 * @param {number} n - Shingle size (default: 3)
 * @returns {Set<string>}
 */
export function buildShingles(tokens, n = 3) {
  const shingles = new Set();
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.add(tokens.slice(i, i + n).join(' '));
  }
  return shingles;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Internal Similarity Engine                                       */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Compare submitted text against a corpus of existing documents.
 * Returns an originality score (0–100) and matched sources.
 *
 * @param {string} submittedText - The text to check
 * @param {Array<{ id: string, title: string, chapter: number, text: string }>} corpus
 * @returns {{ originalityScore: number, matchedSources: Array<{ submissionId: string, projectTitle: string, chapter: number, matchPercentage: number }> }}
 */
export function compareAgainstCorpus(submittedText, corpus) {
  if (!corpus || corpus.length === 0) {
    // No corpus to compare against — assume fully original
    return { originalityScore: 100, matchedSources: [] };
  }

  const submittedTokens = tokenize(submittedText);
  const submittedShingles = buildShingles(submittedTokens);

  const matchedSources = [];
  let maxSimilarity = 0;

  for (const doc of corpus) {
    if (!doc.text || doc.text.trim().length === 0) continue;

    const docTokens = tokenize(doc.text);
    const docShingles = buildShingles(docTokens);

    const similarity = jaccardSimilarity(submittedShingles, docShingles);
    const matchPercentage = Math.round(similarity * 100);

    if (matchPercentage > 5) {
      // Only report matches above 5% to reduce noise
      matchedSources.push({
        submissionId: doc.id,
        projectTitle: doc.title || 'Unknown Project',
        chapter: doc.chapter || 0,
        matchPercentage,
      });
    }

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  // Sort by highest match first
  matchedSources.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Originality = inverse of the highest similarity
  // We weight it: high max similarity reduces originality, but multiple
  // partial matches also factor in via an aggregate penalty.
  const avgSimilarity =
    matchedSources.length > 0
      ? matchedSources.reduce((sum, s) => sum + s.matchPercentage, 0) / matchedSources.length / 100
      : 0;

  // Blended score: 70% based on max match, 30% on average match
  const blendedSimilarity = 0.7 * maxSimilarity + 0.3 * avgSimilarity;
  const originalityScore = Math.max(0, Math.min(100, Math.round((1 - blendedSimilarity) * 100)));

  return {
    originalityScore,
    matchedSources: matchedSources.slice(0, 10), // Return top 10 matches
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Fallback Mock Mode                                               */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Generate a mock plagiarism result for development/testing.
 * Returns a random originality score between 70–100%.
 *
 * @returns {{ originalityScore: number, matchedSources: Array }}
 */
export function generateMockResult() {
  const originalityScore = Math.floor(Math.random() * 31) + 70; // 70–100
  return {
    originalityScore,
    matchedSources: [],
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  External API (Copyleaks) — Adapter                               */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Check if the external Copyleaks API is configured.
 * @returns {boolean}
 */
export function isCopyleaksConfigured() {
  return !!(env.COPYLEAKS_EMAIL && env.COPYLEAKS_API_KEY);
}

/**
 * Submit a document to Copyleaks for scanning.
 * This is a placeholder implementation — actual integration requires
 * Copyleaks SDK or API calls with OAuth2 authentication.
 *
 * @param {string} text - The extracted plain text to scan
 * @returns {Promise<string>} The scan ID for polling results
 * @throws {Error} If API is not configured or submission fails
 */
export async function submitToCopyleaks(_text) {
  if (!isCopyleaksConfigured()) {
    throw new Error('Copyleaks API is not configured. Set COPYLEAKS_EMAIL and COPYLEAKS_API_KEY.');
  }

  // TODO: Implement actual Copyleaks API integration
  // For now, this throws so the caller falls back to internal engine
  throw new Error('Copyleaks integration not yet implemented — using internal engine.');
}

/**
 * Get scan results from Copyleaks.
 *
 * @param {string} scanId - The scan ID returned from submitToCopyleaks
 * @returns {Promise<{ originalityScore: number, matchedSources: Array }>}
 */
export async function getCopyleaksResult(_scanId) {
  if (!isCopyleaksConfigured()) {
    throw new Error('Copyleaks API is not configured.');
  }

  // TODO: Implement actual Copyleaks result polling
  throw new Error('Copyleaks integration not yet implemented.');
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Service API                                                 */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Run an originality check on the given text.
 *
 * Strategy:
 *   1. If Copyleaks is configured → use external API
 *   2. If corpus is provided → use internal Jaccard engine
 *   3. Otherwise → return mock result (dev mode)
 *
 * @param {string} text - Extracted plain text from the submission
 * @param {Array} corpus - Array of existing documents to compare against
 * @returns {Promise<{ originalityScore: number, matchedSources: Array }>}
 */
export async function checkOriginality(text, corpus = []) {
  // Strategy 1: Try external API if configured
  if (isCopyleaksConfigured()) {
    try {
      const scanId = await submitToCopyleaks(text);
      return await getCopyleaksResult(scanId);
    } catch (err) {
      console.warn(
        `[Plagiarism] Copyleaks failed, falling back to internal engine: ${err.message}`,
      );
      // Fall through to internal engine
    }
  }

  // Strategy 2: Internal comparison engine
  if (corpus.length > 0) {
    return compareAgainstCorpus(text, corpus);
  }

  // Strategy 3: Mock result (no corpus, no API)
  console.warn('[Plagiarism] No corpus and no API configured — returning mock score.');
  return generateMockResult();
}

export default {
  tokenize,
  jaccardSimilarity,
  buildShingles,
  compareAgainstCorpus,
  generateMockResult,
  isCopyleaksConfigured,
  submitToCopyleaks,
  getCopyleaksResult,
  checkOriginality,
};
