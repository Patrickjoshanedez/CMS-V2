/**
 * Plagiarism / Originality Checking Service.
 *
 * Architecture:
 *   1. **Internal engine (always available):** Jaccard token-overlap similarity
 *      comparing the submitted text against all stored texts in the archive.
 *   2. **Fallback mock mode:** When no archive corpus is available, returns a
 *      mock score (70-100%) for development/testing.
 *
 * This service is intentionally native/internal and does not call third-party
 * plagiarism APIs.
 *
 * @module services/plagiarism.service
 */
/* ═══════════════════════════════════════════════════════════════════ */
/*  Tokenization & Similarity Helpers                                */
/* ═══════════════════════════════════════════════════════════════════ */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_EMBED_MODEL = process.env.PLAGIARISM_OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const OLLAMA_GENERATE_MODEL = process.env.PLAGIARISM_OLLAMA_GENERATE_MODEL || 'llama3';
const OLLAMA_TIMEOUT_MS = Number(process.env.PLAGIARISM_OLLAMA_TIMEOUT_MS || 12000);
const ENABLE_OLLAMA_ENRICHMENT =
  String(process.env.PLAGIARISM_OLLAMA_ENABLED || 'false') === 'true';
const MAX_OLLAMA_MATCH_ENRICHMENT = Number(process.env.PLAGIARISM_OLLAMA_MAX_MATCHES || 5);

function sentenceSplit(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 20);
}

