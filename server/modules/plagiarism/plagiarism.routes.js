import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import upload from '../../middleware/upload.js';
import { validateDocumentFile } from '../../middleware/fileValidation.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { ROLES } from '@cms/shared';
import {
  checkSubmissionPlagiarism,
  getSubmissionPlagiarismResult,
  indexSubmissionInCorpus,
  removeSubmissionFromCorpus,
  scanArchivedPdfPlagiarism,
  scanSubmissionAgainstArchive,
} from './plagiarism.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/plagiarism/checker/scan',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  uploadLimiter,
  upload.single('file'),
  validateDocumentFile,
  scanArchivedPdfPlagiarism,
);

router.post(
  '/:submissionId/plagiarism/archive-scan',
  authorize(ROLES.STUDENT, ROLES.ADVISER, ROLES.PANELIST, ROLES.INSTRUCTOR),
  scanSubmissionAgainstArchive,
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
