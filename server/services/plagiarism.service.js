import crypto from 'crypto';
import mongoose from 'mongoose';
import Fingerprint from '../models/fingerprint.model.js';
import Project from '../modules/projects/project.model.js';
import Submission from '../modules/submissions/submission.model.js';

const DEFAULT_K_GRAM_SIZE = 7;
const DEFAULT_WINDOW_SIZE = 4;
const MIN_K_GRAM_SIZE = 3;
const MAX_K_GRAM_SIZE = 128;
const MIN_WINDOW_SIZE = 2;
const MAX_WINDOW_SIZE = 256;

function toBoundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export const K_GRAM_SIZE = toBoundedInt(
  process.env.PLAGIARISM_K_GRAM_SIZE,
  DEFAULT_K_GRAM_SIZE,
  MIN_K_GRAM_SIZE,
  MAX_K_GRAM_SIZE,
);
export const WINDOW_SIZE = toBoundedInt(
  process.env.PLAGIARISM_WINDOW_SIZE,
  DEFAULT_WINDOW_SIZE,
  MIN_WINDOW_SIZE,
  MAX_WINDOW_SIZE,
);

const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

function resolveWinnowTuning(options = {}) {
  return {
    kGramSize: toBoundedInt(options?.kGramSize, K_GRAM_SIZE, MIN_K_GRAM_SIZE, MAX_K_GRAM_SIZE),
    windowSize: toBoundedInt(options?.windowSize, WINDOW_SIZE, MIN_WINDOW_SIZE, MAX_WINDOW_SIZE),
  };
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function toObjectId(value) {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
}

function toRounded(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function countWords(text) {
  const matches = String(text || '').match(/\b[a-zA-Z0-9]+\b/g);
  return Array.isArray(matches) ? matches.length : 0;
}

function mergeIntervals(intervals = []) {
  const normalized = intervals
    .map((interval) => ({
      start: Number(interval?.start),
      end: Number(interval?.end),
    }))
    .filter((interval) => Number.isFinite(interval.start) && Number.isFinite(interval.end))
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  if (normalized.length === 0) return [];

  const merged = [normalized[0]];

  for (let index = 1; index < normalized.length; index += 1) {
    const current = normalized[index];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function countWordsInIntervals(text, intervals = []) {
  return mergeIntervals(intervals).reduce((sum, interval) => {
    const excerpt = String(text || '').slice(interval.start, interval.end);
    return sum + countWords(excerpt);
  }, 0);
}

function md5Hash(input) {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 8);
}

function tokenizeWithRanges(text) {
  const normalizedText = String(text || '');
  const regex = /[a-z0-9]+/g;
  const rows = [];
  let match = regex.exec(normalizedText);

  while (match) {
    rows.push({
      token: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
    match = regex.exec(normalizedText);
  }

  return rows;
}

function buildKGrams(tokens, kGramSize = K_GRAM_SIZE) {
  if (!Array.isArray(tokens) || tokens.length < kGramSize) {
    return [];
  }

  const kgrams = [];
  for (let index = 0; index <= tokens.length - kGramSize; index += 1) {
    const group = tokens.slice(index, index + kGramSize);
    const phrase = group.map((item) => item.token).join(' ');

    kgrams.push({
      hash: md5Hash(phrase),
      phrase,
      startIndex: group[0].startIndex,
      endIndex: group[group.length - 1].endIndex,
    });
  }

  return kgrams;
}

function winnowKGrams(kgrams, windowSize = WINDOW_SIZE) {
  if (!Array.isArray(kgrams) || kgrams.length === 0) {
    return [];
  }

  const normalizedWindow = Math.max(1, Number(windowSize) || WINDOW_SIZE);

  if (kgrams.length <= normalizedWindow) {
    const min = [...kgrams].sort((left, right) => left.hash.localeCompare(right.hash))[0];
    return min ? [min] : [];
  }

  const selected = new Set();

  for (let windowStart = 0; windowStart <= kgrams.length - normalizedWindow; windowStart += 1) {
    let minIndex = windowStart;

    for (let offset = 1; offset < normalizedWindow; offset += 1) {
      const currentIndex = windowStart + offset;
      if (kgrams[currentIndex].hash <= kgrams[minIndex].hash) {
        minIndex = currentIndex;
      }
    }

    selected.add(minIndex);
  }

  return [...selected].sort((left, right) => left - right).map((index) => kgrams[index]);
}

function buildStudentLookup(fingerprints) {
  const map = new Map();

  for (const item of fingerprints) {
    const hash = String(item?.hash || '');
    if (!hash) continue;

    const existing = map.get(hash) || [];
    existing.push({
      startIndex: Number(item.startIndex),
      endIndex: Number(item.endIndex),
      phrase: item.phrase || '',
    });
    map.set(hash, existing);
  }

  return map;
}

function resolveSourceTitle(submission, project, fallbackChapter) {
  const projectTitle = project?.title || 'Unknown Project';
  const chapterLabel =
    submission?.chapter ??
    (typeof fallbackChapter === 'string' && fallbackChapter.trim() ? fallbackChapter : null);

  const explicitTitle = submission?.documentTitle || submission?.fileName || null;
  if (explicitTitle) {
    return explicitTitle;
  }

  return chapterLabel ? `${projectTitle} - Chapter ${chapterLabel}` : projectTitle;
}

/**
 * Exclude quoted text and bibliography sections while preserving character offsets.
 * Replaced ranges are padded with spaces so all downstream indices still map to raw text.
 */
export function applyExclusions(text) {
  const raw = String(text || '');
  if (!raw) return '';

  let output = raw;

  output = output.replace(/"[\s\S]*?"/g, (segment) => ' '.repeat(segment.length));

  const bibliographyMatch = /(^|\n)\s*(references|bibliography|works\s+cited)\b/i.exec(output);
  if (bibliographyMatch) {
    const prefixLength = bibliographyMatch[1] ? bibliographyMatch[1].length : 0;
    const cutoffStart = bibliographyMatch.index + prefixLength;
    output = `${output.slice(0, cutoffStart)}${' '.repeat(output.length - cutoffStart)}`;
  }

  return output;
}

/**
 * Build Winnowing fingerprints from input text.
 *
 * Output indices are aligned to the raw text coordinates.
 */
export function generateFingerprints(text, options = {}) {
  const raw = String(text || '');
  if (!raw.trim()) return [];

  const tuning = resolveWinnowTuning(options);

  const excluded = applyExclusions(raw);
  const normalized = excluded.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokenRows = tokenizeWithRanges(normalized);

  if (tokenRows.length < tuning.kGramSize) {
    return [];
  }

  const kgrams = buildKGrams(tokenRows, tuning.kGramSize);
  const fingerprints = winnowKGrams(kgrams, tuning.windowSize);

  return fingerprints.map((item) => ({
    hash: item.hash,
    phrase: item.phrase,
    startIndex: item.startIndex,
    endIndex: item.endIndex,

    // Backward-compatible aliases for existing call sites.
    start: item.startIndex,
    end: item.endIndex,
  }));
}

/**
 * Core deterministic plagiarism calculation using MongoDB inverted index lookups.
 */
export async function calculatePlagiarism(studentText, submissionId) {
  const rawStudentText = String(studentText || '');
  const cleanedStudentText = applyExclusions(rawStudentText);
  const totalDocumentWords = countWords(cleanedStudentText);

  if (totalDocumentWords === 0) {
    return {
      overallScore: 0,
      textMatches: [],
      totalDocumentWords: 0,
      matchedWords: 0,
      submissionFingerprintCount: 0,
    };
  }

  const studentFingerprints = generateFingerprints(rawStudentText);
  if (studentFingerprints.length === 0) {
    return {
      overallScore: 0,
      textMatches: [],
      totalDocumentWords,
      matchedWords: 0,
      submissionFingerprintCount: 0,
    };
  }

  const uniqueHashes = [...new Set(studentFingerprints.map((item) => String(item.hash)))];
  const submissionObjectId = toObjectId(submissionId);

  const candidateQuery = {
    'hashes.hash': { $in: uniqueHashes },
  };

  if (submissionObjectId) {
    candidateQuery.submissionId = { $ne: submissionObjectId };
  }

  const candidates = await Fingerprint.find(candidateQuery)
    .select('submissionId chapter hashes')
    .lean();

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      overallScore: 0,
      textMatches: [],
      totalDocumentWords,
      matchedWords: 0,
      submissionFingerprintCount: studentFingerprints.length,
    };
  }

  const sourceSubmissionIds = candidates
    .map((item) => item?.submissionId)
    .filter((value) => value)
    .map((value) => value.toString());

  const sourceSubmissions = await Submission.find({ _id: { $in: sourceSubmissionIds } })
    .select('_id projectId chapter documentTitle fileName')
    .lean();

  const projectIds = [...new Set(sourceSubmissions.map((item) => item?.projectId).filter(Boolean))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select('_id title')
    .lean();

  const projectMap = new Map(projects.map((item) => [item._id.toString(), item]));
  const submissionMap = new Map(sourceSubmissions.map((item) => [item._id.toString(), item]));

  const studentLookup = buildStudentLookup(studentFingerprints);
  const allMatchedIntervals = [];
  const textMatches = [];

  for (const source of candidates) {
    const sourceId = source?.submissionId?.toString();
    if (!sourceId) continue;

    const sourceHashes = Array.isArray(source?.hashes) ? source.hashes : [];
    const matchedBlocks = [];
    const sourceIntervals = [];
    const seen = new Set();

    for (const sourceHash of sourceHashes) {
      const hash = String(sourceHash?.hash || '');
      if (!hash || !studentLookup.has(hash)) continue;

      const studentOccurrences = studentLookup.get(hash) || [];
      for (const studentOccurrence of studentOccurrences) {
        const studentStart = Number(studentOccurrence.startIndex);
        const studentEnd = Number(studentOccurrence.endIndex);
        const sourceStart = Number(sourceHash?.startIndex);
        const sourceEnd = Number(sourceHash?.endIndex);

        if (
          !Number.isFinite(studentStart) ||
          !Number.isFinite(studentEnd) ||
          studentEnd <= studentStart
        ) {
          continue;
        }

        if (
          !Number.isFinite(sourceStart) ||
          !Number.isFinite(sourceEnd) ||
          sourceEnd <= sourceStart
        ) {
          continue;
        }

        const dedupeKey = `${studentStart}:${studentEnd}:${sourceStart}:${sourceEnd}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        matchedBlocks.push({
          studentStart,
          studentEnd,
          sourceStart,
          sourceEnd,
          matchedText: rawStudentText.slice(studentStart, studentEnd),
        });

        sourceIntervals.push({ start: studentStart, end: studentEnd });
      }
    }

    if (matchedBlocks.length === 0) {
      continue;
    }

    const mergedSourceIntervals = mergeIntervals(sourceIntervals);
    const matchedWordsForSource = countWordsInIntervals(rawStudentText, mergedSourceIntervals);
    const similarityPercentage = clampPercent((matchedWordsForSource / totalDocumentWords) * 100);

    if (similarityPercentage <= 0) {
      continue;
    }

    const sourceSubmission = submissionMap.get(sourceId) || null;
    const sourceProject = sourceSubmission?.projectId
      ? projectMap.get(sourceSubmission.projectId.toString())
      : null;

    textMatches.push({
      sourceId,
      sourceTitle: resolveSourceTitle(sourceSubmission, sourceProject, source?.chapter),
      similarityPercentage: toRounded(similarityPercentage),
      colorCode: COLOR_PALETTE[(textMatches.length || 0) % COLOR_PALETTE.length],
      matchedBlocks,
    });

    allMatchedIntervals.push(...mergedSourceIntervals);
  }

  textMatches.sort((left, right) => right.similarityPercentage - left.similarityPercentage);
  textMatches.forEach((match, index) => {
    match.colorCode = COLOR_PALETTE[index % COLOR_PALETTE.length];
  });

  const matchedWords = countWordsInIntervals(rawStudentText, allMatchedIntervals);
  const overallScore = clampPercent((matchedWords / totalDocumentWords) * 100);

  return {
    overallScore: toRounded(overallScore),
    textMatches,
    totalDocumentWords,
    matchedWords,
    submissionFingerprintCount: studentFingerprints.length,
  };
}

/**
 * Backward-compatible tokenization helper.
 */
export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

/**
 * Backward-compatible Jaccard helper.
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
 * Backward-compatible shingle helper.
 */
export function buildShingles(tokens, n = K_GRAM_SIZE) {
  const normalizedN = Math.max(1, Number(n) || K_GRAM_SIZE);
  const shingles = new Set();

  for (let index = 0; index <= tokens.length - normalizedN; index += 1) {
    shingles.add(tokens.slice(index, index + normalizedN).join(' '));
  }

  return shingles;
}

/**
 * Backward-compatible alias used by existing job/service imports.
 */
export function computeWinnowFingerprints(text, options = {}) {
  const tuning = resolveWinnowTuning(options);
  return generateFingerprints(text, tuning);
}

/**
 * Backward-compatible corpus comparison helper used in proposal similarity checks.
 */
export function compareAgainstCorpus(submittedText, corpus = [], options = {}) {
  const sourceCorpus = Array.isArray(corpus) ? corpus : [];
  const tuning = resolveWinnowTuning(options);
  const submittedFingerprints = Array.isArray(options?.submittedFingerprints)
    ? options.submittedFingerprints
    : generateFingerprints(submittedText, tuning);

  const totalDocumentWords = countWords(applyExclusions(submittedText));
  if (totalDocumentWords === 0 || submittedFingerprints.length === 0) {
    return {
      originalityScore: 100,
      similarityPercentage: 0,
      matchedSources: [],
      submittedFingerprintCount: submittedFingerprints.length,
      totalDocumentWords,
      matchedWords: 0,
    };
  }

  const submittedLookup = buildStudentLookup(submittedFingerprints);
  const submittedHashSet = new Set(submittedFingerprints.map((item) => String(item.hash)));
  const allIntervals = [];
  const matchedSources = [];

  for (const source of sourceCorpus) {
    const sourceFingerprints = Array.isArray(source?.fingerprints)
      ? source.fingerprints
      : generateFingerprints(source?.text || '', tuning);

    if (!Array.isArray(sourceFingerprints) || sourceFingerprints.length === 0) {
      continue;
    }

    const sourceHashes = new Set(sourceFingerprints.map((item) => String(item.hash)));
    const sourceIntervals = [];
    let sharedHashCount = 0;

    for (const hash of sourceHashes) {
      const studentOccurrences = submittedLookup.get(hash) || [];
      if (studentOccurrences.length > 0) {
        sharedHashCount += 1;
      }
      for (const occurrence of studentOccurrences) {
        sourceIntervals.push({
          start: Number(occurrence.startIndex),
          end: Number(occurrence.endIndex),
        });
      }
    }

    const merged = mergeIntervals(sourceIntervals);
    if (merged.length === 0) continue;

    const matchedWordsForSource = countWordsInIntervals(submittedText, merged);
    const wordCoveragePercent = clampPercent((matchedWordsForSource / totalDocumentWords) * 100);
    const submittedHashCoverage =
      submittedHashSet.size > 0 ? (sharedHashCount / submittedHashSet.size) * 100 : 0;
    const sourceHashCoverage =
      sourceHashes.size > 0 ? (sharedHashCount / sourceHashes.size) * 100 : 0;
    const matchPercentage = clampPercent(
      Math.max(wordCoveragePercent, submittedHashCoverage, sourceHashCoverage),
    );

    matchedSources.push({
      submissionId: source?.id || null,
      projectTitle: source?.title || 'Unknown source',
      chapter: source?.chapter ?? null,
      matchPercentage: toRounded(matchPercentage),
      spans: merged,
      sourceSnippet: String(source?.text || '').slice(0, 280),
    });

    allIntervals.push(...merged);
  }

  const matchedWords = countWordsInIntervals(submittedText, allIntervals);
  const similarityPercentage = clampPercent((matchedWords / totalDocumentWords) * 100);
  const originalityScore = clampPercent(100 - similarityPercentage);

  return {
    originalityScore: toRounded(originalityScore),
    similarityPercentage: toRounded(similarityPercentage),
    matchedSources: matchedSources
      .sort((left, right) => right.matchPercentage - left.matchPercentage)
      .slice(0, 10),
    submittedFingerprintCount: submittedFingerprints.length,
    totalDocumentWords,
    matchedWords,
  };
}

/**
 * Deterministic fallback for callers that expect a non-error response.
 */
export function generateMockResult() {
  return {
    originalityScore: 100,
    similarityPercentage: 0,
    matchedSources: [],
    submittedFingerprintCount: 0,
    totalDocumentWords: 0,
    matchedWords: 0,
  };
}

/**
 * Backward-compatible public API used by legacy call sites.
 */
export async function checkOriginality(text, corpus = [], options = {}) {
  if (Array.isArray(corpus) && corpus.length > 0) {
    return compareAgainstCorpus(text, corpus, options);
  }

  if (options?.submissionId) {
    const result = await calculatePlagiarism(text, options.submissionId);
    return {
      originalityScore: toRounded(100 - result.overallScore),
      similarityPercentage: result.overallScore,
      matchedSources: result.textMatches.map((match) => ({
        submissionId: match.sourceId,
        projectTitle: match.sourceTitle,
        chapter: null,
        matchPercentage: match.similarityPercentage,
        spans: (match.matchedBlocks || []).map((block) => ({
          start: block.studentStart,
          end: block.studentEnd,
        })),
        sourceSnippet: (match.matchedBlocks || [])[0]?.matchedText || '',
      })),
      submittedFingerprintCount: result.submissionFingerprintCount,
      totalDocumentWords: result.totalDocumentWords,
      matchedWords: result.matchedWords,
    };
  }

  return generateMockResult();
}

export default {
  K_GRAM_SIZE,
  WINDOW_SIZE,
  applyExclusions,
  generateFingerprints,
  calculatePlagiarism,
  tokenize,
  jaccardSimilarity,
  buildShingles,
  computeWinnowFingerprints,
  compareAgainstCorpus,
  generateMockResult,
  checkOriginality,
};
