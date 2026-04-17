/**
 * Plagiarism / Originality Checking Service.
 *
 * Active engine design:
 *   1. Winnowing fingerprints over configurable k-grams for robust matching.
 *   2. Score as union of unique matched spans over total submission length.
 *   3. Optional Ollama AI-writing signal as a separate metric.
 *
 * @module services/plagiarism.service
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_GENERATE_MODEL = process.env.PLAGIARISM_OLLAMA_GENERATE_MODEL || 'llama3';
const OLLAMA_TIMEOUT_MS = Number(process.env.PLAGIARISM_OLLAMA_TIMEOUT_MS || 12000);
const ENABLE_OLLAMA_AI_DETECTION =
  String(process.env.PLAGIARISM_OLLAMA_AI_DETECTION_ENABLED || 'false') === 'true';

const FINGERPRINT_KGRAM_SIZE = Number(process.env.PLAGIARISM_KGRAM_SIZE || 6);
const FINGERPRINT_WINDOW_SIZE = Number(process.env.PLAGIARISM_WINNOW_WINDOW_SIZE || 4);
const MIN_REPORTED_MATCH_PERCENT = Number(process.env.PLAGIARISM_MIN_MATCH_PERCENT || 5);
const MAX_MATCHED_SOURCES = Number(process.env.PLAGIARISM_MAX_MATCHED_SOURCES || 10);

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function sumSpanLength(spans) {
  if (!Array.isArray(spans)) return 0;
  return spans.reduce((sum, span) => {
    const start = Number(span?.start);
    const end = Number(span?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return sum;
    return sum + (end - start);
  }, 0);
}

function mergeOverlappingSpans(spans) {
  if (!Array.isArray(spans) || spans.length === 0) return [];

  const sorted = spans
    .filter(
      (span) => Number.isFinite(span?.start) && Number.isFinite(span?.end) && span.end > span.start,
    )
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) return [];

  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function hashFNV1a(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function tokenizeWithRanges(text) {
  if (!text || typeof text !== 'string') return [];

  const rows = [];
  const regex = /[A-Za-z0-9_]+/g;
  let match = regex.exec(text);

  while (match) {
    const token = String(match[0] || '').toLowerCase();
    if (token.length >= 3) {
      rows.push({
        token,
        start: match.index,
        end: match.index + token.length,
      });
    }
    match = regex.exec(text);
  }

  return rows;
}

function buildKGramFingerprints(tokenRows, kGramSize) {
  if (!Array.isArray(tokenRows) || tokenRows.length < kGramSize) {
    return [];
  }

  const entries = [];

  for (let index = 0; index <= tokenRows.length - kGramSize; index += 1) {
    const kGram = tokenRows.slice(index, index + kGramSize);
    const phrase = kGram.map((row) => row.token).join(' ');
    const hash = hashFNV1a(phrase);

    entries.push({
      hash,
      phrase,
      start: kGram[0].start,
      end: kGram[kGram.length - 1].end,
      tokenStart: index,
      tokenEnd: index + kGramSize - 1,
    });
  }

  return entries;
}

function winnowFingerprints(kGramFingerprints, windowSize) {
  if (!Array.isArray(kGramFingerprints) || kGramFingerprints.length === 0) {
    return [];
  }

  const normalizedWindow = Math.max(1, Number(windowSize) || FINGERPRINT_WINDOW_SIZE);

  if (kGramFingerprints.length <= normalizedWindow) {
    const minFingerprint = [...kGramFingerprints].sort((a, b) => a.hash.localeCompare(b.hash))[0];
    return minFingerprint ? [minFingerprint] : [];
  }

  const selected = new Set();

  for (
    let windowStart = 0;
    windowStart <= kGramFingerprints.length - normalizedWindow;
    windowStart += 1
  ) {
    let minIdx = windowStart;
    for (let offset = 1; offset < normalizedWindow; offset += 1) {
      const currentIdx = windowStart + offset;
      if (kGramFingerprints[currentIdx].hash <= kGramFingerprints[minIdx].hash) {
        minIdx = currentIdx;
      }
    }
    selected.add(minIdx);
  }

  return [...selected].sort((a, b) => a - b).map((idx) => kGramFingerprints[idx]);
}

function buildSubmittedHashLookup(fingerprints) {
  const lookup = new Map();

  for (const item of fingerprints) {
    if (!item?.hash) continue;
    const key = String(item.hash);
    const existing = lookup.get(key) || [];
    existing.push(item);
    lookup.set(key, existing);
  }

  return lookup;
}

function resolveSourceHashSet(doc) {
  if (Array.isArray(doc?.fingerprintHashes)) {
    return new Set(doc.fingerprintHashes.map((value) => String(value)));
  }

  if (Array.isArray(doc?.fingerprints) && doc.fingerprints.length > 0) {
    const first = doc.fingerprints[0];
    if (typeof first === 'string') {
      return new Set(doc.fingerprints.map((value) => String(value)));
    }
    if (typeof first === 'object' && first !== null && first.hash) {
      return new Set(doc.fingerprints.map((value) => String(value.hash)));
    }
  }

  if (typeof doc?.text === 'string' && doc.text.trim()) {
    const derived = computeWinnowFingerprints(doc.text).map((item) => String(item.hash));
    return new Set(derived);
  }

  return new Set();
}

function deriveSourceSnippet(sourceText, phrase) {
  if (!sourceText || typeof sourceText !== 'string') return '';
  if (!phrase || typeof phrase !== 'string') {
    return sourceText.slice(0, 280);
  }

  const at = sourceText.toLowerCase().indexOf(phrase.toLowerCase());
  if (at < 0) {
    return sourceText.slice(0, 280);
  }

  const from = Math.max(0, at - 80);
  const to = Math.min(sourceText.length, at + phrase.length + 120);
  return sourceText.slice(from, to).trim();
}

async function postToOllama(endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_HOST}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status})`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonObjectResponse(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return null;
  }

  const trimmed = rawText.trim();

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) return null;

    try {
      const recovered = JSON.parse(trimmed.slice(start, end + 1));
      return recovered && typeof recovered === 'object' ? recovered : null;
    } catch {
      return null;
    }
  }
}

async function getAiWritingSignal(text) {
  if (!ENABLE_OLLAMA_AI_DETECTION || typeof text !== 'string' || text.trim().length < 300) {
    return null;
  }

  try {
    const response = await postToOllama('/api/generate', {
      model: OLLAMA_GENERATE_MODEL,
      format: 'json',
      stream: false,
      system:
        'You detect likely AI-authored academic writing. Return strict JSON with ai_probability (0-1) and rationale.',
      prompt: [
        'Analyze the following academic text and estimate whether it was AI-generated.',
        'Return JSON only.',
        '{"ai_probability": number between 0 and 1, "rationale": "short reason"}',
        '',
        text.slice(0, 4500),
      ].join('\n'),
      options: { temperature: 0 },
    });

    const parsed = parseJsonObjectResponse(response?.response || '');
    if (!parsed) return null;

    const probability = Number(parsed.ai_probability);
    if (!Number.isFinite(probability)) return null;

    return {
      probability: Math.max(0, Math.min(1, probability)),
      rationale:
        typeof parsed.rationale === 'string' && parsed.rationale.trim()
          ? parsed.rationale.trim().slice(0, 300)
          : null,
    };
  } catch (error) {
    console.warn(`[Plagiarism] AI-writing signal unavailable: ${error.message}`);
    return null;
  }
}

/**
 * Tokenize text: lowercase, strip punctuation, split on whitespace.
 * Removes tokens shorter than 3 characters to reduce noise.
 *
 * @param {string} text
 * @returns {string[]} Array of normalized tokens
 */
