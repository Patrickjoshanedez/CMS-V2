import { PROJECT_STATUSES, SUBMISSION_STATUSES } from '@cms/shared';
import env from '../config/env.js';
import Submission from '../modules/submissions/submission.model.js';
import storageService from './storage.index.js';
import { extractText } from '../utils/extractText.js';
import AppError from '../utils/AppError.js';
import { compareAgainstCorpus } from './plagiarism.service.js';

const DEFAULT_EMBED_MODEL =
  process.env.PLAGIARISM_OLLAMA_EMBED_MODEL || 'nomic-embed-text-v2-moe:latest';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const ARCHIVE_SCAN_MAX_DOCS = Math.max(
  5,
  Number.parseInt(process.env.PLAGIARISM_ARCHIVE_SCAN_MAX_DOCS || '40', 10) || 40,
);
const ARCHIVE_SCAN_MAX_LAZY_EXTRACTIONS = Math.max(
  0,
  Number.parseInt(process.env.PLAGIARISM_ARCHIVE_SCAN_MAX_LAZY_EXTRACTIONS || '10', 10) || 10,
);
const ARCHIVE_SCAN_MIN_TEXT_LENGTH = Math.max(
  50,
  Number.parseInt(process.env.PLAGIARISM_ARCHIVE_SCAN_MIN_TEXT_LENGTH || '120', 10) || 120,
);
const ARCHIVE_SCAN_EMBED_MAX_CHARS = Math.max(
  1500,
  Number.parseInt(process.env.PLAGIARISM_ARCHIVE_SCAN_EMBED_MAX_CHARS || '12000', 10) || 12000,
);
const ARCHIVE_SCAN_SEMANTIC_THRESHOLD = Math.max(
  0,
  Math.min(
    1,
    Number.parseFloat(process.env.PLAGIARISM_ARCHIVE_SCAN_SEMANTIC_THRESHOLD || '0.58') || 0.58,
  ),
);
const QUERY_CHUNK_WORDS = Math.max(
  40,
  Number.parseInt(process.env.PLAGIARISM_ARCHIVE_SCAN_QUERY_CHUNK_WORDS || '110', 10) || 110,
);
const QUERY_CHUNK_STRIDE = Math.max(
  20,
  Number.parseInt(process.env.PLAGIARISM_ARCHIVE_SCAN_QUERY_CHUNK_STRIDE || '70', 10) || 70,
);
const QUERY_CHUNK_LIMIT = Math.max(
  6,
  Number.parseInt(process.env.PLAGIARISM_ARCHIVE_SCAN_QUERY_CHUNK_LIMIT || '24', 10) || 24,
);
const FINAL_SOURCE_LIMIT = 10;

const clampPercent = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

const toRounded = (value, digits = 2) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const normalizeWhitespace = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const truncateForEmbedding = (text, maxChars = ARCHIVE_SCAN_EMBED_MAX_CHARS) => {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxChars) {
    return normalized;
  }

  const headSize = Math.max(200, Math.floor(maxChars / 2) - 20);
  const tailSize = Math.max(200, maxChars - headSize - 20);

  return `${normalized.slice(0, headSize)}\n...\n${normalized.slice(-tailSize)}`;
};

const normalizeVector = (vector) => {
  if (!Array.isArray(vector) || vector.length === 0) {
    return null;
  }

  const values = vector.map((item) => Number(item)).filter((item) => Number.isFinite(item));

  if (values.length === 0) {
    return null;
  }

  let normSquared = 0;
  for (const value of values) {
    normSquared += value * value;
  }

  const norm = Math.sqrt(normSquared);
  if (!Number.isFinite(norm) || norm <= 0) {
    return null;
  }

  return values.map((value) => value / norm);
};

const cosineSimilarity = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    return 0;
  }

  const size = Math.min(left.length, right.length);
  if (size <= 0) {
    return 0;
  }

  let dot = 0;
  for (let index = 0; index < size; index += 1) {
    dot += left[index] * right[index];
  }

  if (!Number.isFinite(dot)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, dot));
};

