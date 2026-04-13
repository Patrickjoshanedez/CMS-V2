/**
 * Calculates similarity score between text proposals using simple TF-IDF or Token overlap.
 * 
 * @param {string} text1
 * @param {string} text2
 * @returns {number} Overlap score between 0 and 1
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could', 'couldnt',
  'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt',
  'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shant', 'she',
  'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'what',
  'whats', 'when', 'whens', 'where', 'wheres', 'which', 'whichs', 'while', 'whiles', 'who', 'whos', 'whom', 'why', 'whys',
  'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves',
  'system', 'project', 'application', 'app', 'web', 'mobile', 'based', 'using'
]);

export function tokenize(text) {
  if (!text) return [];
  if (Array.isArray(text)) return text;
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function calculateJaccardSimilarity(text1, text2) {
  const set1 = new Set(tokenize(text1));
  const set2 = new Set(tokenize(text2));

  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

export function calculateProposalSimilarity(p1, p2) {
  const scores = {};
  let totalScore = 0;
  let count = 0;

  const fields = ['title', 'problemStatement', 'proposedSolution', 'uniqueContribution', 'expectedImpact'];

  for (const field of fields) {
    if (p1[field] && p2[field]) {
      const score = calculateJaccardSimilarity(p1[field], p2[field]);
      scores[field] = score;
      totalScore += score;
      count++;
    }
  }

  const overall = count > 0 ? totalScore / count : 0;

  return {
    overall,
    fields: scores
  };
}

/**
 * Identify matching keywords to highlight.
 */
export function extractMatchingKeywords(text1, text2) {
  const set1 = new Set(tokenize(text1));
  const set2 = new Set(tokenize(text2));
  return Array.from(new Set([...set1].filter(x => set2.has(x))));
}
