import Submission from '../submissions/submission.model.js';
import PlagiarismResult from './plagiarism.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';
import { enqueuePlagiarismJob } from '../../jobs/queue.js';
import { runPlagiarismCheckSync } from '../../jobs/plagiarism.job.js';
import storageService from '../../services/storage.index.js';
import { extractText } from '../../utils/extractText.js';
import submissionService from '../submissions/submission.service.js';
import { PLAGIARISM_STATUSES } from '@cms/shared';

const resolveCorpusMetadata = (...candidates) => {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const source =
      candidate.corpus && typeof candidate.corpus === 'object' ? candidate.corpus : candidate;
    const indexedAt = typeof source.indexedAt === 'string' ? source.indexedAt : null;
    const removedFromCorpusAt =
      typeof source.removedFromCorpusAt === 'string' ? source.removedFromCorpusAt : null;

    if (!indexedAt && !removedFromCorpusAt) {
      continue;
    }

    const indexedAtTs = indexedAt ? Date.parse(indexedAt) : Number.NaN;
    const removedAtTs = removedFromCorpusAt ? Date.parse(removedFromCorpusAt) : Number.NaN;
    const isIndexed =
      Boolean(indexedAt) &&
      (!removedFromCorpusAt ||
        (Number.isFinite(indexedAtTs) &&
          Number.isFinite(removedAtTs) &&
          indexedAtTs > removedAtTs));

    return {
      isIndexed,
      indexedAt,
      removedFromCorpusAt,
      known: true,
    };
  }

  return {
    isIndexed: false,
    indexedAt: null,
    removedFromCorpusAt: null,
    known: false,
  };
};

const mergeFullReportWithCorpusData = (fullReport, collectionRawData) => {
  if (!collectionRawData || typeof collectionRawData !== 'object') {
    return fullReport || null;
  }

  if (!fullReport || typeof fullReport !== 'object') {
    return { rawData: collectionRawData };
  }

  const existingRawData =
    fullReport.rawData && typeof fullReport.rawData === 'object' ? fullReport.rawData : {};

  return {
    ...fullReport,
    rawData: {
      ...existingRawData,
      ...collectionRawData,
    },
  };
};

const mapSubmissionResult = (submission, collectionResult) => {
  const collectionRawData =
    collectionResult?.rawData && typeof collectionResult.rawData === 'object'
      ? collectionResult.rawData
      : null;

  if (submission?.plagiarismResult?.status) {
    const mergedFullReport = mergeFullReportWithCorpusData(
      submission.plagiarismResult.fullReport || null,
      collectionRawData,
    );
    const corpus = resolveCorpusMetadata(
      collectionRawData,
      submission.plagiarismResult.fullReport?.rawData,
      submission.plagiarismResult.fullReport,
    );

    return {
      status: submission.plagiarismResult.status,
      originalityScore: submission.originalityScore,
      matchedSources: submission.plagiarismResult.matchedSources || [],
      fullReport: mergedFullReport,
      processedAt: submission.plagiarismResult.processedAt || null,
      jobId: submission.plagiarismResult.jobId || null,
      error: submission.plagiarismResult.error || null,
      detectedTitle: submission.documentTitle || null,
      detectedAbstract: submission.documentAbstract || null,
      corpus,
    };
  }

  if (collectionResult) {
    const similarity = collectionResult.similarityPercentage ?? null;
    const corpus = resolveCorpusMetadata(collectionRawData);

    return {
      status: collectionResult.status,
      originalityScore: similarity === null ? null : Math.max(0, 100 - similarity),
      matchedSources: collectionResult.textMatches || [],
      fullReport: collectionResult.rawData || null,
      processedAt: collectionResult.checkedAt || collectionResult.completedAt || null,
      jobId: collectionResult.taskId || null,
      error: collectionResult.error || collectionResult.errorMessage || null,
      detectedTitle: submission.documentTitle || null,
      detectedAbstract: submission.documentAbstract || null,
      corpus,
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
    detectedTitle: submission?.documentTitle || null,
    detectedAbstract: submission?.documentAbstract || null,
    corpus: {
      isIndexed: false,
      indexedAt: null,
      removedFromCorpusAt: null,
      known: false,
    },
  };
};

export const checkSubmissionPlagiarism = catchAsync(async (req, res) => {
  const { submissionId } = req.params;

  const { submission } = await submissionService.getSubmissionViewContext(
    submissionId,
    req.user._id,
    {
      submissionSelect:
        'storageKey fileType projectId chapter plagiarismResult type documentTitle documentAbstract',
    },
  );

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
    title: submission.documentTitle || undefined,
    abstract: submission.documentAbstract || undefined,
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

  const { submission } = await submissionService.getSubmissionViewContext(
    submissionId,
    req.user._id,
    {
      submissionSelect:
        'projectId type plagiarismResult originalityScore documentTitle documentAbstract',
    },
  );

  const collectionResult = await PlagiarismResult.findOne({ submissionId: submission._id }).lean();

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

  const { submission } = await submissionService.getSubmissionViewContext(
    submissionId,
    req.user._id,
    {
      submissionSelect: 'storageKey fileType extractedText projectId type',
    },
  );

  if (!submission.extractedText || submission.extractedText.trim().length === 0) {
    const fileBuffer = await storageService.downloadFile(submission.storageKey);
    const text = await extractText(fileBuffer, submission.fileType);

    await Submission.findByIdAndUpdate(submission._id, {
      extractedText: text,
    });
  }

  const indexedAt = new Date().toISOString();

  await PlagiarismResult.findOneAndUpdate(
    { submissionId: submission._id },
    {
      $set: {
        checkedAt: new Date(),
        'rawData.indexedAt': indexedAt,
        'rawData.removedFromCorpusAt': null,
        'rawData.corpus.indexedAt': indexedAt,
        'rawData.corpus.removedFromCorpusAt': null,
      },
      $setOnInsert: {
        taskId: `corpus-manual-${submission._id.toString()}`,
        status: 'pending',
        error: null,
        errorMessage: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return res.status(200).json({
    success: true,
    message: 'Submission is indexed for future corpus comparison.',
  });
});

export const removeSubmissionFromCorpus = catchAsync(async (req, res) => {
  const { submissionId } = req.params;

  const { submission } = await submissionService.getSubmissionViewContext(
    submissionId,
    req.user._id,
    {
      submissionSelect: 'extractedText projectId type',
    },
  );

  await Submission.findByIdAndUpdate(submission._id, { extractedText: null });

  const removedFromCorpusAt = new Date().toISOString();

  await PlagiarismResult.findOneAndUpdate(
    { submissionId: submission._id },
    {
      $set: {
        checkedAt: new Date(),
        'rawData.removedFromCorpusAt': removedFromCorpusAt,
        'rawData.corpus.removedFromCorpusAt': removedFromCorpusAt,
      },
      $setOnInsert: {
        taskId: `corpus-manual-${submission._id.toString()}`,
        status: 'pending',
        error: null,
        errorMessage: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return res.status(200).json({
    success: true,
    message: 'Submission removed from corpus comparison set.',
  });
});
