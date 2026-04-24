/**
 * PDF Metadata Extractor Utility
 *
 * Extracts title and abstract from academic papers using pattern matching.
 * Works best with standard academic paper formats.
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import pino from 'pino';
import env from '../config/env.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// GLM prompt — minimal and direct to prevent hallucination in small models
const GLM_METADATA_PROMPT = [
  'You are a metadata extractor. Given academic paper text, output JSON only.',
  'JSON format: {"title":"","authors":[],"abstract":"","keywords":[],"doi":"","venue":"","publicationYear":null}',
  'title = paper title only, no authors or addresses.',
  'authors = human names only, no institutions.',
  'Paper text:',
].join('\n');

const extractionCache = new Map();
const doiMetadataCache = new Map();
const EXTRACTION_CACHE_TTL_MS = Number.isFinite(env.PDF_METADATA_CACHE_TTL_MS)
  ? env.PDF_METADATA_CACHE_TTL_MS
  : 10 * 60 * 1000;
const EXTRACTION_CACHE_MAX_ENTRIES = 100;
const DOI_CACHE_TTL_MS = 60 * 60 * 1000;
const GLM_PROMPT_MAX_CHARS = Math.min(12000, Math.max(2000, env.PDF_METADATA_GLM_PROMPT_MAX_CHARS));
const MIN_TITLE_CONFIDENCE = env.PDF_METADATA_MIN_TITLE_CONFIDENCE;
const MIN_ABSTRACT_CONFIDENCE = env.PDF_METADATA_MIN_ABSTRACT_CONFIDENCE;
const MIN_AUTHORS_CONFIDENCE = env.PDF_METADATA_MIN_AUTHORS_CONFIDENCE;
const PROCEEDINGS_NOISE_PATTERNS = [
  /\bproceedings of\b/i,
  /\bassociation for computational linguistics\b/i,
  /\bacm\b/i,
  /\bieee\b/i,
  /\bspringer\b/i,
  /\belsevier\b/i,
  /\bjournal of\b/i,
];

function computeBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function buildExtractionCacheKey(bufferHash) {
  const strategy = String(env.PDF_METADATA_GLM_STRATEGY || 'fallback').toLowerCase();
  const model = String(env.PDF_METADATA_GLM_MODEL || 'glm-ocr:latest').toLowerCase();
  const preprocess = String(process.env.PDF_METADATA_ENABLE_PLAGIARISM_PREPROCESS || 'true')
    .trim()
    .toLowerCase();
  return `v2:${bufferHash}:${strategy}:${model}:${preprocess}`;
}

function getCachedExtraction(cacheKey) {
  const hit = extractionCache.get(cacheKey);
  if (!hit) return null;

  if (Date.now() >= hit.expiresAt) {
    extractionCache.delete(cacheKey);
    return null;
  }

  return hit.value;
}

function setCachedExtraction(cacheKey, value) {
  if (!cacheKey || !value) return;

  if (extractionCache.size >= EXTRACTION_CACHE_MAX_ENTRIES) {
    const oldestKey = extractionCache.keys().next().value;
    if (oldestKey) extractionCache.delete(oldestKey);
  }

  extractionCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + EXTRACTION_CACHE_TTL_MS,
  });
}

function getCachedDoiMetadata(doi) {
  const key = normalizeDoi(doi);
  if (!key) return null;
  const hit = doiMetadataCache.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    doiMetadataCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedDoiMetadata(doi, value) {
  const key = normalizeDoi(doi);
  if (!key || !value) return;
  doiMetadataCache.set(key, {
    value,
    expiresAt: Date.now() + DOI_CACHE_TTL_MS,
  });
}

function shouldUseGlmFallback(baseResult) {
  const strategy = String(env.PDF_METADATA_GLM_STRATEGY || 'fallback').toLowerCase();
  if (strategy === 'always') return true;

  const hasStrongTitle =
    baseResult.title &&
    baseResult.title.length >= 30 &&
    Number(baseResult.confidence?.title || 0) >= MIN_TITLE_CONFIDENCE;

  const hasStrongAbstract =
    baseResult.abstract &&
    baseResult.abstract.length >= 220 &&
    Number(baseResult.confidence?.abstract || 0) >= MIN_ABSTRACT_CONFIDENCE;

  const hasAuthors =
    Array.isArray(baseResult.authors) &&
    baseResult.authors.length > 0 &&
    Number(baseResult.confidence?.authors || 0) >= MIN_AUTHORS_CONFIDENCE;

  return !(hasStrongTitle && hasStrongAbstract && hasAuthors);
}

async function buildGlmInputText(pdfText) {
  // Keep prompt bounded to prevent model instability on very long contexts.
  const fallback = cleanText(String(pdfText || '')).slice(0, GLM_PROMPT_MAX_CHARS);
  if (!fallback) return '';

  const shouldUsePlagiarismPreprocess =
    String(process.env.PDF_METADATA_ENABLE_PLAGIARISM_PREPROCESS || 'true')
      .trim()
      .toLowerCase() === 'true';

  if (!shouldUsePlagiarismPreprocess) {
    return fallback;
  }

  const engineBaseUrl = (process.env.PLAGIARISM_ENGINE_URL || 'http://localhost:8001').replace(
    /\/+$/,
    '',
  );
  const maxChars = Math.min(
    20000,
    Math.max(
      2000,
      Number.parseInt(process.env.PDF_METADATA_PREPROCESS_MAX_CHARS || '9000', 10) || 9000,
    ),
  );
  const timeoutMs = Math.min(
    10000,
    Math.max(
      1000,
      Number.parseInt(process.env.PDF_METADATA_PREPROCESS_TIMEOUT_MS || '4000', 10) || 4000,
    ),
  );

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${engineBaseUrl}/preprocess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: pdfText,
        max_chars: maxChars,
        max_segments: 12,
        min_words: 10,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const compressedText = cleanText(String(payload?.compressed_text || '')).slice(
      0,
      GLM_PROMPT_MAX_CHARS,
    );
    if (!compressedText) {
      return fallback;
    }

    return compressedText;
  } catch (error) {
    logger.debug(
      { err: error?.message },
      'Plagiarism preprocess unavailable; using local normalized text',
    );
    return fallback;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function parsePdf(pdfBuffer) {
  const pdfModule = await import('pdf-parse');

  if (typeof pdfModule.default === 'function') {
    return pdfModule.default(pdfBuffer);
  }

  if (typeof pdfModule.PDFParse === 'function') {
    const parser = new pdfModule.PDFParse({ data: pdfBuffer });
    try {
      const parsed = await parser.getText();
      return {
        text: parsed?.text || '',
        numpages: parsed?.numpages,
        info: parsed?.info,
      };
    } finally {
      await parser.destroy();
    }
  }

  throw new Error('Unsupported pdf-parse module shape');
}

function safeParseJson(raw) {
  if (!raw || typeof raw !== 'string') return null;

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeDoi(rawDoi) {
  if (!rawDoi) return '';
  const cleaned = cleanText(String(rawDoi))
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  const match = cleaned.match(/\b10\.\d{4,}(?:\.\d+)*\/[^\s,;]+/i);
  return match ? match[0].replace(/[.)>]+$/, '') : '';
}

function normalizeKeywordValue(keyword) {
  return cleanText(String(keyword || ''))
    .replace(/^(keywords?|index terms?)[:\s-]*/i, '')
    .replace(/[.;,]+$/g, '')
    .trim();
}

