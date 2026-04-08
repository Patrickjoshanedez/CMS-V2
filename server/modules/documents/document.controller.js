import documentService from './document.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';
import { extractPdfMetadata } from '../../utils/pdfMetadataExtractor.js';
import AppError from '../../utils/AppError.js';

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
 * Extracts title and abstract from an uploaded PDF file.
 * Expects multipart/form-data with a single 'file' field.
 */
export const extractPdfMetadataHandler = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No PDF file provided.', 400, 'MISSING_FILE');
  }

  const effectiveMime = req.file.validatedMime || req.file.mimetype;
  if (effectiveMime !== 'application/pdf') {
    throw new AppError('Only PDF files are supported.', 400, 'INVALID_FILE_TYPE');
  }

  const { title, abstract, confidence } = await extractPdfMetadata(req.file.buffer);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      title,
      abstract,
      confidence,
    },
  });
});
