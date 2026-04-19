import documentService from './document.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';
import { extractPdfMetadata as extractMetadataFromPdf } from '../../utils/pdfMetadataExtractor.js';
import AppError from '../../utils/AppError.js';
import crypto from 'crypto';

const OCR_CACHE_TTL_MS = 10 * 60 * 1000;
const ocrExtractionCache = new Map();

const buildPdfCacheKey = (fileBuffer, originalName = '') => {
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return `${hash}:${String(originalName).toLowerCase()}`;
};

const getCachedOcrResult = (cacheKey) => {
  const cached = ocrExtractionCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() >= cached.expiresAt) {
    ocrExtractionCache.delete(cacheKey);
    return null;
  }

  return cached.result;
};

const setCachedOcrResult = (cacheKey, result) => {
  ocrExtractionCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + OCR_CACHE_TTL_MS,
  });
};

const normalizeConfidencePercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num <= 1) return Math.round(num * 100);
  return Math.max(0, Math.min(100, Math.round(num)));
};

const inferTitleFromFilename = (filename = '') => {
  const withoutExtension = String(filename).replace(/\.[^.]+$/, '');
  const normalized = withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!normalized || normalized.length < 6) return '';
  return normalized.slice(0, 220);
};

/** POST /api/documents/projects/:projectId/manuscripts */
export const uploadManuscript = catchAsync(async (req, res) => {
  const { manuscript } = await documentService.uploadManuscript(
    req.user._id,
    req.params.projectId,
    req.body,
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Manuscript link submitted successfully.',
    data: { manuscript },
  });
});

/** GET /api/documents/projects/:projectId/manuscripts */
export const listProjectManuscripts = catchAsync(async (req, res) => {
  const { manuscripts, pagination } = await documentService.listProjectManuscripts(
    req.user._id,
    req.params.projectId,
    req.query,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { manuscripts, pagination },
  });
});

/** GET /api/documents/projects/:projectId/manuscripts/:documentType/open-link */
export const getOpenLink = catchAsync(async (req, res) => {
  const { manuscript, openLink, mode } = await documentService.getOpenLink(
    req.user._id,
    req.params.projectId,
    req.params.documentType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      manuscript,
      openLink,
      mode,
    },
  });
});

/** POST /api/documents/projects/:projectId/manuscripts/:documentType/sync-permissions */
export const syncPermissions = catchAsync(async (req, res) => {
  const { manuscript } = await documentService.syncPermissions(
    req.user._id,
    req.params.projectId,
    req.params.documentType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Manuscript permissions snapshot synchronized successfully.',
    data: { manuscript },
  });
});

/** POST /api/documents/projects/:projectId/manuscripts/:documentType/submit-review */
export const submitReview = catchAsync(async (req, res) => {
  const { manuscript } = await documentService.submitReview(
    req.user._id,
    req.params.projectId,
    req.params.documentType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Review submitted successfully.',
    data: { manuscript },
  });
});

/** POST /api/documents/projects/:projectId/manuscripts/:documentType/sync-comments */
export const syncComments = catchAsync(async (req, res) => {
  const { manuscript } = await documentService.syncComments(
    req.user._id,
    req.params.projectId,
    req.params.documentType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Archived comments synchronized successfully.',
    data: { manuscript },
  });
});

/** GET /api/documents/projects/:projectId/manuscripts/:documentType/comments */
export const getArchivedComments = catchAsync(async (req, res) => {
  const result = await documentService.getArchivedComments(
    req.user._id,
    req.params.projectId,
    req.params.documentType,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/documents/extract-pdf-metadata
 * Extracts title, abstract, publication year, authors, and keywords from an uploaded PDF file.
 * Expects multipart/form-data with a single 'file' field.
 */
export const extractPdfMetadata = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No PDF file provided.', 400, 'MISSING_FILE');
  }

  const effectiveMime = req.file.validatedMime || req.file.mimetype;
  if (effectiveMime !== 'application/pdf') {
    throw new AppError('Only PDF files are supported.', 400, 'INVALID_FILE_TYPE');
  }

  const cacheKey = buildPdfCacheKey(req.file.buffer, req.file.originalname);
  const cached = getCachedOcrResult(cacheKey);
  if (cached) {
    return res.status(HTTP_STATUS.OK).json(cached);
  }

  try {
    const extractionResult = await extractMetadataFromPdf(req.file.buffer);

    const inferredTitleFromFilename = inferTitleFromFilename(req.file.originalname);
    const effectiveTitle = extractionResult?.title || inferredTitleFromFilename;

    const authors = Array.isArray(extractionResult?.authors)
      ? extractionResult.authors.join(', ')
      : extractionResult?.authors || '';

    const keywords = Array.isArray(extractionResult?.keywords)
      ? extractionResult.keywords.join(', ')
      : extractionResult?.keywords || '';

    const rawConfidence = extractionResult?.confidence || {};

    const payload = {
      metadata: {
        title: effectiveTitle || '',
        abstract: extractionResult?.abstract || '',
        authors,
        year: extractionResult?.publicationYear ? String(extractionResult.publicationYear) : '',
        doi: extractionResult?.doi || '',
        venue: extractionResult?.publicationVenue || '',
        keywords,
      },
      confidence: {
        title: effectiveTitle
          ? extractionResult?.title
            ? normalizeConfidencePercent(rawConfidence.title)
            : 35
          : 0,
        abstract: normalizeConfidencePercent(rawConfidence.abstract),
        authors: normalizeConfidencePercent(rawConfidence.authors),
        year: normalizeConfidencePercent(rawConfidence.publicationYear),
        doi: normalizeConfidencePercent(rawConfidence.doi),
        venue: normalizeConfidencePercent(rawConfidence.publicationVenue),
        keywords: normalizeConfidencePercent(rawConfidence.keywords),
      },
    };

    setCachedOcrResult(cacheKey, payload);
    return res.status(HTTP_STATUS.OK).json(payload);
  } catch {
    throw new AppError(
      'Failed to extract metadata from PDF.',
      500,
      'PDF_METADATA_EXTRACTION_FAILED',
    );
  }
});

export const extractPdfMetadataHandler = extractPdfMetadata;
