/**
 * Title similarity utility — provides Levenshtein distance and keyword overlap
 * scoring for detecting duplicate or near-duplicate capstone titles.
 *
 * Used by ProjectService before allowing title submission to warn teams
 * if their proposed topic already exists or is highly similar.
 */

/**
 * Compute the Levenshtein (edit) distance between two strings.
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} The minimum number of single-character edits.
 */
export function levenshteinDistance(a, b) {
  const aLen = a.length;
  const bLen = b.length;

  // Quick exits
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // Use two-row approach for O(min(m,n)) space
  let prev = Array.from({ length: bLen + 1 }, (_, i) => i);
  let curr = new Array(bLen + 1);

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev]; // swap rows
  }

  return prev[bLen];
}

/**
 * Compute a normalised string similarity score (0–1) from Levenshtein distance.
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} Similarity score where 1.0 = identical.
 */
export function stringSimilarity(a, b) {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  if (normA === normB) return 1;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(normA, normB) / maxLen;
}

/**
 * Compute the Jaccard index of two keyword sets.
 * @param {string[]} setA - First keyword array.
 * @param {string[]} setB - Second keyword array.
 * @returns {number} Jaccard index (0–1) where 1.0 = identical sets.
 */
export function keywordOverlap(setA, setB) {
  const a = new Set(setA.map((k) => k.toLowerCase().trim()));
  const b = new Set(setB.map((k) => k.toLowerCase().trim()));
  if (a.size === 0 && b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Default weights for the combined similarity score.
 * @type {{ title: number, keyword: number }}
 */
const DEFAULT_WEIGHTS = { title: 0.7, keyword: 0.3 };

/**
 * Default threshold above which two projects are considered "similar".
 * @type {number}
 */
const DEFAULT_THRESHOLD = 0.65;

/**
 * Compare a candidate title + keywords against an array of existing projects.
 * Returns projects whose combined similarity score meets or exceeds the threshold.
 *
 * @param {{ title: string, keywords: string[] }} candidate - The proposed project.
 * @param {{ _id: any, title: string, keywords: string[] }[]} existingProjects
 * @param {{ threshold?: number, weights?: { title: number, keyword: number } }} [options]
 * @returns {{ projectId: any, title: string, score: number }[]} Similar projects sorted by score desc.
 */
export function findSimilarProjects(candidate, existingProjects, options = {}) {
  const { threshold = DEFAULT_THRESHOLD, weights = DEFAULT_WEIGHTS } = options;
  const results = [];

  for (const proj of existingProjects) {
    const titleScore = stringSimilarity(candidate.title, proj.title);
    const keywordScore = keywordOverlap(candidate.keywords || [], proj.keywords || []);
    const combined = weights.title * titleScore + weights.keyword * keywordScore;

    if (combined >= threshold) {
      results.push({
        projectId: proj._id,
        title: proj.title,
        score: Math.round(combined * 100) / 100,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