export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

/**
 * Compute Jaccard similarity coefficient between two token sets.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build n-gram shingles from a token array.
 */
export function buildShingles(tokens, n = FINGERPRINT_KGRAM_SIZE) {
  const shingles = new Set();
  const normalizedN = Math.max(1, Number(n) || FINGERPRINT_KGRAM_SIZE);

  for (let i = 0; i <= tokens.length - normalizedN; i += 1) {
    shingles.add(tokens.slice(i, i + normalizedN).join(' '));
  }

  return shingles;
}

/**
 * Build Winnowing fingerprints for a document.
 *
 * @param {string} text
 * @param {{ kGramSize?: number, windowSize?: number }} options
 * @returns {Array<{ hash: string, phrase: string, start: number, end: number, tokenStart: number, tokenEnd: number }>}
 */
export function computeWinnowFingerprints(text, options = {}) {
  const tokenRows = tokenizeWithRanges(text);
  const kGramSize = Math.max(2, Number(options.kGramSize) || FINGERPRINT_KGRAM_SIZE);
  const windowSize = Math.max(1, Number(options.windowSize) || FINGERPRINT_WINDOW_SIZE);

  if (tokenRows.length < kGramSize) {
    return [];
  }

  const kGramFingerprints = buildKGramFingerprints(tokenRows, kGramSize);
  return winnowFingerprints(kGramFingerprints, windowSize);
}

/**
 * Compare submitted text against a corpus of indexed candidate documents.
 * Score is computed by unique matched span coverage over total document size.
 */
