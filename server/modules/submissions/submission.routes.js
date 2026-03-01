/**
 * Submission routes — /api/submissions
 *
 * All routes require authentication.
 * File uploads use multer (memory storage) + magic-byte validation.
 *
 * Route groups:
 *  - Student: upload chapters, view own submissions
 *  - Faculty: review, annotate, unlock
 *  - Shared: get submission, list by project, chapter history, view URL
 */
import { Router } from 'express';
import * as submissionController from './submission.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import upload from '../../middleware/upload.js';
import validateFile from '../../middleware/fileValidation.js';
import { ROLES } from '@cms/shared';
import {
  projectIdParamSchema,
  submissionIdParamSchema,
  projectChapterParamSchema,
  submissionAnnotationParamSchema,
  uploadChapterSchema,
  compileProposalSchema,
  reviewSubmissionSchema,
  addAnnotationSchema,
  unlockRequestSchema,
  listSubmissionsQuerySchema,
} from './submission.validation.js';

const router = Router();

/**
 * All submission routes require authentication.
 */
router.use(authenticate);

/* ────── Student routes ────── */

/**
 * POST /:projectId/chapters
 * Upload a chapter document for a project.
 * Middleware chain: authenticate → authorize(student) → validate(params) →
 *   multer(single file) → validateFile(magic bytes) → validate(body) → controller
 */
router.post(
  '/:projectId/chapters',
  authorize(ROLES.STUDENT),
  validate(projectIdParamSchema, 'params'),
  upload.single('file'),
  validateFile,
  validate(uploadChapterSchema),
  submissionController.uploadChapter,
);

/**
 * POST /:projectId/proposal
 * Upload the compiled proposal document (Chapters 1-3 unified).
 * Middleware chain: authenticate → authorize(student) → validate(params) →
 *   multer(single file) → validateFile(magic bytes) → validate(body) → controller
 * Requires all chapters 1-3 to be locked (approved).
 */
router.post(
  '/:projectId/proposal',
  authorize(ROLES.STUDENT),
  validate(projectIdParamSchema, 'params'),
  upload.single('file'),
  validateFile,
  validate(compileProposalSchema),
  submissionController.compileProposal,
);

/* ────── Faculty routes ────── */

/**
 * POST /:submissionId/review
 * Review a submission (approve / request revisions / reject).
 * Only advisers and instructors can review.
 */
router.post(
  '/:submissionId/review',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER),
  validate(submissionIdParamSchema, 'params'),
  validate(reviewSubmissionSchema),
  submissionController.reviewSubmission,
);

/**
 * POST /:submissionId/unlock
 * Unlock a locked submission so the student can upload a new version.
 * Only advisers and instructors can unlock.
 */
router.post(
  '/:submissionId/unlock',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER),
  validate(submissionIdParamSchema, 'params'),
  validate(unlockRequestSchema),
  submissionController.unlockSubmission,
);

/**
 * POST /:submissionId/annotations
 * Add a highlight & comment annotation to a submission.
 * Only advisers and instructors can annotate.
 */
router.post(
  '/:submissionId/annotations',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER),
  validate(submissionIdParamSchema, 'params'),
  validate(addAnnotationSchema),
  submissionController.addAnnotation,
);

/**
 * DELETE /:submissionId/annotations/:annotationId
 * Remove an annotation. Only the annotation author or an instructor can remove.
 */
router.delete(
  '/:submissionId/annotations/:annotationId',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER),
  validate(submissionAnnotationParamSchema, 'params'),
  submissionController.removeAnnotation,
);

/* ────── Shared routes (any authenticated role) ────── */

/**
 * GET /:submissionId
 * Get a single submission by ID with populated references.
 */
router.get(
  '/:submissionId',
  validate(submissionIdParamSchema, 'params'),
  submissionController.getSubmission,
);

/**
 * GET /:submissionId/view
 * Get a pre-signed URL to view the document (5-min expiry).
 */
router.get(
  '/:submissionId/view',
  validate(submissionIdParamSchema, 'params'),
  submissionController.getViewUrl,
);

/**
 * GET /:submissionId/plagiarism
 * Get the plagiarism / originality check status and results.
 * Any authenticated user can check (authorization on data handled by the service).
 */
router.get(
  '/:submissionId/plagiarism',
  validate(submissionIdParamSchema, 'params'),
  submissionController.getPlagiarismStatus,
);

/**
 * GET /project/:projectId
 * List all submissions for a project with optional filters and pagination.
 */
router.get(
  '/project/:projectId',
  validate(projectIdParamSchema, 'params'),
  validate(listSubmissionsQuerySchema, 'query'),
  submissionController.getSubmissionsByProject,
);

/**
 * GET /project/:projectId/chapters/:chapter
 * Get the full version history for a specific chapter.
 */
router.get(
  '/project/:projectId/chapters/:chapter',
  validate(projectChapterParamSchema, 'params'),
  submissionController.getChapterHistory,
);

/**
 * GET /project/:projectId/chapters/:chapter/latest
 * Get only the latest version of a specific chapter.
 */
router.get(
  '/project/:projectId/chapters/:chapter/latest',
  validate(projectChapterParamSchema, 'params'),
  submissionController.getLatestChapterSubmission,
);

export default router;
