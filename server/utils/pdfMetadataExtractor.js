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

// In-memory extraction caches

const extractionCache = new Map();
const doiMetadataCache = new Map();
const EXTRACTION_CACHE_TTL_MS = Number.isFinite(env.PDF_METADATA_CACHE_TTL_MS)
  ? env.PDF_METADATA_CACHE_TTL_MS
  : 10 * 60 * 1000;
const EXTRACTION_CACHE_MAX_ENTRIES = 100;
const DOI_CACHE_TTL_MS = 60 * 60 * 1000;

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
  return `v2:${bufferHash}:paddleocr-vl`;
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

async function parsePdf(pdfBuffer) {
  try {
    const { ocrExtractionService } = await import('../services/ocrExtraction.service.js');
    const parsed = await ocrExtractionService.parseDocument(pdfBuffer, 'application/pdf');
    if (
      parsed &&
      parsed.ocrStatus !== 'degraded' &&
      parsed?.fullText &&
      parsed.fullText.trim().length > 0
    ) {
      return {
        text: parsed.fullText,
        numpages: parsed.metadata?.page_count || 1,
        ocrStatus: parsed.ocrStatus || 'complete',
        info: {
          Title: parsed.metadata?.title || null,
          Author: Array.isArray(parsed.metadata?.authors)
            ? parsed.metadata.authors.join(', ')
            : null,
          Abstract: parsed.metadata?.abstract || null,
          Year: parsed.metadata?.year || null,
          Journal:
            parsed.metadata?.journal ||
            parsed.metadata?.venue ||
            parsed.metadata?.publication_venue ||
            null,
          tables: parsed.tables || [],
          formulas: parsed.formulas || [],
        },
      };
    }
  } catch (err) {
    logger.debug({ err: err?.message }, 'OCR extraction service bypass; using local PDF parser.');
  }

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

// Bare publishers that are NOT publication venues (institutional disambiguation)
const BARE_PUBLISHERS = new Set([
  'ieee',
  'acm',
  'mdpi',
  'springer',
  'elsevier',
  'wiley',
  'taylor & francis',
  'taylor and francis',
  'sage',
  'sage publications',
  'nature publishing group',
  'oxford university press',
  'cambridge university press',
  'frontiers',
  'frontiers media sa',
  'plos',
  'iop publishing',
  'hindawi',
  'springer nature',
  'springer-verlag',
  'elsevier bv',
  'elsevier b.v.',
  'elsevier science',
  'john wiley & sons',
  'john wiley and sons',
  'biomed central',
  'bmc',
  'wolters kluwer',
  'de gruyter',
  'brill',
  'emerald',
  'ios press',
  'world scientific',
  'aip publishing',
  'aps',
  'american chemical society',
  'acs',
  'royal society of chemistry',
  'rsc',
]);

const VENUE_NAME_EXPANSIONS = [
  { pattern: /^remote sens(?:ing)?\.?$/i, canonical: 'Remote Sensing' },
  { pattern: /^appl(?:ied)?\.?\s*sci(?:ences)?\.?$/i, canonical: 'Applied Sciences' },
  {
    pattern: /^proc(?:eedings)?\.?\s*(?:of\s+the\s+)?ieee$/i,
    canonical: 'Proceedings of the IEEE',
  },
  { pattern: /^proc(?:eedings)?\.?\s*acm$/i, canonical: 'Proceedings of the ACM' },
  {
    pattern: /^pami|ieee\s+trans\.?\s+pami$/i,
    canonical: 'IEEE Transactions on Pattern Analysis and Machine Intelligence',
  },
  { pattern: /^jmlr$/i, canonical: 'Journal of Machine Learning Research' },
  { pattern: /^tmlr$/i, canonical: 'Transactions on Machine Learning Research' },
  { pattern: /^pnas$/i, canonical: 'Proceedings of the National Academy of Sciences' },
  { pattern: /^arxiv(?:\s*preprint)?$/i, canonical: 'arXiv' },
  { pattern: /^biorxiv(?:\s*preprint)?$/i, canonical: 'bioRxiv' },
  { pattern: /^medrxiv(?:\s*preprint)?$/i, canonical: 'medRxiv' },
  { pattern: /^ssrn(?:\s*electronic\s*journal)?$/i, canonical: 'SSRN Electronic Journal' },
];

function normalizeVenue(rawVenue) {
  const firstLine = String(rawVenue || '').split(/[\r\n]+/)[0];
  let value = cleanText(firstLine).slice(0, 300);
  if (!value) return '';

  // Strip URLs and DOIs
  value = value.replace(/https?:\/\/\S+/gi, '').replace(/(?:doi\.org|doi:)\s*10\.\S+/gi, '');

  // Strip leading citation or section prefixes (preserve "Proceedings of ...")
  value = value.replace(
    /^(?:in|published in|appeared in|to appear in|presented at|citation:?|journal:?|venue:?)\s*[:\-–—]?\s*/i,
    '',
  );

  // Strip trailing volume, issue, page, year, or citation suffixes
  // e.g. "Remote Sens. 2025, 17, 2529" -> "Remote Sens."
  // e.g. "Journal of ML, vol. 12, pp. 1-20, 2024" -> "Journal of ML"
  value = value.replace(
    /,\s*(?:vol(?:ume)?\.?\s*\d+|no\.?\s*\d+|issue\s*\d+|pp?\.?\s*\d+|\d+\s*,\s*\d+)[\s\S]*$/i,
    '',
  );
  value = value.replace(/\s+(?:19\d{2}|20\d{2})[,\s]+\d+[\s\S]*$/, '');
  value = value.replace(/\s*\(\s*(?:19\d{2}|20\d{2})\s*\)[\s\S]*$/, '');
  value = value.replace(/\s*(?:©|copyright|licensee|all rights reserved)[\s\S]*$/i, '');
  value = value.replace(/\s*(?:e-?issn|issn|isbn)[:\s]+[\d\-xX]+[\s\S]*$/i, '');

  // Strip leading/trailing punctuation and whitespace
  value = value.replace(/^[.,\-–—:;\s]+|[.,\-–—:;\s]+$/g, '').trim();

  // Length guard: allows premier 3-5 character acronyms (ACL, CHI, Cell, ICML, CVPR, AAAI, ICLR, VLDB, arXiv)
  if (value.length < 3 || value.length > 250) return '';

  // Disambiguate venue from bare publishers:
  // A venue is the specific outlet (journal, conference proceedings, preprint server).
  // Publishers (Elsevier, Springer, IEEE, ACM, MDPI) are NOT venues.
  const lowerClean = value.toLowerCase().replace(/[.,]/g, '').trim();
  if (BARE_PUBLISHERS.has(lowerClean)) {
    return '';
  }

  // Reject strings ending in generic publisher terms without academic venue keywords
  // e.g. "Elsevier Science Publishers", "MDPI Publishing", "Springer International Publishing"
  if (
    /\b(publishers?|publishing|press|media\s*sa|group)\b/i.test(value) &&
    !/\b(transactions|journal|proceedings|conference|symposium|letters|advances|series|annals|bulletin|review)\b/i.test(
      value,
    )
  ) {
    return '';
  }

  // Reject physical conference location strings:
  // e.g. "Honolulu, Hawaii, USA", "Basel, Switzerland", "New Orleans, LA"
  const isCityLocation =
    /^[A-Z][a-zA-Z\s.-]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s.-]+)(?:,\s*[A-Z][a-zA-Z\s.-]+)?$/.test(
      value,
    ) &&
    !/\b(journal|conference|proceedings|symposium|workshop|review|letters|transactions|annals|bulletin|advances|sensing|sensors|applied|ieee|acm|nature|science|cell|lancet|arxiv|springer|elsevier|repository|capstone)\b/i.test(
      value,
    );
  if (isCityLocation) {
    return '';
  }

  // Reject pure date/time strings
  if (
    /^(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})[\s\d,\-–—]+(?:19\d{2}|20\d{2})?$/i.test(
      value,
    ) &&
    !/\b(conference|proceedings|journal|symposium|meeting)\b/i.test(value)
  ) {
    return '';
  }

  // Canonical venue expansion
  for (const item of VENUE_NAME_EXPANSIONS) {
    if (item.pattern.test(value)) {
      return item.canonical;
    }
  }

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