const splitTextIntoOffsetChunks = (
  text,
  {
    wordsPerChunk = QUERY_CHUNK_WORDS,
    stride = QUERY_CHUNK_STRIDE,
    maxChunks = QUERY_CHUNK_LIMIT,
  } = {},
) => {
  const normalizedText = String(text || '');
  if (!normalizedText.trim()) {
    return [];
  }

  const tokens = [];
  const regex = /[a-zA-Z0-9]+/g;
  let match = regex.exec(normalizedText);

  while (match) {
    tokens.push({ start: match.index, end: match.index + match[0].length });
    match = regex.exec(normalizedText);
  }

  if (tokens.length === 0) {
    return [
      {
        start: 0,
        end: normalizedText.length,
        text: normalizedText,
      },
    ];
  }

  const chunks = [];
  const safeWordsPerChunk = Math.max(10, Number(wordsPerChunk) || QUERY_CHUNK_WORDS);
  const safeStride = Math.max(5, Number(stride) || QUERY_CHUNK_STRIDE);

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += safeStride) {
    if (chunks.length >= maxChunks) {
      break;
    }

    const endTokenIndex = Math.min(tokenIndex + safeWordsPerChunk, tokens.length);
    const chunkStart = tokens[tokenIndex]?.start ?? 0;
    const chunkEnd = tokens[endTokenIndex - 1]?.end ?? normalizedText.length;

    if (!Number.isFinite(chunkStart) || !Number.isFinite(chunkEnd) || chunkEnd <= chunkStart) {
      continue;
    }

    const chunkText = normalizedText.slice(chunkStart, chunkEnd).trim();
    if (!chunkText) {
      continue;
    }

    chunks.push({
      start: chunkStart,
      end: chunkEnd,
      text: chunkText,
    });

    if (endTokenIndex >= tokens.length) {
      break;
    }
  }

  if (chunks.length === 0) {
    return [
      {
        start: 0,
        end: normalizedText.length,
        text: normalizedText,
      },
    ];
  }

  return chunks;
};

const mergeIntervals = (intervals = []) => {
  const normalized = intervals
    .map((interval) => ({
      start: Number(interval?.start),
      end: Number(interval?.end),
    }))
    .filter((interval) => Number.isFinite(interval.start) && Number.isFinite(interval.end))
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  if (normalized.length === 0) {
    return [];
  }

  const merged = [{ ...normalized[0] }];

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
};

const createOllamaClient = async () => {
  const ollamaModule = await import('ollama');

  const OllamaClient = ollamaModule?.Ollama || ollamaModule?.default?.Ollama;
  if (typeof OllamaClient === 'function') {
    return new OllamaClient({ host: OLLAMA_HOST });
  }

  const fallback = ollamaModule?.default;
  if (
    fallback &&
    (typeof fallback.embed === 'function' || typeof fallback.embeddings === 'function')
  ) {
    return fallback;
  }

  throw new Error('Ollama embedding client is unavailable in this environment.');
};

const embedTextsWithOllama = async ({ client, model, texts }) => {
  const inputs = (Array.isArray(texts) ? texts : [])
    .map((text) => truncateForEmbedding(text))
    .filter((text) => text.length > 0);

  if (inputs.length === 0) {
    return [];
  }

  if (typeof client.embed === 'function') {
    const response = await client.embed({ model, input: inputs });
    const rawEmbeddings = Array.isArray(response?.embeddings)
      ? response.embeddings
      : Array.isArray(response?.embedding)
        ? [response.embedding]
        : [];

    const normalized = rawEmbeddings.map((embedding) => normalizeVector(embedding)).filter(Boolean);

    if (normalized.length === inputs.length) {
      return normalized;
    }

    throw new Error('Ollama returned an unexpected embedding payload shape.');
  }

  if (typeof client.embeddings === 'function') {
    const rows = [];

    for (const input of inputs) {
      let response;
      try {
        response = await client.embeddings({ model, prompt: input });
      } catch {
        response = await client.embeddings({ model, input });
      }

      const rawEmbedding = Array.isArray(response?.embedding)
        ? response.embedding
        : Array.isArray(response?.embeddings)
          ? response.embeddings[0]
          : null;

      const normalized = normalizeVector(rawEmbedding);
      if (!normalized) {
        throw new Error('Ollama returned an invalid embedding vector.');
      }

      rows.push(normalized);
    }

    return rows;
  }

  throw new Error('Ollama embedding API is unavailable in this environment.');
};

