/**
 * SubmissionController — Thin handlers delegating to SubmissionService.
 *
 * Each handler:
 *  1. Extracts data from req (params, body, user, file)
 *  2. Delegates to the service layer
 *  3. Returns a consistent JSON response
 *
 * All handlers are wrapped in catchAsync for automatic error forwarding.
 */
import submissionService from './submission.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';

/* ═══════════════════ Upload ═══════════════════ */

/** POST /api/submissions/:projectId/chapters — Upload a chapter draft */
export const uploadChapter = catchAsync(async (req, res) => {
  const { submission } = await submissionService.uploadChapter(
    req.user._id,
    req.params.projectId,
    req.body,
    req.file,
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Chapter uploaded successfully.',
    data: { submission },
  });
});

/* ═══════════════════ Read ═══════════════════ */

/** GET /api/submissions/:submissionId — Get a single submission */
export const getSubmission = catchAsync(async (req, res) => {
  const { submission } = await submissionService.getSubmission(req.params.submissionId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { submission },
  });
});

/** GET /api/submissions/project/:projectId — List submissions for a project */
export const getSubmissionsByProject = catchAsync(async (req, res) => {
  const { submissions, pagination } = await submissionService.getSubmissionsByProject(
    req.params.projectId,
    req.query,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { submissions, pagination },
  });
});

/** GET /api/submissions/project/:projectId/chapters/:chapter — Chapter version history */
export const getChapterHistory = catchAsync(async (req, res) => {
  const { submissions } = await submissionService.getChapterHistory(
    req.params.projectId,
    Number(req.params.chapter),
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { submissions },
  });
});

/** GET /api/submissions/project/:projectId/chapters/:chapter/latest — Latest version of a chapter */
export const getLatestChapterSubmission = catchAsync(async (req, res) => {
  const { submission } = await submissionService.getLatestChapterSubmission(
    req.params.projectId,
    Number(req.params.chapter),
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { submission },
  });
});

/* ═══════════════════ Signed URL ═══════════════════ */

/** GET /api/submissions/:submissionId/view — Get pre-signed URL for document viewing */
export const getViewUrl = catchAsync(async (req, res) => {
  const { url, expiresIn } = await submissionService.getViewUrl(req.params.submissionId);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { url, expiresIn },
  });
});

/* ═══════════════════ Review ═══════════════════ */

/** POST /api/submissions/:submissionId/review — Review a submission (faculty) */
export const reviewSubmission = catchAsync(async (req, res) => {
  const { submission } = await submissionService.reviewSubmission(
    req.params.submissionId,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Submission reviewed successfully.',
    data: { submission },
  });
});

/* ═══════════════════ Unlock ═══════════════════ */

/** POST /api/submissions/:submissionId/unlock — Unlock a locked submission (adviser) */
export const unlockSubmission = catchAsync(async (req, res) => {
  const { submission } = await submissionService.unlockSubmission(
    req.params.submissionId,
    req.user._id,
    req.body.reason,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Submission unlocked.',
    data: { submission },
  });
});

/* ═══════════════════ Annotations ═══════════════════ */

/** POST /api/submissions/:submissionId/annotations — Add an annotation */
export const addAnnotation = catchAsync(async (req, res) => {
  const { submission } = await submissionService.addAnnotation(
    req.params.submissionId,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Annotation added.',
    data: { submission },
  });
});

/** DELETE /api/submissions/:submissionId/annotations/:annotationId — Remove an annotation */
export const removeAnnotation = catchAsync(async (req, res) => {
  const { submission } = await submissionService.removeAnnotation(
    req.params.submissionId,
    req.params.annotationId,
    req.user._id,
    req.user.role,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Annotation removed.',
    data: { submission },
  });
});
