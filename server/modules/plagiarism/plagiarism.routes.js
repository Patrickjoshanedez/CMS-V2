import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import upload from '../../middleware/upload.js';
import { validatePdfFile } from '../../middleware/fileValidation.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { ROLES } from '@cms/shared';
import {
  checkSubmissionPlagiarism,
  getSubmissionPlagiarismResult,
  indexSubmissionInCorpus,
  removeSubmissionFromCorpus,
  scanArchivedPdfPlagiarism,
} from './plagiarism.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/plagiarism/checker/scan',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  uploadLimiter,
  upload.single('file'),
  validatePdfFile,
  scanArchivedPdfPlagiarism,
);

router.post(
  '/:submissionId/plagiarism/check',
  authorize('adviser', 'instructor', 'panelist'),
  checkSubmissionPlagiarism,
);

router.get(
  '/:submissionId/plagiarism/result',
  authorize('adviser', 'instructor', 'panelist', 'student'),
  getSubmissionPlagiarismResult,
);

router.post(
  '/:submissionId/plagiarism/index',
  authorize('adviser', 'instructor'),
  indexSubmissionInCorpus,
);

router.delete(
  '/:submissionId/plagiarism/index',
  authorize('adviser', 'instructor'),
  removeSubmissionFromCorpus,
);

export default router;