function cosineSimilarity(vecA, vecB) {
  if (
    !Array.isArray(vecA) ||
    !Array.isArray(vecB) ||
    vecA.length !== vecB.length ||
    vecA.length === 0
  ) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i += 1) {
    const a = Number(vecA[i]) || 0;
    const b = Number(vecB[i]) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findAllPhraseSpans(text, phrase) {
  if (!text || !phrase) return [];
  const normalizedPhrase = phrase.trim();
  if (normalizedPhrase.length < 12) return [];

  const spans = [];
  let cursor = 0;
  while (cursor < text.length) {
    const foundAt = text.indexOf(normalizedPhrase, cursor);
    if (foundAt < 0) break;
    spans.push({ start: foundAt, end: foundAt + normalizedPhrase.length });
    cursor = foundAt + normalizedPhrase.length;
  }
  return spans;
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

function collectExactOverlapPhrases(submittedText, sourceText) {
  const submittedSentences = sentenceSplit(submittedText);
  const sourceSentences = sentenceSplit(sourceText);
  if (submittedSentences.length === 0 || sourceSentences.length === 0) return [];

  const candidates = [];

  for (const submittedSentence of submittedSentences) {
    const submittedTokens = new Set(tokenize(submittedSentence));
    if (submittedTokens.size < 6) continue;

    for (const sourceSentence of sourceSentences) {
      const sourceTokens = new Set(tokenize(sourceSentence));
      if (sourceTokens.size < 6) continue;

      const score = jaccardSimilarity(submittedTokens, sourceTokens);
      if (score >= 0.7) {
        candidates.push(submittedSentence);
        break;
      }
    }
  }

  return [...new Set(candidates)].slice(0, 6);
}

function parseJsonArrayResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const trimmed = rawText.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start >= 0 && end > start) {
      try {
        const recovered = JSON.parse(trimmed.slice(start, end + 1));
        return Array.isArray(recovered) ? recovered : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

async function postToOllama(endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_HOST}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

async function getEmbeddingVector(text) {
  const normalized = typeof text === 'string' ? text.trim() : '';
  if (!normalized) return null;

  const data = await postToOllama('/api/embeddings', {
    model: OLLAMA_EMBED_MODEL,
    prompt: normalized,
  });

  return Array.isArray(data?.embedding) ? data.embedding : null;
}

function buildHighlightPrompt(submittedTextChunk, archivedTextChunk) {
  return [
    'Compare the following two texts.',
    '',
    `[Submitted Text]: "${submittedTextChunk}"`,
    `[Archived Text]: "${archivedTextChunk}"`,
    '',
    'Return a JSON array containing the exact strings from the [Submitted Text] that appear to be copied or heavily paraphrased from the [Archived Text].',
    '',
    'Expected JSON format:',
    '[',
    '{',
    '"copied_phrase": "the exact text string from the submitted text",',
    '"similarity_type": "exact_match" or "paraphrased"',
    '}',
    ']',
  ].join('\n');
}

async function extractCopiedPhrasesWithOllama(submittedText, sourceText) {
  const submittedTextChunk = (submittedText || '').slice(0, 2200);
  const archivedTextChunk = (sourceText || '').slice(0, 2200);
  if (!submittedTextChunk || !archivedTextChunk) return [];

  const systemPrompt =
    'You are an academic plagiarism detection engine. Your task is to compare two pieces of text: a "Submitted Text" and an "Archived Text". Identify the exact overlapping phrases, sentences, or heavily paraphrased sections. You must respond ONLY with a valid JSON array of objects. Do not include markdown formatting or any conversational text.';

  const response = await postToOllama('/api/generate', {
    model: OLLAMA_GENERATE_MODEL,
    format: 'json',
    stream: false,
    system: systemPrompt,
    prompt: buildHighlightPrompt(submittedTextChunk, archivedTextChunk),
    options: {
      temperature: 0,
    },
  });

  const rows = parseJsonArrayResponse(response?.response || '[]');
  return rows
    .map((item) => ({
      copied_phrase: typeof item?.copied_phrase === 'string' ? item.copied_phrase.trim() : '',
      similarity_type: item?.similarity_type === 'paraphrased' ? 'paraphrased' : 'exact_match',
    }))
    .filter((item) => item.copied_phrase.length >= 12)
    .slice(0, 8);
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

async function enrichMatchesWithOllama(submittedText, corpus, baseResult) {
  if (!ENABLE_OLLAMA_ENRICHMENT) {
    return baseResult;
  }

  const corpusMap = new Map((Array.isArray(corpus) ? corpus : []).map((doc) => [doc.id, doc]));
  const submittedEmbedding = await getEmbeddingVector(submittedText);

  const enrichedMatches = await Promise.all(
    (baseResult.matchedSources || []).map(async (match, index) => {
      if (index >= MAX_OLLAMA_MATCH_ENRICHMENT) {
        return { ...match, spans: [], sourceSnippet: match.sourceSnippet || '' };
      }

      const sourceDoc = corpusMap.get(match.submissionId);
      const sourceText = sourceDoc?.text || '';
      if (!sourceText) {
        return { ...match, spans: [], sourceSnippet: match.sourceSnippet || '' };
      }

      const exactPhrases = collectExactOverlapPhrases(submittedText, sourceText);

      let aiPhrases = [];
      try {
        aiPhrases = await extractCopiedPhrasesWithOllama(submittedText, sourceText);
      } catch (error) {
        console.warn(`[Plagiarism] Ollama phrase extraction failed: ${error.message}`);
      }

      const phrasePool = [
        ...new Set([...exactPhrases, ...aiPhrases.map((item) => item.copied_phrase)]),
      ];
      const spans = mergeOverlappingSpans(
        phrasePool.flatMap((phrase) => findAllPhraseSpans(submittedText, phrase)),
      );

      const sourceEmbedding = await getEmbeddingVector(sourceText);
      const semanticScore = cosineSimilarity(submittedEmbedding, sourceEmbedding);
      const firstPhrase = phrasePool[0] || '';

      return {
        ...match,
        spans,
        sourceSnippet: deriveSourceSnippet(sourceText, firstPhrase),
        semanticScore: Number.isFinite(semanticScore) ? semanticScore : null,
        winnowScore:
          Number.isFinite(match.matchPercentage) && match.matchPercentage !== null
            ? Math.max(0, Math.min(1, match.matchPercentage / 100))
            : null,
      };
    }),
  );

  return {
    ...baseResult,
    matchedSources: enrichedMatches,
  };
}

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
      const exactPhrases = collectExactOverlapPhrases(submittedText, doc.text);
      const spans = mergeOverlappingSpans(
        exactPhrases.flatMap((phrase) => findAllPhraseSpans(submittedText, phrase)),
      );
      const firstSpan = spans[0] || null;

      // Only report matches above 5% to reduce noise
      matchedSources.push({
        submissionId: doc.id,
        projectTitle: doc.title || 'Unknown Project',
        chapter: doc.chapter || 0,
        matchPercentage,
        spans,
        start_index: firstSpan?.start ?? null,
        end_index: firstSpan?.end ?? null,
        sourceSnippet: deriveSourceSnippet(doc.text, exactPhrases[0] || ''),
        winnowScore: similarity,
        semanticScore: null,
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
/*  Main Service API                                                 */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Run an originality check on the given text.
 *
 * Strategy:
 *   1. If corpus is provided → use internal Jaccard engine
 *   2. Otherwise → return mock result (dev mode)
 *
 * @param {string} text - Extracted plain text from the submission
 * @param {Array} corpus - Array of existing documents to compare against
 * @returns {Promise<{ originalityScore: number, matchedSources: Array }>}
 */
export async function checkOriginality(text, corpus = []) {
  // Strategy 1: Internal comparison engine
  if (corpus.length > 0) {
    const baseResult = compareAgainstCorpus(text, corpus);
    return enrichMatchesWithOllama(text, corpus, baseResult);
  }

  // Strategy 2: Mock result (no corpus)
  console.warn('[Plagiarism] No corpus available — returning mock score.');
  return generateMockResult();
}

export default {
  tokenize,
  jaccardSimilarity,
  buildShingles,
  compareAgainstCorpus,
  generateMockResult,
  checkOriginality,
};
