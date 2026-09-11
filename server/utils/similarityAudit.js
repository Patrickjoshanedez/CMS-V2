/**
 * Compute the Sørensen-Dice coefficient between two strings.
 * Standalone zero-dependency replacement for deprecated string-similarity package.
 *
 * @param {string} first
 * @param {string} second
 * @returns {number} Similarity score between 0 and 1
 */
export function compareTwoStrings(first, second) {
  const str1 = String(first || '').replace(/\s+/g, '');
  const str2 = String(second || '').replace(/\s+/g, '');

  if (str1 === str2) return 1;
  if (str1.length < 2 || str2.length < 2) return 0;

  const firstBigrams = new Map();
  for (let i = 0; i < str1.length - 1; i++) {
    const bigram = str1.substring(i, i + 2);
    firstBigrams.set(bigram, (firstBigrams.get(bigram) || 0) + 1);
  }

  let intersectionSize = 0;
  for (let i = 0; i < str2.length - 1; i++) {
    const bigram = str2.substring(i, i + 2);
    const count = firstBigrams.get(bigram) || 0;
    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / (str1.length + str2.length - 2);
}

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
