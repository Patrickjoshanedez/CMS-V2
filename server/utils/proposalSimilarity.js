/**
 * Calculates similarity score between text proposals using simple TF-IDF or Token overlap.
 *
 * @param {string} text1
 * @param {string} text2
 * @returns {number} Overlap score between 0 and 1
 */

const STOP_WORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  'arent',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'cant',
  'cannot',
  'could',
  'couldnt',
  'did',
  'didnt',
  'do',
  'does',
  'doesnt',
  'doing',
  'dont',
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'hadnt',
  'has',
  'hasnt',
  'have',
  'havent',
  'having',
  'he',
  'hed',
  'hell',
  'hes',
  'her',
  'here',
  'heres',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'hows',
  'i',
  'id',
  'ill',
  'im',
  'ive',
  'if',
  'in',
  'into',
  'is',
  'isnt',
  'it',
  'its',
  'itself',
  'lets',
  'me',
  'more',
  'most',
  'mustnt',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'ought',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  'shant',
  'she',
  'shed',
  'shell',
  'shes',
  'should',
  'shouldnt',
  'so',
  'some',
  'such',
  'than',
  'that',
  'thats',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'theres',
  'these',
  'they',
  'theyd',
  'theyll',
  'theyre',
  'theyve',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  'wasnt',
  'we',
  'wed',
  'well',
  'were',
  'weve',
  'what',
  'whats',
  'when',
  'whens',
  'where',
  'wheres',
  'which',
  'whichs',
  'while',
  'whiles',
  'who',
  'whos',
  'whom',
  'why',
  'whys',
  'with',
  'wont',
  'would',
  'wouldnt',
  'you',
  'youd',
  'youll',
  'youre',
  'youve',
  'your',
  'yours',
  'yourself',
  'yourselves',
  'system',
  'project',
  'application',
  'app',
  'web',
  'mobile',
  'based',
  'using',
]);

export function tokenize(text) {
  if (!text) return [];
  if (Array.isArray(text)) {
    return text
      .map((token) =>
        String(token || '')
          .toLowerCase()
          .trim(),
      )
      .filter((token) => token.length > 0);
  }

  const normalized = String(text)
    .toLowerCase()
    // Keep word boundaries for punctuation-delimited tokens like "AI-powered"
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^\w\s]/g, ' ')
    .replace(/_/g, ' ');

  return normalized.split(/\s+/).filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function calculateJaccardSimilarity(text1, text2) {
  const set1 = new Set(tokenize(text1));
  const set2 = new Set(tokenize(text2));

  if (set1.size === 0 && set2.size === 0) return 0;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

const FIELD_WEIGHTS = {
  title: 0.6,
  problemStatement: 0.1,
  proposedSolution: 0.1,
  uniqueContribution: 0.1,
  expectedImpact: 0.1,
};

const SIMILARITY_FIELDS = [
  'title',
  'problemStatement',
  'proposedSolution',
  'uniqueContribution',
  'expectedImpact',
];

export function calculateProposalSimilarityDetailed(p1, p2) {
  const scores = {};
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const field of SIMILARITY_FIELDS) {
    if (p1[field] && p2[field]) {
      const score = calculateJaccardSimilarity(p1[field], p2[field]);
      const weight = FIELD_WEIGHTS[field] ?? 0;
      scores[field] = score;
      weightedTotal += score * weight;
      totalWeight += weight;
    }
  }

  const overall = totalWeight > 0 ? weightedTotal / totalWeight : 0;

  return {
    overall,
    fields: scores,
  };
}

export function calculateProposalSimilarity(p1, p2) {
  return calculateProposalSimilarityDetailed(p1, p2).overall;
}

/**
 * Identify matching keywords to highlight.
 */
export function extractMatchingKeywords(text1, text2) {
  const isObjectComparison =
    text1 &&
    text2 &&
    typeof text1 === 'object' &&
    typeof text2 === 'object' &&
    !Array.isArray(text1) &&
    !Array.isArray(text2);

  if (isObjectComparison) {
    const result = {};
    for (const field of SIMILARITY_FIELDS) {
      const set1 = new Set(tokenize(text1[field] || ''));
      const set2 = new Set(tokenize(text2[field] || ''));
      result[field] = Array.from(new Set([...set1].filter((x) => set2.has(x))));
    }
    return result;
  }

  const set1 = new Set(tokenize(text1));
  const set2 = new Set(tokenize(text2));
  return Array.from(new Set([...set1].filter((x) => set2.has(x))));
}