function normalizeKeywordsArray(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => normalizeKeywordValue(value))
        .filter((value) => value.length >= 2 && value.length <= 64),
    ),
  ).slice(0, 12);
}

function normalizeVenue(rawVenue) {
  const value = cleanText(String(rawVenue || '')).slice(0, 300);
  if (!value) return '';
  if (value.length < 6) return '';
  return value;
}

function parseCslAuthor(author) {
  if (!author || typeof author !== 'object') return '';
  const literal = cleanText(String(author.literal || ''));
  if (literal) return literal;
  const given = cleanText(String(author.given || ''));
  const family = cleanText(String(author.family || ''));
  return cleanText(`${given} ${family}`);
}

function parseCslKeywords(rawKeyword) {
  if (Array.isArray(rawKeyword)) {
    return normalizeKeywordsArray(rawKeyword);
  }
  const keyword = cleanText(String(rawKeyword || ''));
  if (!keyword) return [];
  return normalizeKeywordsArray(keyword.split(/[,;|]/));
}

function parseCslYear(issued) {
  const year = issued?.['date-parts']?.[0]?.[0];
  const parsed = Number(year);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 1900 || parsed > new Date().getFullYear() + 1) return null;
  return parsed;
}

function stripHtmlTags(value) {
  return cleanText(String(value || '').replace(/<[^>]+>/g, ' '));
}

