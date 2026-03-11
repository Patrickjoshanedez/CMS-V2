import Submission from '../submissions/submission.model.js';
import PlagiarismResult from './plagiarism.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { enqueuePlagiarismJob } from '../../jobs/queue.js';
import { runPlagiarismCheckSync } from '../../jobs/plagiarism.job.js';
import storageService from '../../services/storage.service.js';
import { extractText } from '../../utils/extractText.js';
import { PLAGIARISM_STATUSES } from '@cms/shared';

const mapSubmissionResult = (submission, collectionResult) => {
  if (submission?.plagiarismResult?.status) {
    return {
      status: submission.plagiarismResult.status,
      originalityScore: submission.originalityScore,
      matchedSources: submission.plagiarismResult.matchedSources || [],
      fullReport: submission.plagiarismResult.fullReport || null,
      processedAt: submission.plagiarismResult.processedAt || null,
      jobId: submission.plagiarismResult.jobId || null,
      error: submission.plagiarismResult.error || null,
    };
  }

  if (collectionResult) {
    const similarity = collectionResult.similarityPercentage ?? null;
    return {
      status: collectionResult.status,
      originalityScore: similarity === null ? null : Math.max(0, 100 - similarity),
      matchedSources: collectionResult.textMatches || [],
      fullReport: collectionResult.rawData || null,
      processedAt: collectionResult.checkedAt || collectionResult.completedAt || null,
      jobId: collectionResult.taskId || null,
      error: collectionResult.error || collectionResult.errorMessage || null,
    };
  }

  return {
    status: null,
    originalityScore: null,
    matchedSources: [],
    fullReport: null,
    processedAt: null,
    jobId: null,
    error: null,
  };
};

export const checkSubmissionPlagiarism = catchAsync(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId).select(
    'storageKey fileType projectId chapter plagiarismResult',
  );

  if (!submission) {
    throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
  }

  const status = submission.plagiarismResult?.status;
  if (status === PLAGIARISM_STATUSES.QUEUED || status === PLAGIARISM_STATUSES.PROCESSING) {
    return res.status(202).json({
      success: true,
      message: 'Plagiarism check is already in progress.',
      data: {
        submissionId,
        status,
        jobId: submission.plagiarismResult?.jobId || null,
      },
    });
  }

  const payload = {
    submissionId: submission._id.toString(),
    storageKey: submission.storageKey,
    fileType: submission.fileType,
    projectId: submission.projectId.toString(),
    chapter: submission.chapter,
  };

  const jobId = await enqueuePlagiarismJob(payload);
  const effectiveJobId = jobId || `sync-${submission._id.toString()}`;

  await Submission.findByIdAndUpdate(submission._id, {
    'plagiarismResult.status': PLAGIARISM_STATUSES.QUEUED,
    'plagiarismResult.jobId': effectiveJobId,
    'plagiarismResult.error': null,
  });

  await PlagiarismResult.findOneAndUpdate(
    { submissionId: submission._id },
    {
      $set: {
        taskId: effectiveJobId,
        status: PLAGIARISM_STATUSES.QUEUED,
        error: null,
        errorMessage: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Fallback for environments without Redis.
  if (!jobId) {
    runPlagiarismCheckSync(payload).catch((error) => {
      console.error(`[plagiarism.controller] Sync plagiarism check failed: ${error.message}`);
    });
  }

  return res.status(202).json({
    success: true,
    message: 'Plagiarism check queued successfully.',
    data: {
      submissionId,
      status: PLAGIARISM_STATUSES.QUEUED,
      jobId: effectiveJobId,
      mode: jobId ? 'queue' : 'sync-fallback',
    },
  });
});

export const getSubmissionPlagiarismResult = catchAsync(async (req, res) => {
  const { submissionId } = req.params;

  const [submission, collectionResult] = await Promise.all([
    Submission.findById(submissionId).select('plagiarismResult originalityScore'),
    PlagiarismResult.findOne({ submissionId }).lean(),
  ]);

  if (!submission) {
    throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
  }

  const result = mapSubmissionResult(submission, collectionResult);

  return res.status(200).json({
    success: true,
    data: {
      submissionId,
      ...result,
    },
  });
});

export const indexSubmissionInCorpus = catchAsync(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId).select(
    'storageKey fileType extractedText',
  );

  if (!submission) {
    throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
  }

  if (!submission.extractedText || submission.extractedText.trim().length === 0) {
    const fileBuffer = await storageService.downloadFile(submission.storageKey);
    const text = await extractText(fileBuffer, submission.fileType);

    await Submission.findByIdAndUpdate(submission._id, {
      extractedText: text,
    });
  }

  await PlagiarismResult.findOneAndUpdate(
    { submissionId: submission._id },
    {
      $set: {
        rawData: {
          indexedAt: new Date().toISOString(),
        },
      },
    },
    { upsert: false, new: true },
  );

  return res.status(200).json({
    success: true,
    message: 'Submission is indexed for future corpus comparison.',
  });
});

export const removeSubmissionFromCorpus = catchAsync(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId).select('extractedText');
  if (!submission) {
    throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
  }

  await Submission.findByIdAndUpdate(submission._id, { extractedText: null });

  await PlagiarismResult.findOneAndUpdate(
    { submissionId: submission._id },
    {
      $set: {
        rawData: {
          removedFromCorpusAt: new Date().toISOString(),
        },
      },
    },
    { upsert: false, new: true },
  );

  return res.status(200).json({
    success: true,
    message: 'Submission removed from corpus comparison set.',
  });
});
