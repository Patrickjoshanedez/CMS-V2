import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import {
  checkSubmissionPlagiarism,
  getSubmissionPlagiarismResult,
  indexSubmissionInCorpus,
  removeSubmissionFromCorpus,
} from './plagiarism.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

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
