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

// Enhanced GLM prompt with explicit field anchors for better accuracy
const GLM_METADATA_PROMPT = [
  'Extract metadata from this academic paper using field anchors.',
  'CRITICAL: Do NOT include institutional data (Ltd, Inc, University, etc.) in the authors field.',
  '',
  'Field Extraction Rules:',
  '1. TITLE: Use the largest/boldest text on page 2. Usually 30-300 characters.',
  '2. AUTHORS: Extract ONLY person names (FirstName LastName format). Stop at affiliations.',
  '3. ABSTRACT: Text immediately after author section. Usually starts with "Abstract:" or "Introduction:"',
  '',
  'OUTPUT: Return ONLY this strict JSON schema (no markdown, no extras):',
  '{"title":"","authors":[],"abstract":""}',
  '',
  'VALIDATION:',
  '- authors array: ONLY include ["FirstName LastName", ...] format',
  '- Reject entries with: "Ltd", "Inc", "University", "Department", "United Kingdom", "UK", "USA", etc.',
  '- authors string length must be < 200 chars total',
  '',
  'Text snippet:',
].join('\n');

const extractionCache = new Map();
const EXTRACTION_CACHE_TTL_MS = Number.isFinite(env.PDF_METADATA_CACHE_TTL_MS)
  ? env.PDF_METADATA_CACHE_TTL_MS
  : 10 * 60 * 1000;
const EXTRACTION_CACHE_MAX_ENTRIES = 100;

function computeBufferHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function buildExtractionCacheKey(bufferHash) {
  const strategy = String(env.PDF_METADATA_GLM_STRATEGY || 'fallback').toLowerCase();
  const model = String(env.PDF_METADATA_GLM_MODEL || 'glm-ocr:latest').toLowerCase();
  const preprocess = String(process.env.PDF_METADATA_ENABLE_PLAGIARISM_PREPROCESS || 'true')
    .trim()
    .toLowerCase();
  return `${bufferHash}:${strategy}:${model}:${preprocess}`;
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

function shouldUseGlmFallback(baseResult) {
  const strategy = String(env.PDF_METADATA_GLM_STRATEGY || 'fallback').toLowerCase();
  if (strategy === 'always') return true;

  const hasStrongTitle =
    baseResult.title &&
    baseResult.title.length >= 30 &&
    Number(baseResult.confidence?.title || 0) >= 0.75;

  const hasStrongAbstract =
    baseResult.abstract &&
    baseResult.abstract.length >= 220 &&
    Number(baseResult.confidence?.abstract || 0) >= 0.8;

  const hasAuthors = Array.isArray(baseResult.authors) && baseResult.authors.length > 0;

  return !(hasStrongTitle && hasStrongAbstract && hasAuthors);
}

async function buildGlmInputText(pdfText) {
  const fallback = cleanText(String(pdfText || '')).slice(0, 12000);
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
    const compressedText = cleanText(String(payload?.compressed_text || '')).slice(0, 12000);
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

  const title = cleanText(String(ocrOutput.title || '')).slice(0, 300);
  const abstract = cleanText(String(ocrOutput.abstract || '')).slice(0, 3000);

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

    const response = await ollamaClient.generate({
      model: env.PDF_METADATA_GLM_MODEL || 'glm-ocr:latest',
      prompt: `${GLM_METADATA_PROMPT}\n${normalizedText}`,
      format: 'json',
      stream: false,
    });

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
      confidence: { title: 0, abstract: 0, publicationYear: 0, authors: 0, keywords: 0 },
      extractionProvider: 'heuristic',
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

  const baseResult = {
    title: title.value,
    abstract: abstract.value,
    publicationYear: publicationYear.value,
    authors: authors.value,
    keywords: keywords.value,
    confidence: {
      title: title.confidence,
      abstract: abstract.confidence,
      publicationYear: publicationYear.confidence,
      authors: authors.confidence,
      keywords: keywords.confidence,
    },
    extractionProvider: 'heuristic',
  };

  if (!shouldUseGlmFallback(baseResult)) {
    setCachedExtraction(cacheKey, baseResult);
    return baseResult;
  }

  const ocrMetadata = await extractWithGlmOcr(text);
  if (!ocrMetadata) {
    setCachedExtraction(cacheKey, baseResult);
    return baseResult;
  }

  const mergedResult = {
    title: ocrMetadata.title || baseResult.title,
    abstract: ocrMetadata.abstract || baseResult.abstract,
    publicationYear: baseResult.publicationYear,
    authors: ocrMetadata.authors.length > 0 ? ocrMetadata.authors : baseResult.authors,
    keywords: baseResult.keywords,
    doi: baseResult.doi,
    publicationVenue: baseResult.publicationVenue,
    confidence: {
      title: ocrMetadata.title ? ocrMetadata.confidence.title : baseResult.confidence.title,
      abstract: ocrMetadata.abstract
        ? ocrMetadata.confidence.abstract
        : baseResult.confidence.abstract,
      publicationYear: baseResult.confidence.publicationYear,
      authors:
        ocrMetadata.authors.length > 0
          ? ocrMetadata.confidence.authors
          : baseResult.confidence.authors,
      keywords: baseResult.confidence.keywords,
      doi: baseResult.confidence.doi,
      publicationVenue: baseResult.confidence.publicationVenue,
    },
    extractionProvider: ocrMetadata.provider,
  };

  setCachedExtraction(cacheKey, mergedResult);
  return mergedResult;
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
    // Pick the most recent year in the header region, which usually maps to publication year.
    return { value: Math.max(...years), confidence: 0.55 };
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
    /\b(university|college|department|faculty|school|institute|lab|laboratory|division|center|centre|academy|corporation|company|journal|conference|research|press|publisher|media|foundation|society|association|ltd|inc|corp|llc|gmbh|sarl|pty|pvt|kingdom|france|germany|united|states|america|canada|country|state|province|city|town|district)\b/i.test(
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
  if (/[/@#$%^&*()+=[\]{}|\\:;"'<>,/]/.test(name)) {
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
    /^vol\.\s*\d+/i,
    /^volume\s*\d+/i,
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
  ];

  for (const line of lines) {
    if (line.length < 10 || line.length > 300) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;
    if (isTitleCandidate(line)) {
      return cleanText(line);
    }
  }
  return null;
}

function isTitleCandidate(line) {
  if (line.length < 10 || line.length > 300) return false;

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