async function fetchMetadataByDoi(doi) {
  if (!env.PDF_METADATA_ENABLE_DOI_ENRICHMENT) return null;
  const normalizedDoi = normalizeDoi(doi);
  if (!normalizedDoi) return null;

  const cached = getCachedDoiMetadata(normalizedDoi);
  if (cached) return cached;

  const timeoutMs = Math.min(10000, Math.max(1000, env.PDF_METADATA_DOI_TIMEOUT_MS));
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://doi.org/${encodeURIComponent(normalizedDoi)}`, {
      headers: {
        Accept: 'application/vnd.citationstyles.csl+json',
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const result = {
      doi: normalizedDoi,
      title: cleanText(String(payload?.title || '')),
      authors: Array.isArray(payload?.author)
        ? payload.author.map(parseCslAuthor).filter(Boolean)
        : [],
      publicationYear: parseCslYear(payload?.issued),
      publicationVenue: normalizeVenue(
        Array.isArray(payload?.['container-title'])
          ? payload['container-title'][0]
          : payload?.['container-title'] || '',
      ),
      keywords: parseCslKeywords(payload?.keyword),
      abstract: stripHtmlTags(payload?.abstract),
    };
    setCachedDoiMetadata(normalizedDoi, result);
    return result;
  } catch (error) {
    logger.debug({ doi: normalizedDoi, err: error?.message }, 'DOI metadata lookup failed');
    return null;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function applyDoiMetadata(result, doiMetadata) {
  if (!doiMetadata) return result;
  const enriched = { ...result };
  const confidence = { ...(result.confidence || {}) };
  const fieldSources = { ...(result.fieldSources || {}) };

  if (doiMetadata.title) {
    enriched.title = doiMetadata.title;
    confidence.title = 0.98;
    fieldSources.title = 'doi';
  }
  if (Array.isArray(doiMetadata.authors) && doiMetadata.authors.length > 0) {
    enriched.authors = doiMetadata.authors;
    confidence.authors = 0.98;
    fieldSources.authors = 'doi';
  }
  if (doiMetadata.publicationYear) {
    enriched.publicationYear = doiMetadata.publicationYear;
    confidence.publicationYear = 0.98;
    fieldSources.publicationYear = 'doi';
  }
  if (doiMetadata.publicationVenue) {
    enriched.publicationVenue = doiMetadata.publicationVenue;
    confidence.publicationVenue = 0.96;
    fieldSources.publicationVenue = 'doi';
  }
  if (Array.isArray(doiMetadata.keywords) && doiMetadata.keywords.length > 0) {
    enriched.keywords = doiMetadata.keywords;
    confidence.keywords = 0.95;
    fieldSources.keywords = 'doi';
  }
  if ((!enriched.abstract || enriched.abstract.length < 100) && doiMetadata.abstract) {
    enriched.abstract = doiMetadata.abstract.slice(0, 3000);
    confidence.abstract = 0.9;
    fieldSources.abstract = 'doi';
  }

  enriched.doi = doiMetadata.doi || enriched.doi;
  confidence.doi = enriched.doi ? 0.99 : confidence.doi || 0;
  fieldSources.doi = enriched.doi ? 'doi' : fieldSources.doi || 'none';
  enriched.confidence = confidence;
  enriched.fieldSources = fieldSources;
  enriched.extractionProvider = result.extractionProvider
    ? `${result.extractionProvider}+doi`
    : 'doi';
  return enriched;
}

async function enrichWithDoiMetadata(result, text) {
  const candidateDoi = normalizeDoi(result?.doi || extractDoi(text));
  if (!candidateDoi) return result;
  const doiMetadata = await fetchMetadataByDoi(candidateDoi);
  if (!doiMetadata) return result;
  return applyDoiMetadata({ ...result, doi: candidateDoi }, doiMetadata);
}

function computeReviewFlags(result) {
  const flags = [];
  const confidence = result?.confidence || {};
  if (!result?.title || Number(confidence.title || 0) < MIN_TITLE_CONFIDENCE) {
    flags.push('low_title_confidence');
  }
  if (!result?.abstract || Number(confidence.abstract || 0) < MIN_ABSTRACT_CONFIDENCE) {
    flags.push('low_abstract_confidence');
  }
  if (!Array.isArray(result?.authors) || result.authors.length === 0) {
    flags.push('missing_authors');
  } else if (Number(confidence.authors || 0) < MIN_AUTHORS_CONFIDENCE) {
    flags.push('low_authors_confidence');
  }
  if (!result?.doi) {
    flags.push('missing_doi');
  }
  if (!result?.publicationYear) {
    flags.push('missing_publication_year');
  }
  return flags;
}

function withReviewGate(result) {
  const reasons = computeReviewFlags(result);
  return {
    ...result,
    review: {
      required: Boolean(env.PDF_METADATA_REVIEW_GATE_ENABLED) && reasons.length > 0,
      reasons,
    },
  };
}

/**
 * Validates and cleans OCR-extracted author field
 * Detects when institutional data leaked into authors array
 */
function validateAuthorField(authors) {
  if (!Array.isArray(authors)) return [];

  return authors
    .map((author) => {
      if (typeof author !== 'string') return null;

      const cleaned = sanitizeAuthorName(author);

      // Reject if still contains institutional markers after sanitization
      // Use word boundaries to avoid matching substrings like "Co" in "Cooper"
      const institutionalPatterns = [
        /\bLtd\b/i,
        /\bInc\b/i,
        /\bCorp\b/i,
        /\bCo\b/i,
        /\bLLC\b/i,
        /\bGmbH\b/i,
        /\bUniversity\b/i,
        /\bCollege\b/i,
        /\bDepartment\b/i,
        /\bFaculty\b/i,
        /\bInstitute\b/i,
        /\bLab\b/i,
        /\bLaboratory\b/i,
        /\bAcademy\b/i,
        /\bKingdom\b/i,
        /\bFrance\b/i,
        /\bGermany\b/i,
        /\bStates\b/i,
        /\bPress\b/i,
        /\bPublisher\b/i,
        /\bFoundation\b/i,
      ];

      for (const pattern of institutionalPatterns) {
        if (pattern.test(cleaned)) {
          return null;
        }
      }

      return isLikelyAuthorName(cleaned) ? cleaned : null;
    })
    .filter(Boolean);
}

/**
 * Post-processing sanitizer for OCR output
 * Ensures field separation and data integrity
 */
function sanitizeOcrResult(ocrOutput) {
  if (!ocrOutput || typeof ocrOutput !== 'object') {
    return null;
  }

  let title = cleanText(String(ocrOutput.title || '')).slice(0, 300);
  let abstract = cleanText(String(ocrOutput.abstract || '')).slice(0, 3000);

  // --- Hallucination detection: reject fields that contain prompt leak patterns ---
  const hallucPatterns = [
    /\b(JSON|json format|output format|respond only|text to analyze|paper text)\b/i,
    /\b(instructions|do not include|keep it short|EXCLUDE)\b/i,
    /\b(metadata extractor|given academic)\b/i,
    /^Title:\s*Title/i,
    /\bauthorities\b/i,
  ];

  if (hallucPatterns.some((p) => p.test(title))) {
    logger.warn({ title: title.slice(0, 80) }, 'GLM title contains hallucinated prompt text; discarding');
    title = '';
  }

  if (hallucPatterns.some((p) => p.test(abstract))) {
    logger.warn('GLM abstract contains hallucinated prompt text; discarding');
    abstract = '';
  }

  // Reject titles that are clearly too long (contain addresses, emails, affiliations)
  if (
    title.length > 150 ||
    /[@{}+]/.test(title) ||
    /\b(University|Department|School of)\b/i.test(title) ||
    PROCEEDINGS_NOISE_PATTERNS.some((pattern) => pattern.test(title))
  ) {
    logger.warn({ titleLen: title.length }, 'GLM title too long or contains institutional data; discarding');
    title = '';
  }

  // Aggressive author validation
  let authors = validateAuthorField(ocrOutput.authors);

  // Confidence penalty if author field was too long (sign of contamination)
  let authorConfidence = 0.82;
  if (authors.length > 0) {
    const authorFieldLength = authors.join(', ').length;
    if (authorFieldLength > 200) {
      logger.warn(
        { authorFieldLength, count: authors.length },
        'Author field suspiciously long; reducing confidence',
      );
      authorConfidence = Math.max(0.5, authorConfidence - 0.2);

      // Further filter: if too many authors or field too long, truncate
      if (authorFieldLength > 300 || authors.length > 10) {
        authors = authors.slice(0, 5);
      }
    }
  }

  if (!title && !abstract && authors.length === 0) {
    return null;
  }

  return {
    title,
    abstract,
    authors,
    keywords: normalizeKeywordsArray(ocrOutput.keywords),
    doi: normalizeDoi(ocrOutput.doi),
    venue: normalizeVenue(ocrOutput.venue || ocrOutput.publicationVenue),
    publicationYear: (() => {
      const y = Number(ocrOutput.publicationYear);
      return Number.isInteger(y) && y >= 1900 && y <= new Date().getFullYear() + 1 ? y : null;
    })(),
    confidence: {
      title: title ? 0.88 : 0,
      abstract: abstract ? 0.86 : 0,
      authors: authors.length > 0 ? authorConfidence : 0,
    },
  };
}

async function extractWithGlmOcr(pdfText) {
  if (!env.PDF_METADATA_ENABLE_GLM_OCR) {
    return null;
  }

  try {
    const ollamaModule = await import('ollama');

    const OllamaClient = ollamaModule?.Ollama || ollamaModule?.default?.Ollama;

    if (typeof OllamaClient !== 'function') {
      logger.warn(
        'GLM dependency loaded but Ollama client constructor is unavailable; skipping model extraction',
      );
      return null;
    }

    const ollamaClient = new OllamaClient({
      host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    });

    if (typeof ollamaClient?.generate !== 'function') {
      logger.warn(
        'GLM dependency loaded but generate API is unavailable; skipping model extraction',
      );
      return null;
    }

    const normalizedText = await buildGlmInputText(pdfText);
    if (!normalizedText) {
      return null;
    }

    const timeoutMs = Math.min(60000, Math.max(5000, env.PDF_METADATA_GLM_TIMEOUT_MS));
    const response = await Promise.race([
      ollamaClient.generate({
        model: env.PDF_METADATA_GLM_MODEL || 'glm-ocr:latest',
        prompt: `${GLM_METADATA_PROMPT}\n${normalizedText}`,
        format: 'json',
        stream: false,
        options: {
          temperature: env.PDF_METADATA_GLM_TEMPERATURE,
          top_p: env.PDF_METADATA_GLM_TOP_P,
          repeat_penalty: env.PDF_METADATA_GLM_REPEAT_PENALTY,
        },
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`GLM OCR request timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);

    const parsed = safeParseJson(response?.response || '');

    // Apply enhanced sanitization layer for OCR output
    const sanitized = sanitizeOcrResult(parsed);
    if (!sanitized) return null;

    return {
      ...sanitized,
      provider: 'glm-ocr',
    };
  } catch (error) {
    logger.warn({ err: error?.message }, 'GLM extraction failed; falling back to heuristic parser');
    return null;
  }
}

/**
 * Extracts title and abstract from a PDF file.
 *
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{title: string, abstract: string, publicationYear: number|null, authors: string[], keywords: string[], confidence: {title: number, abstract: number, publicationYear: number, authors: number, keywords: number}}>}
 */
export async function extractPdfMetadata(pdfBuffer) {
  const cacheKey = buildExtractionCacheKey(computeBufferHash(pdfBuffer));
  const cached = getCachedExtraction(cacheKey);
  if (cached) {
    logger.debug({ cacheKey }, 'Returning cached PDF metadata extraction result');
    return cached;
  }

  const data = await parsePdf(pdfBuffer);
  const text = data.text;

  if (!text || text.trim().length === 0) {
    logger.warn('PDF contains no extractable text');
    const emptyResult = {
      title: '',
      abstract: '',
      publicationYear: null,
      authors: [],
      keywords: [],
      doi: '',
      publicationVenue: '',
      confidence: { title: 0, abstract: 0, publicationYear: 0, authors: 0, keywords: 0, doi: 0, publicationVenue: 0 },
      extractionProvider: 'heuristic',
      fieldSources: {
        title: 'none',
        abstract: 'none',
        publicationYear: 'none',
        authors: 'none',
        keywords: 'none',
        doi: 'none',
        publicationVenue: 'none',
      },
      review: {
        required: Boolean(env.PDF_METADATA_REVIEW_GATE_ENABLED),
        reasons: ['no_extractable_text'],
      },
    };

    setCachedExtraction(cacheKey, emptyResult);
    return emptyResult;
  }

  logger.info({ textLength: text.length, pages: data.numpages }, 'Extracting metadata from PDF');

  const title = extractTitle(text, data.info);
  const abstract = extractAbstract(text);
  const publicationYear = extractPublicationYear(text, data.info);
  const authors = extractAuthors(text, data.info);
  const keywords = extractKeywords(text);
  const heuristicDoi = normalizeDoi(extractDoi(text));

  const baseResult = {
    title: title.value,
    abstract: abstract.value,
    publicationYear: publicationYear.value,
    authors: authors.value,
    keywords: keywords.value,
    doi: heuristicDoi,
    publicationVenue: '',
    confidence: {
      title: title.confidence,
      abstract: abstract.confidence,
      publicationYear: publicationYear.confidence,
      authors: authors.confidence,
      keywords: keywords.confidence,
      doi: heuristicDoi ? 0.8 : 0,
      publicationVenue: 0,
    },
    extractionProvider: 'heuristic',
    fieldSources: {
      title: 'heuristic',
      abstract: 'heuristic',
      publicationYear: 'heuristic',
      authors: 'heuristic',
      keywords: 'heuristic',
      doi: heuristicDoi ? 'heuristic' : 'none',
      publicationVenue: 'none',
    },
  };

  if (!shouldUseGlmFallback(baseResult)) {
    const doiEnriched = await enrichWithDoiMetadata(baseResult, text);
    const finalized = withReviewGate(doiEnriched);
    setCachedExtraction(cacheKey, finalized);
    return finalized;
  }

  const ocrMetadata = await extractWithGlmOcr(text);
  if (!ocrMetadata) {
    const doiEnriched = await enrichWithDoiMetadata(baseResult, text);
    const finalized = withReviewGate(doiEnriched);
    setCachedExtraction(cacheKey, finalized);
    return finalized;
  }

  // Smart merge: pick best field from each source using quality heuristics
  const pickBestTitle = () => {
    const ocrTitle = ocrMetadata.title || '';
    const heurTitle = baseResult.title || '';
    // If GLM returned empty or garbage, use heuristic
    if (!ocrTitle) return { value: heurTitle, conf: baseResult.confidence.title, provider: 'heuristic' };
    if (!heurTitle) return { value: ocrTitle, conf: ocrMetadata.confidence.title, provider: 'glm-ocr' };
    // Prefer shorter clean title if GLM title is bloated (contains addresses, numbers at start)
    if (ocrTitle.length > heurTitle.length * 2 && heurTitle.length >= 20) {
      return { value: heurTitle, conf: baseResult.confidence.title, provider: 'heuristic' };
    }
    // Prefer GLM if heuristic title is clearly truncated
    if (heurTitle.length < 25 && ocrTitle.length > 25 && ocrTitle.length < 200) {
      return { value: ocrTitle, conf: ocrMetadata.confidence.title, provider: 'glm-ocr' };
    }
    return { value: ocrTitle, conf: ocrMetadata.confidence.title, provider: 'glm-ocr' };
  };

  const bestTitle = pickBestTitle();

  const mergedDoi = normalizeDoi(ocrMetadata.doi || baseResult.doi || extractDoi(text));
  const mergedVenue = normalizeVenue(ocrMetadata.venue || baseResult.publicationVenue);
  const mergedResult = {
    title: bestTitle.value,
    abstract: ocrMetadata.abstract || baseResult.abstract,
    publicationYear: ocrMetadata.publicationYear || baseResult.publicationYear,
    authors: ocrMetadata.authors.length > 0 ? ocrMetadata.authors : baseResult.authors,
    keywords:
      ocrMetadata.keywords?.length > 0
        ? normalizeKeywordsArray(ocrMetadata.keywords)
        : baseResult.keywords,
    doi: mergedDoi,
    publicationVenue: mergedVenue,
    confidence: {
      title: bestTitle.conf,
      abstract: ocrMetadata.abstract
        ? ocrMetadata.confidence.abstract
        : baseResult.confidence.abstract,
      publicationYear: ocrMetadata.publicationYear ? 0.88 : baseResult.confidence.publicationYear,
      authors:
        ocrMetadata.authors.length > 0
          ? ocrMetadata.confidence.authors
          : baseResult.confidence.authors,
      keywords: ocrMetadata.keywords?.length > 0 ? 0.85 : baseResult.confidence.keywords,
      doi: mergedDoi ? (ocrMetadata.doi ? 0.9 : baseResult.confidence.doi) : 0,
      publicationVenue: mergedVenue
        ? (ocrMetadata.venue ? 0.85 : baseResult.confidence.publicationVenue)
        : 0,
    },
    extractionProvider: bestTitle.provider === 'glm-ocr' ? ocrMetadata.provider : 'heuristic+glm',
    fieldSources: {
      title: bestTitle.provider,
      abstract: ocrMetadata.abstract ? 'glm-ocr' : 'heuristic',
      publicationYear: ocrMetadata.publicationYear ? 'glm-ocr' : 'heuristic',
      authors: ocrMetadata.authors.length > 0 ? 'glm-ocr' : 'heuristic',
      keywords: ocrMetadata.keywords?.length > 0 ? 'glm-ocr' : 'heuristic',
      doi: ocrMetadata.doi ? 'glm-ocr' : baseResult.doi ? 'heuristic' : 'none',
      publicationVenue: ocrMetadata.venue ? 'glm-ocr' : 'none',
    },
  };

  const doiEnriched = await enrichWithDoiMetadata(mergedResult, text);
  const finalized = withReviewGate(doiEnriched);
  setCachedExtraction(cacheKey, finalized);
  return finalized;
}

/**
 * Extracts DOI from text.
 */
function extractDoi(text) {
  const match = text.match(/\b(10\.\d{4,}(?:\.\d+)*\/[^\s,;]+)/i);
  if (match && match[1]) {
    // Clean trailing punctuation
    return match[1].replace(/[.)>]+$/, '');
  }
  return '';
}

/**
 * Extracts title from PDF text using multiple heuristics.
 */
function extractTitle(text, pdfInfo) {
  // First, check PDF metadata for title
  if (pdfInfo?.Title && pdfInfo.Title.trim().length > 5) {
    const metaTitle = cleanText(pdfInfo.Title);
    if (metaTitle.length > 10 && metaTitle.length < 300) {
      logger.debug({ source: 'metadata', title: metaTitle }, 'Title from PDF metadata');
      return { value: metaTitle, confidence: 0.9 };
    }
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Strategy 1: Look for title before "Abstract" section
  const abstractIndex = findSectionIndex(lines, ['abstract', 'ABSTRACT']);
  if (abstractIndex > 0) {
    // Title is typically in the first few lines before abstract
    const candidateLines = lines.slice(0, Math.min(abstractIndex, 10));
    const title = findTitleFromLines(candidateLines);
    if (title) {
      logger.debug({ source: 'before-abstract', title }, 'Title before abstract');
      return { value: title, confidence: 0.8 };
    }
  }

  // Strategy 2: First substantial line that looks like a title
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    if (isTitleCandidate(line)) {
      logger.debug(
        { source: 'first-substantial', title: line },
        'Title from first substantial line',
      );
      return { value: cleanText(line), confidence: 0.6 };
    }
  }

  // Strategy 3: Concatenate first few lines if they seem like a multi-line title
  const firstLines = lines.slice(0, 5);
  const multiLineTitle = findMultiLineTitle(firstLines);
  if (multiLineTitle) {
    logger.debug({ source: 'multi-line', title: multiLineTitle }, 'Multi-line title');
    return { value: multiLineTitle, confidence: 0.5 };
  }

  return { value: '', confidence: 0 };
}

/**
 * Extracts abstract from PDF text.
 */
function extractAbstract(text) {
  const lines = text.split('\n').map((l) => l.trim());

  // Find "Abstract" section
  const abstractPatterns = [
    /^abstract$/i,
    /^abstract[:\s]/i,
    /^ABSTRACT$/,
    /^A\s*B\s*S\s*T\s*R\s*A\s*C\s*T$/i, // Spaced out letters
  ];

  let abstractStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (abstractPatterns.some((p) => p.test(lines[i]))) {
      abstractStart = i;
      break;
    }
  }

  if (abstractStart === -1) {
    // Try to find abstract in continuous text
    const textLower = text.toLowerCase();
    const abstractMatch = textLower.match(
      /abstract[:\s\n]+(.+?)(?=\n\s*(?:introduction|keywords|key\s*words|1\.|1\s|i\.|i\s+introduction))/is,
    );
    if (abstractMatch && abstractMatch[1]) {
      const abstract = cleanText(abstractMatch[1]);
      if (abstract.length > 50 && abstract.length < 3000) {
        return { value: abstract, confidence: 0.7 };
      }
    }
    return { value: '', confidence: 0 };
  }

  // Find end of abstract section
  const endPatterns = [
    /^introduction$/i,
    /^1\.\s*introduction/i,
    /^i\.\s*introduction/i,
    /^keywords?[:\s]/i,
    /^key\s*words?[:\s]/i,
    /^index\s*terms?[:\s]/i,
    /^1\.\s+\w/,
    /^I\.\s+\w/,
    /^background$/i,
    /^related\s*work/i,
  ];

  let abstractEnd = lines.length;
  for (let i = abstractStart + 1; i < lines.length; i++) {
    if (endPatterns.some((p) => p.test(lines[i]))) {
      abstractEnd = i;
      break;
    }
  }

  // Extract lines between start and end
  const abstractLines = lines.slice(abstractStart + 1, abstractEnd);
  const abstract = abstractLines
    .filter((line) => line.length > 0 && !line.match(/^page\s*\d+$/i))
    .join(' ');

  const cleanedAbstract = cleanText(abstract);

  if (cleanedAbstract.length < 50) {
    return { value: '', confidence: 0 };
  }

  // Truncate if too long (max ~500 words / 3000 chars)
  const finalAbstract =
    cleanedAbstract.length > 3000 ? cleanedAbstract.substring(0, 3000) + '...' : cleanedAbstract;

  return { value: finalAbstract, confidence: 0.85 };
}

/**
 * Extracts publication year from PDF metadata and nearby text context.
 */
function extractPublicationYear(text, pdfInfo) {
  const currentYear = new Date().getFullYear();

  const fromInfo = findValidYear(pdfInfo?.CreationDate) || findValidYear(pdfInfo?.ModDate);
  if (fromInfo) {
    return { value: fromInfo, confidence: 0.9 };
  }

  const firstChunk = text.slice(0, 6000);
  const preferredPatterns = [
    /\b(?:published|publication|accepted|copyright|©|journal)\s*(?:in|:)??\s*(19\d{2}|20\d{2})\b/gi,
    /\b(19\d{2}|20\d{2})\b(?=\s*(?:ieee|acm|springer|elsevier|wiley|journal|conference))/gi,
  ];

  for (const pattern of preferredPatterns) {
    const match = pattern.exec(firstChunk);
    if (!match) continue;
    const candidate = Number(match[1]);
    if (candidate >= 1900 && candidate <= currentYear + 1) {
      return { value: candidate, confidence: 0.8 };
    }
  }

  const years = Array.from(firstChunk.matchAll(/\b(19\d{2}|20\d{2})\b/g))
    .map((m) => Number(m[1]))
    .filter((year) => year >= 1900 && year <= currentYear + 1);

  if (years.length > 0) {
    // Prefer most frequent year token in header text to avoid "latest year" drift.
    const frequencies = new Map();
    for (const year of years) {
      frequencies.set(year, (frequencies.get(year) || 0) + 1);
    }
    const sortedCandidates = [...frequencies.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0] - b[0];
    });
    return { value: sortedCandidates[0][0], confidence: 0.62 };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extracts author names from PDF metadata and title-page lines.
 */
function extractAuthors(text, pdfInfo) {
  const fromInfo = normalizeAuthors(pdfInfo?.Author);
  if (fromInfo.length > 0) {
    return { value: fromInfo, confidence: 0.9 };
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 60);

  const abstractIdx = lines.findIndex((line) => /^abstract\b/i.test(line));
  const maxIndex = abstractIdx > 0 ? abstractIdx : Math.min(lines.length, 25);
  const candidateWindow = lines.slice(0, maxIndex);

  const candidates = [];
  for (const line of candidateWindow) {
    if (line.length < 5 || line.length > 200) continue;
    if (
      /\b(university|college|department|faculty|school|journal|conference|doi|abstract)\b/i.test(
        line,
      )
    ) {
      continue;
    }

    const parts = line
      .split(/,|\band\b|&/i)
      .map((v) => sanitizeAuthorName(v))
      .filter(Boolean);

    const valid = parts.filter((name) => isLikelyAuthorName(name));
    if (valid.length > 0) {
      candidates.push(...valid);
    }
    if (candidates.length >= 6) break;
  }

  const deduped = Array.from(new Set(candidates)).slice(0, 6);
  if (deduped.length > 0) {
    return { value: deduped, confidence: 0.65 };
  }

  return { value: [], confidence: 0 };
}

/**
 * Extracts keywords from a dedicated keywords section.
 */
function extractKeywords(text) {
  const match = text.match(/(?:^|\n)\s*(?:keywords?|index\s*terms?)\s*[:-]?\s*([^\n]{3,400})/i);
  if (!match || !match[1]) {
    return { value: [], confidence: 0 };
  }

  const parsed = match[1]
    .split(/,|;|\u2022|\|/)
    .map((v) => v.trim())
    .map((v) => v.replace(/^[-:\s]+/, '').replace(/[.;\s]+$/, ''))
    .filter(Boolean)
    .filter((v) => v.length >= 2 && v.length <= 64)
    .slice(0, 12);

  if (parsed.length === 0) {
    return { value: [], confidence: 0 };
  }

  return { value: Array.from(new Set(parsed)), confidence: 0.8 };
}

/**
 * Helper functions
 */

function findSectionIndex(lines, patterns) {
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase().trim();
    if (
      patterns.some(
        (p) =>
          lineLower === p.toLowerCase() ||
          lineLower.startsWith(p.toLowerCase() + ' ') ||
          lineLower.startsWith(p.toLowerCase() + ':'),
      )
    ) {
      return i;
    }
  }
  return -1;
}

function findValidYear(value) {
  if (!value) return null;

  const currentYear = new Date().getFullYear();
  const match = String(value).match(/(19\d{2}|20\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  if (year < 1900 || year > currentYear + 1) return null;
  return year;
}

function normalizeAuthors(rawAuthor) {
  if (!rawAuthor || typeof rawAuthor !== 'string') return [];

  return Array.from(
    new Set(
      rawAuthor
        .split(/,|;|\band\b|&/i)
        .map((name) => sanitizeAuthorName(name))
        .filter((name) => isLikelyAuthorName(name)),
    ),
  ).slice(0, 8);
}

function sanitizeAuthorName(name) {
  if (!name || typeof name !== 'string') return '';

  // Remove academic titles
  let clean = String(name).replace(
    /\b(ph\.?d\.?|m\.?s\.?|m\.?a\.?|m\.?eng\.?|b\.?s\.?|dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\.?\b/gi,
    '',
  );

  // Remove department/institution titles
  clean = clean.replace(
    /\b(department|faculty|school|college|university|institute|lab|laboratory|division|center|centre)\b/gi,
    '',
  );

  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  // Strip leading/trailing dots and spaces
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');
  return clean;
}

/**
 * Comprehensive check for likely author names with institutional blacklist
 */
function isLikelyAuthorName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 3 || name.length > 80) return false;
  if (/\d/.test(name)) return false;

  const lowerName = name.toLowerCase();

  // Check for institutional keywords using word boundaries to avoid false positives
  if (
    /\b(university|college|department|faculty|school|institute|lab|laboratory|division|center|centre|academy|corporation|company|journal|conference|research|press|publisher|media|foundation|society|association|ltd|inc|corp|llc|gmbh|sarl|pty|pvt|kingdom|france|germany|united|states|america|canada|country|state|province|city|town|district|article|original|paper|review|volume|issue|published|accepted|submitted|copyright)\b/i.test(
      lowerName,
    )
  ) {
    return false;
  }

  // Reject names with institutional prepositions (common in org names, rare in person names)
  if (/\b(of|and|or|for|at|by|the)\b/i.test(lowerName)) {
    return false;
  }

  // Reject special characters EXCEPT periods and hyphens (needed for initials like "S." and compound names like "von")
  if (/[/@#$%^&*()+=[\]{}|\\:;"'<>,?/]/.test(name)) {
    return false;
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;

  // Each word must start with capital, can contain letters, apostrophes, periods, or hyphens
  // First word must be capitalized, middle/last can be lowercase (for particles like "von")
  return words.every((word, idx) => {
    const pattern =
      idx === 0
        ? /^[A-Z\u00C0-\u017F][a-zA-Z\u00C0-\u017F'.-]*$/u // First word capitalized
        : /^[A-Za-z\u00C0-\u017F][a-zA-Z\u00C0-\u017F'.-]*$/u; // Other words can be lowercase
    return pattern.test(word);
  });
}

function findTitleFromLines(lines) {
  // Skip common header elements
  const skipPatterns = [
    /^\d+$/, // Just numbers (page numbers)
    /^page\s*\d+$/i,
    /^vol[.\s:(]*\d/i, // Matches Vol. 1, Vol:(123), Vol.:(123), Vol:.(123)
    /^volume\s*\d+/i,
    /^issue\b/i,
    /^\d{4}$/, // Year
    /^issn/i,
    /^isbn/i,
    /^doi:/i,
    /^http/i,
    /^www\./i,
    /^\d+\s*-\s*\d+$/, // Page range
    /^journal\s+of/i,
    /^international\s+journal/i,
    /^proceedings\s+of/i,
    /^conference/i,
    /^©/,
    /copyright/i,
    /^original\s+(article|paper)/i,
    /^research\s+(article|paper)/i,
    /^review\s+article/i,
    /^open\s+access/i,
    /^available\s+online/i,
    /licensee\s+mdpi/i,
    /^received:/i,
    /^accepted:/i,
    /^published/i,
    /\.\s*c©/,   // copyright markers in venue lines
    /association\s+for\s+computational/i,
    /^[A-Z][a-z]+,\s*[A-Z][a-z]+,\s/,  // City, State/Country patterns (venue lines)
    /^\w+\s+\d{1,2}[-–]\d{1,2},\s*\d{4}/,  // Date ranges like "June 4-5, 2015"
    /\(\d{4}\)\s*\d+:\d+[-–]?\d*/, // Journal headers like "(2025) 16:310–325" or "59:257"
    /^[A-Za-z\s.,]+(?:University|Department|Institute|Faculty|School)\b/i, // Affiliation lines
  ];

  // First pass: find the first title candidate line
  let titleStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 10 || line.length > 300) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;
    
    // Check if it's a strong title candidate (title case) OR it's the very first non-skipped line
    // and looks like a sentence-case title (not an author list).
    const isStrongCandidate = isTitleCandidate(line);
    const isSentenceCaseCandidate = line.length > 15 && line.split(' ').length >= 3 && !/\b(and|&)\b/i.test(line) && !/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*[,·]/.test(line);
    
    if (isStrongCandidate || isSentenceCaseCandidate) {
      // Reject if it's clearly an author list with special markers
      if (/[\u00B7\u2022\u25E6\u2043\u2219]|([A-Za-z]+)\d+/.test(line)) continue;
      titleStartIdx = i;
      break;
    }
  }

  if (titleStartIdx === -1) return null;

  // Second pass: check if the next line is a continuation of the title
  // (multi-line titles like "Document Overlap Detection System for Distributed\nDigital Libraries")
  let title = cleanText(lines[titleStartIdx]);
  for (let j = titleStartIdx + 1; j < Math.min(titleStartIdx + 3, lines.length); j++) {
    const nextLine = lines[j];
    if (!nextLine || nextLine.length < 3) break;
    // Stop if next line looks like authors, affiliation, abstract, etc.
    if (/^(by|author|department|university|college|school|faculty|abstract|introduction)/i.test(nextLine)) break;
    if (/[@{}]/.test(nextLine)) break;  // email or affiliation
    if (/^\d+$/.test(nextLine)) break;  // page number
    if (skipPatterns.some((p) => p.test(nextLine))) break;
    // Reject if it's clearly an author list with special markers
    if (/[\u00B7\u2022\u25E6\u2043\u2219]|\b([A-Za-z]+)[1-9]\b/.test(nextLine)) break;
    // Stop if the next line contains commas (likely author list)
    if ((nextLine.match(/,/g) || []).length >= 2) break;
    // Stop if next line looks like a list of names (capitalized words, maybe with particles like van/der/de)
    const isNameList = /^([A-Z][a-z]+|van|der|de|la|von|da)(\s+([A-Z][a-z]+|van|der|de|la|von|da)){0,5}\s*$/i.test(nextLine);
    const hasTitleWords = /\b(system|library|network|model|data|analysis|detection|method|approach)\b/i.test(nextLine);
    if (isNameList && !/\b(for|and|the|in|of|on|a|an|with|by)\b/i.test(nextLine) && !hasTitleWords) break;
    
    // If next line is short-ish, title-cased, and no period at end, it's likely title continuation
    if (nextLine.length <= 100 && isTitleCandidate(nextLine)) {
      title = cleanText(title + ' ' + nextLine);
      continue;
    }
    // Also join if next line is short, capitalized, and clearly a fragment
    if (nextLine.length < 40 && /^[A-Z]/.test(nextLine) && !nextLine.endsWith('.')) {
      title = cleanText(title + ' ' + nextLine);
      continue;
    }
    // Join if next line is lowercase continuation
    if (nextLine.length < 50 && /^[a-z]/.test(nextLine) && !title.endsWith('.')) {
      title = cleanText(title + ' ' + nextLine);
      continue;
    }
    break;
  }

  return title.length >= 10 && title.length <= 300 ? title : null;
}

function isTitleCandidate(line) {
  if (line.length < 10 || line.length > 300) return false;

  // Reject lines that look like venue/proceedings/date headers
  if (/^Proceedings\s+of/i.test(line)) return false;
  if (/\bc©\d{4}\b/.test(line)) return false;
  if (/\bAssociation\s+for\s+Computational/i.test(line)) return false;
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+,\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(line)) return false;

  // Titles typically don't end with periods (unless it's an acronym)
  if (line.endsWith('.') && !line.match(/\b[A-Z]{2,}\.$/) && line.split('.').length <= 2) {
    // Might be end of sentence, less likely title
  }

  // Titles are often in title case or all caps
  const words = line.split(/\s+/);
  const capitalizedWords = words.filter((w) => /^[A-Z]/.test(w));
  const ratio = capitalizedWords.length / words.length;

  // At least 60% capitalized words, or all caps
  if (ratio >= 0.6 || line === line.toUpperCase()) {
    // Skip if looks like author names (contains "and", multiple names)
    if (/\b(and|&)\b/i.test(line) && words.length <= 8) {
      return false;
    }
    return true;
  }

  return false;
}

function findMultiLineTitle(lines) {
  // Some titles span multiple lines - concatenate if they look connected
  const titleParts = [];
  for (const line of lines) {
    if (line.length < 5) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^(by|author|department|university|college|school|faculty)/i.test(line)) break;
    if (/^(abstract|introduction)/i.test(line)) break;

    titleParts.push(line);
    if (titleParts.join(' ').length > 200) break;
    if (titleParts.length >= 3) break;
  }

  const combined = titleParts.join(' ');
  if (combined.length >= 15 && combined.length <= 300) {
    return cleanText(combined);
  }
  return null;
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

/**
 * Extract metadata from a file path.
 *
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{title: string, abstract: string, confidence: {title: number, abstract: number}}>}
 */
export async function extractPdfMetadataFromFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return extractPdfMetadata(buffer);
}
