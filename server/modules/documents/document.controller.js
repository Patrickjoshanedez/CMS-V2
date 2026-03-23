import documentService from './document.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

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
  const { manuscripts } = await documentService.listProjectManuscripts(req.user._id, req.params.projectId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { manuscripts },
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