function extractCslVenue(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const candidates = [
    Array.isArray(payload['container-title'])
      ? payload['container-title'][0]
      : payload['container-title'],
    Array.isArray(payload['short-container-title'])
      ? payload['short-container-title'][0]
      : payload['short-container-title'],
    Array.isArray(payload['container-title-short'])
      ? payload['container-title-short'][0]
      : payload['container-title-short'],
    payload.event?.name,
    payload.event?.title,
    Array.isArray(payload['collection-title'])
      ? payload['collection-title'][0]
      : payload['collection-title'],
  ];

  for (const candidate of candidates) {
    if (candidate) {
      const normalized = normalizeVenue(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }
  return '';
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
      publicationVenue: extractCslVenue(payload),
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
    logger.warn(
      { title: title.slice(0, 80) },
      'OCR title contains hallucinated prompt text; discarding',
    );
    title = '';
  }

  if (hallucPatterns.some((p) => p.test(abstract))) {
    logger.warn('OCR abstract contains hallucinated prompt text; discarding');
    abstract = '';
  }

  // Reject titles that are clearly too long (contain addresses, emails, affiliations)
  if (
    title.length > 150 ||
    /[@{}+]/.test(title) ||
    /\b(University|Department|School of)\b/i.test(title) ||
    PROCEEDINGS_NOISE_PATTERNS.some((pattern) => pattern.test(title))
  ) {
    logger.warn(
      { titleLen: title.length },
      'OCR title too long or contains institutional data; discarding',
    );
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
      confidence: {
        title: 0,
        abstract: 0,
        publicationYear: 0,
        authors: 0,
        keywords: 0,
        doi: 0,
        publicationVenue: 0,
      },
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
  const abstract = extractAbstract(text, data.info);
  const publicationYear = extractPublicationYear(text, data.info);
  const authors = extractAuthors(text, data.info, title.value);
  const keywords = extractKeywords(text);
  const publicationVenue = extractPublicationVenue(text, data.info);
  const heuristicDoi = normalizeDoi(extractDoi(text));

  const baseResult = {
    title: title.value,
    abstract: abstract.value,
    publicationYear: publicationYear.value,
    authors: authors.value,
    keywords: keywords.value,
    doi: heuristicDoi,
    publicationVenue: publicationVenue.value,
    confidence: {
      title: title.confidence,
      abstract: abstract.confidence,
      publicationYear: publicationYear.confidence,
      authors: authors.confidence,
      keywords: keywords.confidence,
      doi: heuristicDoi ? 0.85 : 0,
      publicationVenue: publicationVenue.confidence,
    },
    extractionProvider: 'heuristic',
    fieldSources: {
      title: 'heuristic',
      abstract: 'heuristic',
      publicationYear: 'heuristic',
      authors: 'heuristic',
      keywords: 'heuristic',
      doi: heuristicDoi ? 'heuristic' : 'none',
      publicationVenue: publicationVenue.value ? 'heuristic' : 'none',
    },
  };

  const isOcrComplete = data.ocrStatus === 'complete';
  if (isOcrComplete) {
    baseResult.extractionProvider = 'paddleocr-vl';
    if (data.info?.Title) baseResult.fieldSources.title = 'paddleocr-vl';
    if (data.info?.Abstract) baseResult.fieldSources.abstract = 'paddleocr-vl';
    if (data.info?.Year) baseResult.fieldSources.publicationYear = 'paddleocr-vl';
    if (data.info?.Author) baseResult.fieldSources.authors = 'paddleocr-vl';
  }

  const doiEnriched = await enrichWithDoiMetadata(baseResult, text);
  const finalized = withReviewGate(doiEnriched);
  setCachedExtraction(cacheKey, finalized);
  return finalized;
}

/**
 * Known journal and conference venue patterns for heuristic extraction.
 */
/**
 * Known journal, conference proceedings, and preprint venue patterns for heuristic extraction.
 * Distinguishes academic venues from publishers (IEEE, ACM, Elsevier, Springer, MDPI) and locations.
 */
const KNOWN_VENUES = [
  // --- Preprint Servers ---
  { pattern: /\b(arxiv:\d{4}\.\d{4,5}(?:v\d+)?|arxiv\s+preprint|\barxiv\b)/i, name: 'arXiv' },
  { pattern: /\b(biorxiv\s+preprint|\bbiorxiv\b)/i, name: 'bioRxiv' },
  { pattern: /\b(medrxiv\s+preprint|\bmedrxiv\b)/i, name: 'medRxiv' },
  { pattern: /\b(ssrn\s+electronic\s+journal|\bssrn\b)/i, name: 'SSRN Electronic Journal' },

  // --- Dynamic Conference Proceedings ---
  {
    pattern:
      /\b(?:in\s+)?(proceedings\s+of\s+(?:the\s+)?(?:\d+(?:st|nd|rd|th)\s+)?(?:annual\s+|international\s+|ieee(?:\/cvf)?\s+|acm\s+)?(?:conference|symposium|workshop|congress|meeting|colloquium|vldb)[^.,\n\r]{0,90})/i,
    transform: (m) => m[1].trim(),
  },
  {
    pattern: /\b(advances\s+in\s+neural\s+information\s+processing\s+systems(?:\s+\d+)?)\b/i,
    name: 'Advances in Neural Information Processing Systems',
  },
  {
    pattern: /\b(lecture\s+notes\s+in\s+computer\s+science(?:\s*\(lncs\))?)\b/i,
    name: 'Lecture Notes in Computer Science',
  },
  {
    pattern: /\b(communications\s+in\s+computer\s+and\s+information\s+science(?:\s*\(ccis\))?)\b/i,
    name: 'Communications in Computer and Information Science',
  },
  {
    pattern: /\b(acm\s+international\s+conference\s+proceeding\s+series(?:\s*\(icps\))?)\b/i,
    name: 'ACM International Conference Proceeding Series',
  },

  // --- Premier AI / ML / CV / NLP / Systems Conferences ---
  {
    pattern: /\b(neurips\s*(?:19\d{2}|20\d{2})?|neural\s+information\s+processing\s+systems)\b/i,
    name: 'NeurIPS',
  },
  {
    pattern:
      /\b(icml\s*(?:19\d{2}|20\d{2})?|international\s+conference\s+on\s+machine\s+learning)\b/i,
    name: 'ICML',
  },
  {
    pattern:
      /\b(iclr\s*(?:19\d{2}|20\d{2})?|international\s+conference\s+on\s+learning\s+representations)\b/i,
    name: 'ICLR',
  },
  {
    pattern:
      /\b(cvpr\s*(?:19\d{2}|20\d{2})?|conference\s+on\s+computer\s+vision\s+and\s+pattern\s+recognition)\b/i,
    name: 'CVPR',
  },
  {
    pattern:
      /\b(iccv\s*(?:19\d{2}|20\d{2})?|international\s+conference\s+on\s+computer\s+vision)\b/i,
    name: 'ICCV',
  },
  {
    pattern: /\b(eccv\s*(?:19\d{2}|20\d{2})?|european\s+conference\s+on\s+computer\s+vision)\b/i,
    name: 'ECCV',
  },
  { pattern: /\b(wacv\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'WACV' },
  { pattern: /\b(bmvc\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'BMVC' },
  {
    pattern: /\b(acl\s*(?:19\d{2}|20\d{2})?|association\s+for\s+computational\s+linguistics)\b/i,
    name: 'ACL',
  },
  {
    pattern:
      /\b(emnlp\s*(?:19\d{2}|20\d{2})?|empirical\s+methods\s+in\s+natural\s+language\s+processing)\b/i,
    name: 'EMNLP',
  },
  { pattern: /\b(naacl\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'NAACL' },
  { pattern: /\b(coling\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'COLING' },
  { pattern: /\b(sigkdd|kdd\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'KDD' },
  {
    pattern: /\b(acm\s+chi\s*(?:19\d{2}|20\d{2})?|chi\s+conference\s+on\s+human\s+factors)\b/i,
    name: 'ACM CHI',
  },
  {
    pattern:
      /\b(aaai\s*(?:19\d{2}|20\d{2})?|aaai\s+conference\s+on\s+artificial\s+intelligence)\b/i,
    name: 'AAAI',
  },
  {
    pattern:
      /\b(ijcai\s*(?:19\d{2}|20\d{2})?|international\s+joint\s+conference\s+on\s+artificial\s+intelligence)\b/i,
    name: 'IJCAI',
  },
  {
    pattern: /\b(vldb\s*(?:19\d{2}|20\d{2})?|proceedings\s+of\s+the\s+vldb\s+endowment|pvldb)\b/i,
    name: 'Proceedings of the VLDB Endowment',
  },
  {
    pattern:
      /\b(icde\s*(?:19\d{2}|20\d{2})?|international\s+conference\s+on\s+data\s+engineering)\b/i,
    name: 'ICDE',
  },
  { pattern: /\b(sigmod\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'ACM SIGMOD' },
  { pattern: /\b(sigir\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'ACM SIGIR' },
  {
    pattern: /\b(the\s+web\s+conference\s*(?:19\d{2}|20\d{2})?|www\s*(?:19\d{2}|20\d{2}))\b/i,
    name: 'The Web Conference',
  },
  { pattern: /\b(wsdm\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'WSDM' },
  { pattern: /\b(recsys\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'ACM RecSys' },
  { pattern: /\b(sigcomm\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'ACM SIGCOMM' },
  { pattern: /\b(usenix\s+security\s*(?:symposium)?)\b/i, name: 'USENIX Security' },
  { pattern: /\b(usenix\s+atc|usenix\s+annual\s+technical\s+conference)\b/i, name: 'USENIX ATC' },
  { pattern: /\b(osdi\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'OSDI' },
  { pattern: /\b(sosp\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'SOSP' },
  {
    pattern: /\b(acm\s+ccs\s*(?:19\d{2}|20\d{2})?|computer\s+and\s+communications\s+security)\b/i,
    name: 'ACM CCS',
  },
  {
    pattern: /\b(ieee\s+s&p\s*(?:19\d{2}|20\d{2})?|symposium\s+on\s+security\s+and\s+privacy)\b/i,
    name: 'IEEE Symposium on Security and Privacy',
  },
  { pattern: /\b(ndss\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'NDSS' },
  {
    pattern:
      /\b(icse\s*(?:19\d{2}|20\d{2})?|international\s+conference\s+on\s+software\s+engineering)\b/i,
    name: 'ICSE',
  },
  { pattern: /\b(esec\/fse|fse\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'ACM ESEC/FSE' },
  {
    pattern: /\b(ase\s*(?:19\d{2}|20\d{2})?|automated\s+software\s+engineering)\b/i,
    name: 'IEEE/ACM ASE',
  },
  { pattern: /\b(issta\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'ACM ISSTA' },
  {
    pattern: /\b(iros\s*(?:19\d{2}|20\d{2})?|intelligent\s+robots\s+and\s+systems)\b/i,
    name: 'IEEE/RSJ IROS',
  },
  { pattern: /\b(icra\s*(?:19\d{2}|20\d{2})?|robotics\s+and\s+automation)\b/i, name: 'IEEE ICRA' },
  {
    pattern: /\b(icassp\s*(?:19\d{2}|20\d{2})?|acoustics,\s+speech\s+and\s+signal\s+processing)\b/i,
    name: 'IEEE ICASSP',
  },
  { pattern: /\b(interspeech\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'INTERSPEECH' },
  {
    pattern: /\b(corl\s*(?:19\d{2}|20\d{2})?|conference\s+on\s+robot\s+learning)\b/i,
    name: 'CoRL',
  },
  { pattern: /\b(aistats\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'AISTATS' },
  { pattern: /\b(uai\s*(?:19\d{2}|20\d{2})?)\b/i, name: 'UAI' },

  // --- Dynamic IEEE / ACM Transactions and Journals ---
  {
    pattern:
      /\b(ieee\/acm\s+transactions\s+on\s+[^\n\r.,:;()]+|ieee\/acm\s+trans\.\s+[^\n\r.,:;()]+)/i,
    transform: (m) => m[0].trim(),
  },
  {
    pattern: /\b(ieee\s+transactions\s+on\s+[^\n\r.,:;()]+|ieee\s+trans\.\s+[^\n\r.,:;()]+)/i,
    transform: (m) => m[0].trim(),
  },
  {
    pattern: /\b(acm\s+transactions\s+on\s+[^\n\r.,:;()]+|acm\s+trans\.\s+[^\n\r.,:;()]+)/i,
    transform: (m) => m[0].trim(),
  },
  { pattern: /\b(proceedings\s+of\s+the\s+ieee)\b/i, name: 'Proceedings of the IEEE' },
  { pattern: /\b(proceedings\s+of\s+the\s+acm)\b/i, name: 'Proceedings of the ACM' },
  { pattern: /\b(ieee\s+access)\b/i, name: 'IEEE Access' },
  {
    pattern: /\b(ieee\s+internet\s+of\s+things\s+journal)\b/i,
    name: 'IEEE Internet of Things Journal',
  },
  { pattern: /\b(ieee\s+computer)\b/i, name: 'IEEE Computer' },
  { pattern: /\b(ieee\s+security\s*&\s*privacy)\b/i, name: 'IEEE Security & Privacy' },
  { pattern: /\b(communications\s+of\s+the\s+acm)\b/i, name: 'Communications of the ACM' },
  { pattern: /\b(acm\s+computing\s+surveys)\b/i, name: 'ACM Computing Surveys' },
  { pattern: /\b(journal\s+of\s+the\s+acm)\b/i, name: 'Journal of the ACM' },

  // --- Multidisciplinary & Nature / Science / Cell / Lancet ---
  { pattern: /\b(nature\s+machine\s+intelligence)\b/i, name: 'Nature Machine Intelligence' },
  { pattern: /\b(nature\s+communications)\b/i, name: 'Nature Communications' },
  { pattern: /\b(nature\s+biotechnology)\b/i, name: 'Nature Biotechnology' },
  { pattern: /\b(nature\s+methods)\b/i, name: 'Nature Methods' },
  { pattern: /\b(nature\s+medicine)\b/i, name: 'Nature Medicine' },
  { pattern: /\b(nature\s+electronics)\b/i, name: 'Nature Electronics' },
  { pattern: /\b(nature\s+neuroscience)\b/i, name: 'Nature Neuroscience' },
  { pattern: /\b(scientific\s+reports)\b/i, name: 'Scientific Reports' },
  { pattern: /\b(nature)\b/i, name: 'Nature' },
  { pattern: /\b(science\s+advances)\b/i, name: 'Science Advances' },
  { pattern: /\b(science\s+robotics)\b/i, name: 'Science Robotics' },
  { pattern: /\b(science\s+translational\s+medicine)\b/i, name: 'Science Translational Medicine' },
  { pattern: /\b(science)\b/i, name: 'Science' },
  { pattern: /\b(cell\s+reports)\b/i, name: 'Cell Reports' },
  { pattern: /\b(cell)\b/i, name: 'Cell' },
  { pattern: /\b(the\s+lancet\s+digital\s+health)\b/i, name: 'The Lancet Digital Health' },
  { pattern: /\b(the\s+lancet)\b/i, name: 'The Lancet' },
  {
    pattern: /\b(proceedings\s+of\s+the\s+national\s+academy\s+of\s+sciences|pnas)\b/i,
    name: 'Proceedings of the National Academy of Sciences',
  },
  {
    pattern: /\b(journal\s+of\s+machine\s+learning\s+research|jmlr)\b/i,
    name: 'Journal of Machine Learning Research',
  },
  {
    pattern: /\b(transactions\s+on\s+machine\s+learning\s+research|tmlr)\b/i,
    name: 'Transactions on Machine Learning Research',
  },
  { pattern: /\b(plos\s+computational\s+biology)\b/i, name: 'PLOS Computational Biology' },
  { pattern: /\b(plos\s+one)\b/i, name: 'PLOS ONE' },
  { pattern: /\b(bioinformatics)\b/i, name: 'Bioinformatics' },
  { pattern: /\b(briefings\s+in\s+bioinformatics)\b/i, name: 'Briefings in Bioinformatics' },
  { pattern: /\b(nucleic\s+acids\s+research)\b/i, name: 'Nucleic Acids Research' },
  { pattern: /\b(elife)\b/i, name: 'eLife' },

  // --- MDPI Peer-Reviewed Journals ---
  { pattern: /\b(remote sens(?:ing)?\.?)\b/i, name: 'Remote Sensing' },
  { pattern: /\b(sensors\.?)\b/i, name: 'Sensors' },
  { pattern: /\b(applied sciences|appl\. sci\.)\b/i, name: 'Applied Sciences' },
  { pattern: /\b(sustainability)\b/i, name: 'Sustainability' },
  { pattern: /\b(electronics)\b/i, name: 'Electronics' },
  { pattern: /\b(energies)\b/i, name: 'Energies' },
  { pattern: /\b(materials)\b/i, name: 'Materials' },
  { pattern: /\b(atmosphere)\b/i, name: 'Atmosphere' },
  { pattern: /\b(water)\b/i, name: 'Water' },
  { pattern: /\b(forests)\b/i, name: 'Forests' },
  { pattern: /\b(agronomy)\b/i, name: 'Agronomy' },
  { pattern: /\b(information)\b/i, name: 'Information' },
  { pattern: /\b(future\s+internet)\b/i, name: 'Future Internet' },
  { pattern: /\b(algorithms)\b/i, name: 'Algorithms' },
  { pattern: /\b(computers)\b/i, name: 'Computers' },
  { pattern: /\b(drones)\b/i, name: 'Drones' },
  {
    pattern: /\b(isprs\s+int(?:ernational)?\.\s*j\.\s*geo-inf(?:ormation)?\.?)\b/i,
    name: 'ISPRS International Journal of Geo-Information',
  },
  { pattern: /\b(healthcare)\b/i, name: 'Healthcare' },
  { pattern: /\b(genes)\b/i, name: 'Genes' },
  { pattern: /\b(viruses)\b/i, name: 'Viruses' },
  { pattern: /\b(nutrients)\b/i, name: 'Nutrients' },
  { pattern: /\b(molecules)\b/i, name: 'Molecules' },
  { pattern: /\b(cancers)\b/i, name: 'Cancers' },
  { pattern: /\b(diagnostics)\b/i, name: 'Diagnostics' },
  { pattern: /\b(axioms)\b/i, name: 'Axioms' },
  { pattern: /\b(smart\s+cities)\b/i, name: 'Smart Cities' },

  // --- Elsevier / Springer / Wiley Computer Science Journals ---
  { pattern: /\b(pattern\s+recognition)\b/i, name: 'Pattern Recognition' },
  { pattern: /\b(information\s+sciences)\b/i, name: 'Information Sciences' },
  { pattern: /\b(neurocomputing)\b/i, name: 'Neurocomputing' },
  { pattern: /\b(artificial\s+intelligence)\b/i, name: 'Artificial Intelligence' },
  {
    pattern: /\b(computer\s+vision\s+and\s+image\s+understanding)\b/i,
    name: 'Computer Vision and Image Understanding',
  },
  {
    pattern: /\b(expert\s+systems\s+with\s+applications)\b/i,
    name: 'Expert Systems with Applications',
  },
  { pattern: /\b(knowledge-based\s+systems)\b/i, name: 'Knowledge-Based Systems' },
  { pattern: /\b(computers\s*&\s*security)\b/i, name: 'Computers & Security' },
  { pattern: /\b(signal\s+processing)\b/i, name: 'Signal Processing' },
  {
    pattern: /\b(journal\s+of\s+systems\s+and\s+software)\b/i,
    name: 'Journal of Systems and Software',
  },
  {
    pattern: /\b(information\s+and\s+software\s+technology)\b/i,
    name: 'Information and Software Technology',
  },
  { pattern: /\b(machine\s+learning)\b/i, name: 'Machine Learning' },
  {
    pattern: /\b(international\s+journal\s+of\s+computer\s+vision|ijcv)\b/i,
    name: 'International Journal of Computer Vision',
  },
  {
    pattern: /\b(neural\s+computing\s+and\s+applications)\b/i,
    name: 'Neural Computing and Applications',
  },
  { pattern: /\b(autonomous\s+robots)\b/i, name: 'Autonomous Robots' },
  {
    pattern: /\b(data\s+mining\s+and\s+knowledge\s+discovery)\b/i,
    name: 'Data Mining and Knowledge Discovery',
  },
  { pattern: /\b(world\s+wide\s+web)\b/i, name: 'World Wide Web' },
  {
    pattern: /\b(multimedia\s+tools\s+and\s+applications)\b/i,
    name: 'Multimedia Tools and Applications',
  },

  // --- Institutional Capstone Repository ---
  {
    pattern: /\b(buksu\s+capstone\s+repository|buksu\s+capstone\s+proceedings)\b/i,
    name: 'BukSU Capstone Proceedings',
  },
  { pattern: /\b(bukidnon\s+state\s+university)\b/i, name: 'Bukidnon State University' },

  // --- General Journal Of Pattern ---
  {
    pattern: /\b(journal\s+of\s+[^\n\r.,:;()]+)/i,
    transform: (m) => m[0].split(/\s+(?:vol|volume|\d{4})/i)[0].trim(),
  },
];

function extractPublicationVenue(text, pdfInfo) {
  // Check embedded PDF catalog metadata
  const catalogCandidate =
    pdfInfo?.Journal || pdfInfo?.journal || pdfInfo?.Venue || pdfInfo?.venue || pdfInfo?.booktitle;
  if (catalogCandidate) {
    const normalized = normalizeVenue(catalogCandidate);
    if (normalized) {
      return { value: normalized, confidence: 0.9 };
    }
  }

  // Look in the first 4500 characters
  const headerText = text.slice(0, 4500);

  // Check known venue definitions (journals, proceedings, preprints)
  for (const item of KNOWN_VENUES) {
    const match = headerText.match(item.pattern);
    if (match) {
      const rawName =
        item.name || (typeof item.transform === 'function' ? item.transform(match) : match[0]);
      const normalized = normalizeVenue(rawName);
      if (normalized) {
        return { value: normalized, confidence: 0.88 };
      }
    }
  }

  // Match formal citation line venue: e.g., "Citation: Sun, Z. et al. Remote Sens. 2025, 17, 2529."
  const formalCitationMatch = headerText.match(
    /(?:citation\s*:\s*[^\n]+?\.\s*)([A-Z][a-zA-Z.\s]{2,50}?)\s+(?:19\d{2}|20\d{2})\s*,\s*\d+/i,
  );
  if (formalCitationMatch && formalCitationMatch[1]) {
    const raw = cleanText(formalCitationMatch[1]);
    const normalized = normalizeVenue(raw);
    if (normalized) {
      return { value: normalized, confidence: 0.85 };
    }
  }

  // General citation line venue: e.g., "Remote Sens. 2025, 17, 2529" or "Sensors 2024, 24, 1234"
  const citationVenueMatch = headerText.match(
    /\.\s*([A-Z][a-zA-Z.\s]{2,40}?)\s+(19\d{2}|20\d{2})\s*,\s*\d+/,
  );
  if (citationVenueMatch && citationVenueMatch[1]) {
    const raw = cleanText(citationVenueMatch[1]);
    const normalized = normalizeVenue(raw);
    if (normalized) {
      return { value: normalized, confidence: 0.78 };
    }
  }

  return { value: '', confidence: 0 };
}

/**
 * Extracts DOI from text.
 */
function extractDoi(text) {
  // First check header area (first 4000 characters) to avoid matching reference citations
  const headerChunk = text.slice(0, 4000);
  const headerMatch = headerChunk.match(/\b(10\.\d{4,}(?:\.\d+)*\/[^\s,;]+)/i);
  if (headerMatch && headerMatch[1]) {
    return headerMatch[1].replace(/[.)>]+$/, '');
  }

  // Fallback: full document
  const match = text.match(/\b(10\.\d{4,}(?:\.\d+)*\/[^\s,;]+)/i);
  if (match && match[1]) {
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

  // Strategy 1: Look for title before "Abstract" section (scanning up to 60 lines before abstract)
  const abstractIndex = findSectionIndex(lines, ['abstract', 'ABSTRACT']);
  if (abstractIndex > 0) {
    const candidateLines = lines.slice(0, Math.min(abstractIndex, 60));
    const title = findTitleFromLines(candidateLines);
    if (title) {
      logger.debug({ source: 'before-abstract', title }, 'Title before abstract');
      return { value: title, confidence: 0.8 };
    }
  }

  // Strategy 2: First substantial line that looks like a title
  for (let i = 0; i < Math.min(40, lines.length); i++) {
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
  const firstLines = lines.slice(0, 10);
  const multiLineTitle = findMultiLineTitle(firstLines);
  if (multiLineTitle) {
    logger.debug({ source: 'multi-line', title: multiLineTitle }, 'Multi-line title');
    return { value: multiLineTitle, confidence: 0.5 };
  }

  return { value: '', confidence: 0 };
}

/**
 * Extracts abstract from PDF text or OCR metadata.
 */
function extractAbstract(text, pdfInfo = null) {
  if (
    pdfInfo?.Abstract &&
    typeof pdfInfo.Abstract === 'string' &&
    pdfInfo.Abstract.trim().length > 20
  ) {
    return { value: cleanText(pdfInfo.Abstract), confidence: 0.88 };
  }

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

  const fromInfo =
    findValidYear(pdfInfo?.Year) ||
    findValidYear(pdfInfo?.CreationDate) ||
    findValidYear(pdfInfo?.ModDate);
  if (fromInfo) {
    return { value: fromInfo, confidence: 0.9 };
  }

  const firstChunk = text.slice(0, 6000);
  const preferredPatterns = [
    /\b(?:published|publication|accepted|copyright|©|received|revised|citation)[\s\S]{0,40}?\b(19\d{2}|20\d{2})\b/gi,
    /\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(19\d{2}|20\d{2})\b/gi,
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+(19\d{2}|20\d{2})\b/gi,
    /\b(19\d{2}|20\d{2})\b(?=\s*(?:ieee|acm|springer|elsevier|wiley|journal|conference))/gi,
    /\b(?:remote sens\.|sensors|ieee|mdpi|springer|nature|acm)[^\n\d]{0,20}\b(19\d{2}|20\d{2})\b/gi,
    /\.\s*[A-Z][a-zA-Z.\s]{2,40}?\s+(19\d{2}|20\d{2})\s*,\s*\d+/g,
  ];

  for (const pattern of preferredPatterns) {
    let match;
    while ((match = pattern.exec(firstChunk)) !== null) {
      const candidate = Number(match[1]);
      if (candidate >= 1900 && candidate <= currentYear + 1) {
        return { value: candidate, confidence: 0.85 };
      }
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
    return { value: sortedCandidates[0][0], confidence: 0.65 };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extracts author names from PDF metadata and title-page lines.
 */
function extractAuthors(text, pdfInfo, detectedTitle = '') {
  const fromInfo = normalizeAuthors(pdfInfo?.Author);
  if (fromInfo.length > 0) {
    return { value: fromInfo, confidence: 0.9 };
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);

  const abstractIdx = lines.findIndex((line) => /^abstract\b/i.test(line));
  const maxIndex = abstractIdx > 0 ? abstractIdx : Math.min(lines.length, 35);
  const candidateWindow = lines.slice(0, maxIndex);

  const candidates = [];
  for (const line of candidateWindow) {
    if (line.length < 5 || line.length > 300) continue;

    // Skip title line if known
    if (detectedTitle && (line.includes(detectedTitle) || detectedTitle.includes(line))) {
      continue;
    }

    // Skip citation block lines, lines with semicolons, or lines that overlap with title fragments
    if (
      line.includes(';') ||
      /^[A-Z]\.;/i.test(line) ||
      /^citation[:\s]/i.test(line) ||
      /\b(university|college|department|faculty|school|journal|conference|doi|abstract|institute|ministry|center|centre|laboratory|licensee|mdpi|copyright|editor|citation|correspondence)\b/i.test(
        line,
      )
    ) {
      continue;
    }

    if (detectedTitle && detectedTitle.toLowerCase().includes(line.toLowerCase())) {
      continue;
    }

    if (/^\d+\s+[A-Za-z]/.test(line)) {
      // Affiliation line like "1 Institute of ..."
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

  const deduped = Array.from(new Set(candidates)).slice(0, 8);
  if (deduped.length > 0) {
    return { value: deduped, confidence: 0.85 };
  }

  return { value: [], confidence: 0 };
}

/**
 * Extracts keywords from a dedicated keywords section.
 */
function extractKeywords(text) {
  const match =
    text.match(
      /(?:^|\n)\s*(?:keywords?|index\s*terms?)\s*[:-]?\s*([\s\S]{3,600}?)(?=\n\s*(?:1\.|1\s|i\.|introduction|background|\n\s*\n))/i,
    ) || text.match(/(?:^|\n)\s*(?:keywords?|index\s*terms?)\s*[:-]?\s*([^\n]{3,400})/i);

  if (!match || !match[1]) {
    return { value: [], confidence: 0 };
  }

  const rawKeywords = match[1].replace(/[\r\n]+/g, ' ');
  const parsed = rawKeywords
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

  // Strip footnote superscripts / affiliation numbers / markers (e.g., " 1", " 2", " 3,*", " 1,2", " *", " †", etc.)
  clean = clean.replace(/\s+\d+(?:[,\s-]+\d+)*(?:\*|†|‡|§)?/g, '');
  clean = clean.replace(/[*†‡§#]+/g, '');
  clean = clean.replace(/[\s\d,*†‡§#]+$/g, '');

  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  // Strip leading/trailing dots and spaces
  clean = clean.replace(/^[.,\s-]+|[.,\s-]+$/g, '');
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

  // Check for institutional / publishing keywords using word boundaries to avoid false positives
  if (
    /\b(university|college|department|faculty|school|institute|lab|laboratory|division|center|centre|academy|corporation|company|journal|conference|research|press|publisher|media|foundation|society|association|ltd|inc|corp|llc|gmbh|sarl|pty|pvt|kingdom|france|germany|united|states|america|canada|country|state|province|city|town|district|article|original|paper|review|volume|issue|published|accepted|submitted|copyright|licensee|mdpi|basel|switzerland|remote|sens|sensing|springer|nature|elsevier|ieee|acm|creative|commons|open|access|all\s+rights|reserved|editor|academic|editorial|board|citation|correspondence)\b/i.test(
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
  // Skip common header elements and editorial noise
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
    /^received[:\s]/i,
    /^revised[:\s]/i,
    /^accepted[:\s]/i,
    /^published[:\s]/i,
    /\.\s*c©/, // copyright markers in venue lines
    /association\s+for\s+computational/i,
    /^[A-Z][a-z]+,\s*[A-Z][a-z]+,\s/, // City, State/Country patterns (venue lines)
    /^\w+\s+\d{1,2}[-–]\d{1,2},\s*\d{4}/, // Date ranges like "June 4-5, 2015"
    /\(\d{4}\)\s*\d+:\d+[-–]?\d*/, // Journal headers like "(2025) 16:310–325" or "59:257"
    /^[A-Za-z\s.,]+(?:University|Department|Institute|Faculty|School)\b/i, // Affiliation lines
    /^academic\s+editor/i,
    /^editor[s]?[:\s]/i,
    /^citation[:\s]/i,
    /^how\s+to\s+cite/i,
    /^cite\s+as/i,
    /^licensee\s+/i,
    /^this\s+article\s+is/i,
    /^distributed\s+under/i,
    /^conditions\s+of\s+the/i,
    /^attribution\s+/i,
    /^creative\s+commons/i,
    /^article$/i,
    /^brief\s+report$/i,
    /^communication$/i,
    /^correspondence[:\s]/i,
    /^\d+\s+(institute|department|school|college|university|center|centre|ministry|co\.,?\s*ltd|laboratory)/i,
    /^https?:\/\//i,
    /^e-?mail[:\s]/i,
    /^orcid/i,
    /^conflict\s+of\s+interest/i,
    /^disclaimer/i,
    /^publisher['’]?s\s+note/i,
    /^[A-Z]\.;/i, // Citation author abbreviation line fragments
  ];

  // Pass 0: Anchor on article type markers (e.g. "Article", "Research Article", "Original Paper")
  // Often appearing immediately preceding the actual manuscript title
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (
      /^(?:article|research\s+article|review|review\s+article|original\s+article|original\s+paper|full\s+length\s+article|regular\s+paper)$/i.test(
        line.trim(),
      )
    ) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && nextLine.length >= 10 && !skipPatterns.some((p) => p.test(nextLine))) {
        let candidate = nextLine;
        for (let j = i + 2; j < Math.min(i + 4, lines.length); j++) {
          const contLine = lines[j]?.trim();
          if (!contLine || contLine.length < 3) break;
          if (skipPatterns.some((p) => p.test(contLine))) break;
          if (/^(?:by|abstract|introduction|keywords)/i.test(contLine)) break;
          // Stop if next line has author indicators
          if ((contLine.match(/,/g) || []).length >= 2 || /\b(and|&)\b/i.test(contLine)) break;
          if (contLine.length <= 120 && !contLine.endsWith('.')) {
            candidate = `${candidate} ${contLine}`;
          } else {
            break;
          }
        }
        const cleaned = cleanText(candidate);
        if (cleaned.length >= 10 && cleaned.length <= 300) {
          return cleaned;
        }
      }
    }
  }

  // First pass: find the first title candidate line
  let titleStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 10 || line.length > 300) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;

    // Check if it's a strong title candidate (title case) OR it's the very first non-skipped line
    // and looks like a sentence-case title (not an author list).
    const isStrongCandidate = isTitleCandidate(line);
    const isSentenceCaseCandidate =
      line.length > 15 &&
      line.split(' ').length >= 3 &&
      !/\b(and|&)\b/i.test(line) &&
      !/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*[,·]/.test(line);

    if (isStrongCandidate || isSentenceCaseCandidate) {
      // Reject if it's clearly an author list with special markers
      if (/[\u00B7\u2022\u25E6\u2043\u2219]|([A-Za-z]+)\d+/.test(line)) continue;
      titleStartIdx = i;
      break;
    }
  }

  if (titleStartIdx === -1) return null;

  // Second pass: check if the next line is a continuation of the title
  let title = cleanText(lines[titleStartIdx]);
  for (let j = titleStartIdx + 1; j < Math.min(titleStartIdx + 3, lines.length); j++) {
    const nextLine = lines[j];
    if (!nextLine || nextLine.length < 3) break;
    // Stop if next line looks like authors, affiliation, abstract, etc.
    if (
      /^(by|author|department|university|college|school|faculty|abstract|introduction)/i.test(
        nextLine,
      )
    )
      break;
    if (/[@{}]/.test(nextLine)) break; // email or affiliation
    if (/^\d+$/.test(nextLine)) break; // page number
    if (skipPatterns.some((p) => p.test(nextLine))) break;
    // Reject if it's clearly an author list with special markers
    if (/[\u00B7\u2022\u25E6\u2043\u2219]|\b([A-Za-z]+)[1-9]\b/.test(nextLine)) break;
    // Stop if the next line contains any comma (authors or affiliations)
    if (nextLine.includes(',')) break;
    // Stop if next line has "and" / "&" without core title domain keywords (likely author list)
    if (
      /\b(and|&)\b/i.test(nextLine) &&
      !/\b(system|library|network|model|data|analysis|detection|method|approach|segmentation|adaptation|framework|deep|learning|theory|applications|design|study)\b/i.test(
        nextLine,
      )
    )
      break;

    // Stop if next line looks like a list of names
    const isNameList =
      /^([A-Z][a-z]+|van|der|de|la|von|da)(\s+([A-Z][a-z]+|van|der|de|la|von|da)){0,5}\s*$/i.test(
        nextLine,
      );
    const hasTitleWords =
      /\b(system|library|network|model|data|analysis|detection|method|approach|segmentation|adaptation|framework|deep|learning)\b/i.test(
        nextLine,
      );
    if (isNameList && !/\b(for|and|the|in|of|on|a|an|with|by)\b/i.test(nextLine) && !hasTitleWords)
      break;

    // If next line is short-ish, title-cased, and no period at end, it's likely title continuation
    if (nextLine.length <= 100 && isTitleCandidate(nextLine)) {
      title = cleanText(title + ' ' + nextLine);
      continue;
    }
    // Join if next line is lowercase continuation (e.g. "of Aerial Images")
    if (nextLine.length < 60 && /^[a-z]/.test(nextLine) && !title.endsWith('.')) {
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
  if (
    /^[A-Z][a-z]+,\s*[A-Z][a-z]+,\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(
      line,
    )
  )
    return false;

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
