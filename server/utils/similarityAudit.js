import { compareTwoStrings } from 'string-similarity';

function normalizeSimilarityText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toSimilarityPercentage(score) {
  return Number((Math.max(0, Math.min(1, score)) * 100).toFixed(1));
}

/**
 * Rank conflicts using fuzzy string similarity.
 *
 * @param {Object} params
 * @param {string} params.candidateText
 * @param {Array<any>} params.rows
 * @param {number} [params.threshold=0.7]
 * @param {number} [params.maxResults=10]
 * @param {(row:any)=>string} params.getText
 * @param {(row:any)=>Object} [params.mapRow]
 * @returns {Array<Object>}
 */
export function rankFuzzyConflicts({
  candidateText,
  rows,
  threshold = 0.7,
  maxResults = 10,
  getText,
  mapRow,
}) {
  const normalizedCandidate = normalizeSimilarityText(candidateText);
  if (!normalizedCandidate) return [];

  return (rows || [])
    .map((row) => {
      const comparisonText = normalizeSimilarityText(getText(row));
      if (!comparisonText) return null;

      const score = compareTwoStrings(normalizedCandidate, comparisonText);
      if (!Number.isFinite(score) || score < threshold) return null;

      return {
        ...(typeof mapRow === 'function' ? mapRow(row) : {}),
        score: Number(score.toFixed(4)),
        similarityPct: toSimilarityPercentage(score),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