const fetchArchivedSubmissionCandidates = async () => {
  const acceptedStatuses = [
    SUBMISSION_STATUSES.APPROVED,
    SUBMISSION_STATUSES.ACCEPTED,
    SUBMISSION_STATUSES.LOCKED,
  ];

  const rows = await Submission.aggregate([
    {
      $match: {
        fileType: 'application/pdf',
        status: { $in: acceptedStatuses },
        $or: [
          { extractedText: { $exists: true, $nin: [null, ''] } },
          { storageKey: { $exists: true, $nin: [null, ''] } },
        ],
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: '$project' },
    {
      $match: {
        $or: [
          { 'project.isArchived': true },
          { 'project.projectStatus': PROJECT_STATUSES.ARCHIVED },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        projectId: 1,
        chapter: 1,
        type: 1,
        extractedText: 1,
        storageKey: 1,
        fileType: 1,
        fileName: 1,
        updatedAt: 1,
        projectTitle: '$project.title',
        archivedAt: '$project.archivedAt',
      },
    },
    {
      $sort: {
        archivedAt: -1,
        updatedAt: -1,
      },
    },
    {
      $limit: ARCHIVE_SCAN_MAX_DOCS * 4,
    },
  ]);

  return Array.isArray(rows) ? rows : [];
};

const buildArchivedCorpus = async () => {
  const candidates = await fetchArchivedSubmissionCandidates();
  const corpus = [];
  let lazyExtractions = 0;

  for (const candidate of candidates) {
    if (corpus.length >= ARCHIVE_SCAN_MAX_DOCS) {
      break;
    }

    let sourceText = normalizeWhitespace(candidate?.extractedText || '');

    if (
      !sourceText &&
      candidate?.storageKey &&
      lazyExtractions < ARCHIVE_SCAN_MAX_LAZY_EXTRACTIONS
    ) {
      try {
        const fileBuffer = await storageService.downloadFile(candidate.storageKey);
        const extracted = await extractText(fileBuffer, candidate.fileType || 'application/pdf');
        sourceText = normalizeWhitespace(extracted || '');

        if (sourceText) {
          await Submission.updateOne(
            { _id: candidate._id },
            { $set: { extractedText: sourceText } },
          );
        }

        lazyExtractions += 1;
      } catch {
        // Ignore extraction failures and continue with other candidates.
      }
    }

    if (!sourceText || sourceText.length < ARCHIVE_SCAN_MIN_TEXT_LENGTH) {
      continue;
    }

    corpus.push({
      id: String(candidate._id),
      submissionId: String(candidate._id),
      projectId: String(candidate.projectId),
      title: candidate.projectTitle || candidate.fileName || 'Archived Capstone',
      chapter: candidate.chapter ?? null,
      type: candidate.type || null,
      text: sourceText,
    });
  }

  return corpus;
};

const mapMatchedSpansToBlocks = ({ spans = [], text = '', sourceSnippet = '' }) =>
  (Array.isArray(spans) ? spans : [])
    .map((span) => ({
      start: Number(span?.start),
      end: Number(span?.end),
    }))
    .filter(
      (span) => Number.isFinite(span.start) && Number.isFinite(span.end) && span.end > span.start,
    )
    .map((span) => ({
      studentStart: span.start,
      studentEnd: span.end,
      sourceStart: null,
      sourceEnd: null,
      matchedText: String(text || '').slice(span.start, span.end),
      sourceText: sourceSnippet,
    }));

const scoreSemanticCandidates = async ({ submittedText, corpus, embeddingModel }) => {
  const semanticBySource = new Map();

  const client = await createOllamaClient();
  const corpusInputs = corpus.map((source) => source.text);
  const documentEmbeddings = await embedTextsWithOllama({
    client,
    model: embeddingModel,
    texts: [submittedText, ...corpusInputs],
  });

  if (documentEmbeddings.length !== corpus.length + 1) {
    throw new Error('Semantic embedding batch returned an unexpected number of vectors.');
  }

  const queryEmbedding = documentEmbeddings[0];
  const sourceEmbeddings = documentEmbeddings.slice(1);

  const queryChunks = splitTextIntoOffsetChunks(submittedText);
  const queryChunkEmbeddings = await embedTextsWithOllama({
    client,
    model: embeddingModel,
    texts: queryChunks.map((chunk) => chunk.text),
  });

  for (let index = 0; index < corpus.length; index += 1) {
    const source = corpus[index];
    const sourceEmbedding = sourceEmbeddings[index];
    const documentSimilarity = cosineSimilarity(queryEmbedding, sourceEmbedding);

    let bestChunk = null;
    let bestChunkSimilarity = -1;

    for (let chunkIndex = 0; chunkIndex < queryChunks.length; chunkIndex += 1) {
      const similarity = cosineSimilarity(queryChunkEmbeddings[chunkIndex], sourceEmbedding);
      if (similarity > bestChunkSimilarity) {
        bestChunkSimilarity = similarity;
        bestChunk = queryChunks[chunkIndex];
      }
    }

    semanticBySource.set(source.id, {
      semanticScore: Math.max(documentSimilarity, bestChunkSimilarity),
      documentSimilarity,
      bestChunkSimilarity,
      bestChunk,
    });
  }

  return semanticBySource;
};

const buildCombinedMatches = ({ submittedText, lexicalResult, corpus, semanticBySource }) => {
  const lexicalBySource = new Map();

  for (const source of lexicalResult?.matchedSources || []) {
    const key = String(source?.submissionId || '');
    if (!key) continue;
    lexicalBySource.set(key, source);
  }

  const combined = [];

  for (const source of corpus) {
    const lexicalSource = lexicalBySource.get(source.id) || null;
    const semantic = semanticBySource.get(source.id) || null;

    const lexicalScore = clampPercent(Number(lexicalSource?.matchPercentage || 0));
    const semanticScore = clampPercent(Number((semantic?.semanticScore || 0) * 100));

    const includeByLexical = lexicalScore > 0;
    const includeBySemantic = semanticScore >= ARCHIVE_SCAN_SEMANTIC_THRESHOLD * 100;

    if (!includeByLexical && !includeBySemantic) {
      continue;
    }

    const sourceSnippet =
      normalizeWhitespace(lexicalSource?.sourceSnippet || '') || source.text.slice(0, 400);

    let matchedBlocks = mapMatchedSpansToBlocks({
      spans: lexicalSource?.spans || [],
      text: submittedText,
      sourceSnippet,
    });

    if (matchedBlocks.length === 0 && semantic?.bestChunk) {
      const fallbackStart = Number(semantic.bestChunk.start);
      const fallbackEnd = Number(semantic.bestChunk.end);
      if (
        Number.isFinite(fallbackStart) &&
        Number.isFinite(fallbackEnd) &&
        fallbackEnd > fallbackStart
      ) {
        matchedBlocks = [
          {
            studentStart: fallbackStart,
            studentEnd: fallbackEnd,
            sourceStart: null,
            sourceEnd: null,
            matchedText: submittedText.slice(fallbackStart, fallbackEnd),
            sourceText: sourceSnippet,
          },
        ];
      }
    }

    if (matchedBlocks.length === 0) {
      continue;
    }

    let combinedScore = lexicalScore;
    if (lexicalScore > 0 && semanticScore > 0) {
      combinedScore = clampPercent(lexicalScore * 0.75 + semanticScore * 0.25);
    } else if (lexicalScore <= 0) {
      combinedScore = clampPercent(semanticScore * 0.6);
    }

    combined.push({
      sourceId: source.id,
      sourceTitle: source.title,
      projectId: source.projectId,
      chapter: source.chapter,
      type: source.type,
      similarityPercentage: toRounded(combinedScore),
      lexicalScore: toRounded(lexicalScore),
      semanticScore: toRounded(semanticScore),
      sourceSnippet,
      matchedBlocks,
    });
  }

  return combined
    .sort((left, right) => right.similarityPercentage - left.similarityPercentage)
    .slice(0, FINAL_SOURCE_LIMIT)
    .map((match, index) => ({
      ...match,
      sourceNumber: index + 1,
    }));
};

export async function runArchivePdfPlagiarismScan({ fileBuffer, fileType, fileName }) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new AppError('No PDF file data was received for scanning.', 400, 'NO_FILE');
  }

  const extractedText = normalizeWhitespace(await extractText(fileBuffer, fileType));
  if (!extractedText || extractedText.length < ARCHIVE_SCAN_MIN_TEXT_LENGTH) {
    throw new AppError(
      `Uploaded PDF does not contain enough extractable text for scanning (minimum ${ARCHIVE_SCAN_MIN_TEXT_LENGTH} characters).`,
      400,
      'INSUFFICIENT_EXTRACTED_TEXT',
    );
  }

  const corpus = await buildArchivedCorpus();
  if (corpus.length === 0) {
    const processedAt = new Date().toISOString();
    return {
      status: 'completed',
      submissionFileName: fileName || null,
      originalityScore: 100,
      overallScore: 0,
      warningFlag: false,
      extractedText,
      textMatches: [],
      matchedSources: [],
      fullReport: {
        mode: 'archive_pdf_scan',
        embeddingModel: DEFAULT_EMBED_MODEL,
        semanticEnabled: false,
        archiveCandidates: 0,
        matches: [],
        textMatches: [],
        overallScore: 0,
        originality_score: 100,
        plagiarism_score: 0,
      },
      processedAt,
    };
  }

  const lexicalResult = compareAgainstCorpus(extractedText, corpus);

  let semanticBySource = new Map();
  let semanticEnabled = false;
  let semanticError = null;

  try {
    semanticBySource = await scoreSemanticCandidates({
      submittedText: extractedText,
      corpus,
      embeddingModel: DEFAULT_EMBED_MODEL,
    });
    semanticEnabled = true;
  } catch (error) {
    semanticEnabled = false;
    semanticError = error?.message || 'Semantic embedding check failed.';
  }

  const combinedMatches = buildCombinedMatches({
    submittedText: extractedText,
    lexicalResult,
    corpus,
    semanticBySource,
  });

  const mergedIntervals = mergeIntervals(
    combinedMatches.flatMap((match) =>
      match.matchedBlocks.map((block) => ({
        start: block.studentStart,
        end: block.studentEnd,
      })),
    ),
  );

  const matchedCharacters = mergedIntervals.reduce(
    (sum, interval) => sum + (interval.end - interval.start),
    0,
  );

  const overallScore = clampPercent((matchedCharacters / extractedText.length) * 100);
  const originalityScore = clampPercent(100 - overallScore);
  const processedAt = new Date().toISOString();
  const warningThreshold = Number(env.PLAGIARISM_WARNING_THRESHOLD || 30);

  const matchedSources = combinedMatches.map((match) => ({
    submissionId: match.sourceId,
    projectTitle: match.sourceTitle,
    chapter: match.chapter,
    matchPercentage: match.similarityPercentage,
    spans: match.matchedBlocks.map((block) => ({
      start: block.studentStart,
      end: block.studentEnd,
    })),
    sourceSnippet: match.sourceSnippet,
    winnowScore: match.lexicalScore > 0 ? toRounded(match.lexicalScore / 100, 4) : null,
    semanticScore: match.semanticScore > 0 ? toRounded(match.semanticScore / 100, 4) : null,
  }));

  const textMatches = combinedMatches.map((match, index) => ({
    sourceId: match.sourceId,
    sourceTitle: match.sourceTitle,
    similarityPercentage: match.similarityPercentage,
    colorCode: null,
    matchedBlocks: match.matchedBlocks,
    match_id: `archive-match-${index + 1}-${match.sourceId}`,
    source_number: match.sourceNumber,
    source_key: match.sourceId,
    similarity_score: toRounded(match.similarityPercentage / 100, 6),
    source_metadata: {
      document_id: match.sourceId,
      project_id: match.projectId,
      chapter: match.chapter,
      type: match.type,
      title: match.sourceTitle,
      lexical_score: match.lexicalScore,
      semantic_score: match.semanticScore,
    },
    source_snippet: match.sourceSnippet,
    start_index: match.matchedBlocks[0]?.studentStart ?? null,
    end_index: match.matchedBlocks[0]?.studentEnd ?? null,
  }));

  const fullReport = {
    mode: 'archive_pdf_scan',
    embeddingModel: DEFAULT_EMBED_MODEL,
    semanticEnabled,
    semanticError,
    archiveCandidates: corpus.length,
    total_characters: extractedText.length,
    matched_characters: matchedCharacters,
    overallScore: toRounded(overallScore),
    originality_score: toRounded(originalityScore),
    plagiarism_score: toRounded(overallScore),
    textMatches,
    matches: textMatches,
  };

  return {
    status: 'completed',
    submissionFileName: fileName || null,
    originalityScore: toRounded(originalityScore),
    overallScore: toRounded(overallScore),
    warningFlag: overallScore >= warningThreshold,
    extractedText,
    textMatches,
    matchedSources,
    fullReport,
    processedAt,
  };
}

export default {
  runArchivePdfPlagiarismScan,
};