export function compareAgainstCorpus(submittedText, corpus, options = {}) {
  if (!Array.isArray(corpus) || corpus.length === 0) {
    return {
      originalityScore: 100,
      similarityPercentage: 0,
      matchedCharacterCount: 0,
      totalCharacters: String(submittedText || '').length,
      matchedSources: [],
      submittedFingerprintCount: 0,
    };
  }

  const submittedFingerprints =
    Array.isArray(options.submittedFingerprints) && options.submittedFingerprints.length > 0
      ? options.submittedFingerprints
      : computeWinnowFingerprints(submittedText);

  const submittedHashLookup = buildSubmittedHashLookup(submittedFingerprints);
  const totalCharacters = Math.max(1, String(submittedText || '').length);

  if (submittedHashLookup.size === 0) {
    return {
      originalityScore: 100,
      similarityPercentage: 0,
      matchedCharacterCount: 0,
      totalCharacters,
      matchedSources: [],
      submittedFingerprintCount: 0,
    };
  }

  const allMatchedSpans = [];
  const matchedSources = [];

  for (const doc of corpus) {
    const sourceHashSet = resolveSourceHashSet(doc);
    if (sourceHashSet.size === 0) continue;

    const sharedHashes = [];
    for (const hash of submittedHashLookup.keys()) {
      if (sourceHashSet.has(hash)) {
        sharedHashes.push(hash);
      }
    }

    if (sharedHashes.length === 0) continue;

    const sourceSpans = mergeOverlappingSpans(
      sharedHashes.flatMap((hash) =>
        (submittedHashLookup.get(hash) || []).map((fingerprint) => ({
          start: fingerprint.start,
          end: fingerprint.end,
        })),
      ),
    );

    if (sourceSpans.length === 0) continue;

    const coveredCharacters = sumSpanLength(sourceSpans);
    const spanCoveragePercent = (coveredCharacters / totalCharacters) * 100;
    const submittedCoveragePercent = (sharedHashes.length / submittedHashLookup.size) * 100;
    const sourceCoveragePercent = (sharedHashes.length / sourceHashSet.size) * 100;
    const matchPercentage = clampPercent(
      Math.max(spanCoveragePercent, submittedCoveragePercent, sourceCoveragePercent),
    );

    if (matchPercentage < MIN_REPORTED_MATCH_PERCENT) {
      continue;
    }

    const firstSpan = sourceSpans[0];
    const phrase =
      typeof submittedText === 'string' && Number.isFinite(firstSpan?.start)
        ? submittedText.slice(firstSpan.start, firstSpan.end)
        : '';

    allMatchedSpans.push(...sourceSpans);

    matchedSources.push({
      submissionId: doc.id,
      projectTitle: doc.title || 'Unknown Project',
      chapter: doc.chapter ?? null,
      matchPercentage: Number(matchPercentage.toFixed(1)),
      spans: sourceSpans,
      start_index: firstSpan?.start ?? null,
      end_index: firstSpan?.end ?? null,
      sourceSnippet: deriveSourceSnippet(doc.text || '', phrase),
      winnowScore: sharedHashes.length / submittedHashLookup.size,
      semanticScore: null,
      sharedFingerprintCount: sharedHashes.length,
    });
  }

  matchedSources.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return (b.sharedFingerprintCount || 0) - (a.sharedFingerprintCount || 0);
  });

  const mergedDocumentSpans = mergeOverlappingSpans(allMatchedSpans);
  const matchedCharacterCount = sumSpanLength(mergedDocumentSpans);
  const similarityPercentage = clampPercent((matchedCharacterCount / totalCharacters) * 100);
  const originalityScore = clampPercent(100 - similarityPercentage);

  return {
    originalityScore: Number(originalityScore.toFixed(1)),
    similarityPercentage: Number(similarityPercentage.toFixed(1)),
    matchedCharacterCount,
    totalCharacters,
    matchedSources: matchedSources.slice(0, MAX_MATCHED_SOURCES),
    submittedFingerprintCount: submittedFingerprints.length,
    uniqueMatchedSpans: mergedDocumentSpans,
  };
}

/**
 * Generate a mock plagiarism result for development/testing.
 */
export function generateMockResult() {
  const originalityScore = Math.floor(Math.random() * 31) + 70;
  const similarityPercentage = clampPercent(100 - originalityScore);

  return {
    originalityScore,
    similarityPercentage,
    matchedCharacterCount: 0,
    totalCharacters: 0,
    matchedSources: [],
    submittedFingerprintCount: 0,
  };
}

/**
 * Run an originality check on extracted text.
 */
export async function checkOriginality(text, corpus = [], options = {}) {
  const normalizedText = typeof text === 'string' ? text : '';

  const baseResult =
    Array.isArray(corpus) && corpus.length > 0
      ? compareAgainstCorpus(normalizedText, corpus, options)
      : generateMockResult();

  const aiWritingSignal = await getAiWritingSignal(normalizedText);
  if (!aiWritingSignal) {
    return baseResult;
  }

  return {
    ...baseResult,
    aiWritingSignal,
  };
}

export default {
  tokenize,
  jaccardSimilarity,
  buildShingles,
  computeWinnowFingerprints,
  compareAgainstCorpus,
  generateMockResult,
  checkOriginality,
};
