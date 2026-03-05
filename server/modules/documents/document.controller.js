import documentService from './document.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

/**
 * DocumentController — Thin handlers delegating to DocumentService.
 */

/* ════════════════ Templates (Instructor) ════════════════ */

/** POST /api/documents/templates */
export const createTemplate = catchAsync(async (req, res) => {
  const { template } = await documentService.createTemplate(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Template registered successfully.',
    data: { template },
  });
});

/** GET /api/documents/templates */
export const listTemplates = catchAsync(async (req, res) => {
  const { templates } = await documentService.listTemplates(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { templates },
  });
});

/** GET /api/documents/templates/:id */
export const getTemplate = catchAsync(async (req, res) => {
  const { template } = await documentService.getTemplate(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { template },
  });
});

/** PATCH /api/documents/templates/:id */
export const updateTemplate = catchAsync(async (req, res) => {
  const { template } = await documentService.updateTemplate(req.params.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Template updated.',
    data: { template },
  });
});

/** DELETE /api/documents/templates/:id */
export const deleteTemplate = catchAsync(async (req, res) => {
  const result = await documentService.deleteTemplate(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: result.message,
  });
});

/* ════════════════ Project Documents ════════════════ */

/** POST /api/documents/projects/:projectId/generate */
export const generateDocument = catchAsync(async (req, res) => {
  const { document } = await documentService.generateDocument(
    req.user._id,
    req.params.projectId,
    req.body,
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Document generated successfully.',
    data: { document },
  });
});

/** GET /api/documents/projects/:projectId */
export const listProjectDocuments = catchAsync(async (req, res) => {
  const { documents } = await documentService.listProjectDocuments(
    req.user._id,
    req.params.projectId,
    req.query,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { documents },
  });
});

/** GET /api/documents/projects/:projectId/:docId */
export const getProjectDocument = catchAsync(async (req, res) => {
  const { document } = await documentService.getProjectDocument(
    req.user._id,
    req.params.projectId,
    req.params.docId,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { document },
  });
});

/** DELETE /api/documents/projects/:projectId/:docId */
export const deleteProjectDocument = catchAsync(async (req, res) => {
  const result = await documentService.deleteProjectDocument(
    req.user._id,
    req.params.projectId,
    req.params.docId,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: result.message,
  });
});
