/**
 * SubmissionService — Business logic for document uploads, versioning,
 * review workflow, annotations, and document locking.
 *
 * Controllers are thin — they delegate here.
 * StorageService handles S3 I/O; this service owns the workflow.
 *
 * ARCHITECTURE NOTE (refactored):
 * Upload methods (uploadChapter, compileProposal, uploadSystemDesign,
 * uploadTestResults, uploadFinalAcademic, uploadFinalJournal) share pipelines
 * extracted into private helpers:
 *   _authorizeStudentUpload()  — user lookup + role + team membership
 *   _detectLateSubmission()    — deadline lookup + remarks enforcement
 *   _enqueuePlagiarism()       — BullMQ enqueue with sync fallback
 *   _notifyAdviser()           — in-app notification + real-time emit + email
 * Each public method now contains ONLY its unique pre-validation logic,
 * then delegates to the shared pipeline, cutting ~400 lines of duplication.
 */
import Submission from './submission.model.js';
import SubmissionRound from './submissionRound.model.js';
import Project from '../projects/project.model.js';
import User from '../users/user.model.js';
import Notification from '../notifications/notification.model.js';
import PlagiarismResult from '../plagiarism/plagiarism.model.js';
import storageService from '../../services/storage.index.js';
import googleDriveReviewService from '../../services/google-drive-review.service.js';
import auditService from '../audit/audit.service.js';
import agentRuntimeConfigService from '../../services/agentRuntimeConfig.service.js';
import env from '../../config/env.js';
import { enqueuePlagiarismJob, enqueueEmailJob } from '../../jobs/queue.js';
import { runPlagiarismCheckSync } from '../../jobs/plagiarism.job.js';
import { emitToUser } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import { extractPdfMetadata } from '../../utils/pdfMetadataExtractor.js';
import {
  ROLES,
  SUBMISSION_STATUSES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  PLAGIARISM_STATUSES,
} from '@cms/shared';

const logger = {
  info: (...args) => console.info(...args), // eslint-disable-line no-console
  error: (...args) => console.error(...args),
};

class SubmissionService {
  async _extractUploadedPdfMetadata(file) {
    const mime = file?.validatedMime || file?.mimetype;
    if (mime !== 'application/pdf' || !file?.buffer) {
      return { documentTitle: null, documentAbstract: null };
    }

    try {
      const extracted = await extractPdfMetadata(file.buffer);
      const documentTitle = extracted?.title?.trim() || null;
      const documentAbstract = extracted?.abstract?.trim() || null;
      return { documentTitle, documentAbstract };
    } catch (error) {
      logger.error(
        { error: error?.message },
        'Failed to extract PDF metadata for submission upload. Continuing without metadata.',
      );
      return { documentTitle: null, documentAbstract: null };
    }
  }

  _isTrustedSubmissionFallbackUrl(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return false;
    }

    try {
      const parsed = new URL(value.trim());
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        return false;
      }

      const host = parsed.hostname.toLowerCase();
      return (
        host === 'drive.google.com' || host === 'docs.google.com' || host === 'www.googleapis.com'
      );
    } catch {
      return false;
    }
  }

  _resolveSubmissionFallbackUrl(submission) {
    const candidates = [
      submission?.driveWebContentLink,
      submission?.driveWebViewLink,
      submission?.syncedGoogleDocUrl,
    ];

    for (const candidate of candidates) {
      if (this._isTrustedSubmissionFallbackUrl(candidate)) {
        return candidate.trim();
      }
    }

    return null;
  }

  _toMatchedSourcesFromCollection(collectionResult) {
    const textMatches = Array.isArray(collectionResult?.textMatches)
      ? collectionResult.textMatches
      : [];

    return textMatches.map((match) => ({
      submissionId: match?.sourceId || match?.submissionId || match?.id || null,
      projectTitle: match?.sourceTitle || match?.title || 'Unknown source',
      chapter: match?.chapter ?? null,
      matchPercentage:
        match?.similarityPercentage ?? match?.matchPercentage ?? match?.similarity ?? null,
      spans: Array.isArray(match?.matchedBlocks)
        ? match.matchedBlocks
            .map((block) => ({
              start: block?.studentStart,
              end: block?.studentEnd,
            }))
            .filter(
              (span) =>
                Number.isFinite(span.start) && Number.isFinite(span.end) && span.end > span.start,
            )
        : Array.isArray(match?.spans)
          ? match.spans
          : [],
      sourceSnippet:
        (Array.isArray(match?.matchedBlocks) && match.matchedBlocks[0]?.matchedText) ||
        match?.sourceSnippet ||
        '',
    }));
  }

  _getPlagiarismStaleTimeoutMs() {
    const minutes = Number(process.env.PLAGIARISM_JOB_STALE_MINUTES || 60);
    return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : 60 * 60 * 1000;
  }

  async _reconcileStalePlagiarismResult(submissionId, plagiarismResult) {
    if (!plagiarismResult) {
      return null;
    }

    if (!['queued', 'processing', 'pending'].includes(plagiarismResult.status)) {
      return plagiarismResult;
    }

    const lastUpdatedAt = plagiarismResult.updatedAt || plagiarismResult.createdAt;
    if (!lastUpdatedAt) {
      return plagiarismResult;
    }

    const isStale =
      Date.now() - new Date(lastUpdatedAt).getTime() > this._getPlagiarismStaleTimeoutMs();
    if (!isStale) {
      return plagiarismResult;
    }

    const staleError =
      'Plagiarism processing timed out. Please re-run plagiarism check before approval.';

    const updated = await PlagiarismResult.findOneAndUpdate(
      { submissionId },
      {
        $set: {
          status: PLAGIARISM_STATUSES.FAILED,
          error: staleError,
          errorMessage: staleError,
          completedAt: new Date(),
          checkedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    ).lean();

    await Submission.findByIdAndUpdate(submissionId, {
      'plagiarismResult.status': PLAGIARISM_STATUSES.FAILED,
      'plagiarismResult.error': staleError,
      'plagiarismResult.processedAt': new Date(),
    });

    logger.error(
      { submissionId: submissionId.toString() },
      'Marked stale plagiarism job as failed to avoid indefinite queued/processing state',
    );

    return updated;
  }

  async _ensureMockPlagiarismForApproval(submission) {
    if (!env.PLAGIARISM_FORCE_MOCK_SCORE) {
      return null;
    }

    const now = new Date();
    const mockTaskId = `mock-approval-${submission._id.toString()}`;

    const mockResult = await PlagiarismResult.findOneAndUpdate(
      { submissionId: submission._id },
      {
        $set: {
          taskId: mockTaskId,
          status: PLAGIARISM_STATUSES.COMPLETED,
          similarityPercentage: 0,
          textMatches: [],
          checkedAt: now,
          completedAt: now,
          warningFlag: false,
          rawData: {
            originalityScore: 100,
            matchedSources: [],
            mode: 'mock',
            reason: 'PLAGIARISM_FORCE_MOCK_SCORE enabled during approval',
          },
          error: null,
          errorMessage: null,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();

    await Submission.findByIdAndUpdate(submission._id, {
      originalityScore: 100,
      'plagiarismResult.status': PLAGIARISM_STATUSES.COMPLETED,
      'plagiarismResult.jobId': mockTaskId,
      'plagiarismResult.error': null,
      'plagiarismResult.originalityScore': 100,
      'plagiarismResult.matchedSources': [],
      'plagiarismResult.processedAt': now,
    });

    logger.info(
      { submissionId: submission._id.toString(), taskId: mockTaskId },
      'Auto-seeded mock plagiarism result for approval flow',
    );

    return mockResult;
  }

  /* ═══════════════════ Shared Private Helpers ═══════════════════ */

  /**
   * Authorize a student upload: fetch user, verify role, fetch project, verify
   * team membership. Returns hydrated { user, project } on success.
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {string} [actionLabel='upload'] - Used in error messages
   * @returns {Promise<{ user: Object, project: Object }>}
   */
  async _authorizeStudentUpload(userId, projectId, actionLabel = 'upload') {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError(`Only students can ${actionLabel}.`, 403, 'FORBIDDEN');
    }

    const project = await Project.findById(projectId).populate('teamId');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    if (!user.teamId || user.teamId.toString() !== project.teamId._id.toString()) {
      throw new AppError('You are not a member of this project team.', 403, 'NOT_TEAM_MEMBER');
    }

    if (!project.teamId?.isLocked) {
      throw new AppError(
        'Your team must be finalized before submitting documents.',
        400,
        'TEAM_NOT_FINALIZED',
      );
    }

    return { user, project };
  }

  /**
   * Check deadline and enforce the late-submission remarks business rule.
   *
   * @param {Object} project - Hydrated project document
   * @param {string} deadlineField - Key within project.deadlines (e.g. 'chapter1', 'proposal', 'defense')
   * @param {string|undefined} remarks - Student-provided late remarks
   * @returns {{ isLate: boolean }}
   */
  _detectLateSubmission(project, deadlineField, remarks) {
    const deadline = project.deadlines?.[deadlineField];
    const isLate = deadline ? new Date() > new Date(deadline) : false;

    if (isLate && (!remarks || remarks.trim().length === 0)) {
      throw new AppError(
        'This submission is past the deadline. You must provide a late-justification note explaining the delay.',
        400,
        'LATE_REMARKS_REQUIRED',
      );
    }

    return { isLate };
  }

  /**
   * Resolve which project deadline applies to a specific submission.
   *
   * Chapter uploads for chapters 4-5 still map to the proposal deadline,
   * matching existing late-submission rules.
   *
   * @param {Object} submission
   * @param {Object} project
   * @returns {{ deadlineField: string|null, deadlineAt: Date|null }}
   */
  _resolveSubmissionDeadlineInfo(submission, project) {
    const deadlines = project?.deadlines || {};

    let deadlineField = null;
    if (submission?.type === 'chapter') {
      deadlineField = submission.chapter <= 3 ? `chapter${submission.chapter}` : 'proposal';
    } else if (submission?.type === 'proposal') {
      deadlineField = 'proposal';
    } else if (submission?.type === 'final_academic' || submission?.type === 'final_journal') {
      deadlineField = 'defense';
    }

    const deadlineAt = deadlineField ? deadlines?.[deadlineField] || null : null;

    return {
      deadlineField,
      deadlineAt,
    };
  }

  /**
   * Extract concise diagnostic data from Google sync errors so UI and logs can
   * show actionable reasons (for example invalid_grant, quota limits).
   *
   * @param {unknown} error
   * @returns {{ code: string|null, message: string|null }}
   */
  _extractGoogleSyncError(error) {
    const rawCode = error?.code;
    const appCode = error?.code && typeof error?.code === 'string' ? error.code : null;
    const responseCode = error?.response?.data?.error;

    const code =
      appCode ||
      (typeof responseCode === 'string' ? responseCode : null) ||
      (typeof rawCode === 'number' ? String(rawCode) : null);

    const message =
      typeof error?.message === 'string' && error.message.trim().length > 0
        ? error.message.trim().slice(0, 500)
        : null;

    return { code, message };
  }
  /**
   * Enqueue a plagiarism check via BullMQ. Falls back to synchronous execution
   * when Redis is unavailable (dev/test environments).
   *
   * @param {Object} submission - The newly created submission document
   * @param {Object} payload - { storageKey, fileType, projectId, chapter?, type? }
   */
  async _enqueuePlagiarism(submission, payload) {
    const plagiarismPayload = {
      submissionId: submission._id.toString(),
      ...payload,
    };

    let jobId = null;
    let enqueueError = null;
    try {
      jobId = await enqueuePlagiarismJob(plagiarismPayload);
    } catch (error) {
      enqueueError = error;
    }

    if (!jobId) {
      if (env.NODE_ENV === 'development') {
        // Redis unavailable in development — execute sync fallback for local workflows.
        runPlagiarismCheckSync(plagiarismPayload).catch((err) => {
          console.error(`[SubmissionService] Sync plagiarism fallback failed: ${err.message}`);
        });
      } else if (env.isProduction) {
        const reason =
          enqueueError?.message ||
          'Plagiarism queue is unavailable and synchronous fallback is disabled in production.';

        await Submission.findByIdAndUpdate(submission._id, {
          'plagiarismResult.status': PLAGIARISM_STATUSES.FAILED,
          'plagiarismResult.error': reason,
          'plagiarismResult.processedAt': new Date(),
          'plagiarismResult.jobId': null,
        });

        logger.error(
          {
            submissionId: submission._id.toString(),
            projectId: payload.projectId,
            error: reason,
          },
          'Plagiarism enqueue failed in production; marked submission plagiarism status as failed',
        );
      } else {
        logger.error(
          {
            submissionId: submission._id.toString(),
            projectId: payload.projectId,
            error: enqueueError?.message || null,
          },
          'Plagiarism queue unavailable; synchronous fallback is disabled outside development',
        );
      }
    } else {
      await Submission.findByIdAndUpdate(submission._id, {
        'plagiarismResult.jobId': jobId,
      });
    }
  }

  /**
   * Resolve plagiarism reject threshold for approval decisions.
   * Default behavior remains env-based unless runtime toggle is explicitly enabled.
   *
   * Runtime profile path (optional): settings.thresholds.plagiarism.rejectPercent
   * Accepted range: 0 < threshold <= 100
   *
   * @returns {Promise<number>}
   */
  async _getPlagiarismRejectThreshold() {
    const envThreshold =
      Number(process.env.PLAGIARISM_REJECT_THRESHOLD) ||
      Number(env.PLAGIARISM_REJECT_THRESHOLD) ||
      50;

    const runtimeToggle =
      process.env.AGENT_RUNTIME_USE_DYNAMIC_PLAGIARISM_THRESHOLD === 'true' ||
      env.AGENT_RUNTIME_USE_DYNAMIC_PLAGIARISM_THRESHOLD;

    if (!runtimeToggle) {
      return envThreshold;
    }

    try {
      const { profile } = await agentRuntimeConfigService.getActiveProfile();
      const runtimeThresholdRaw = profile?.settings?.thresholds?.plagiarism?.rejectPercent;
      const runtimeThreshold = Number(runtimeThresholdRaw);

      if (Number.isFinite(runtimeThreshold) && runtimeThreshold > 0 && runtimeThreshold <= 100) {
        logger.info(
          {
            runtimeThreshold,
            envThreshold,
            profileId: profile?.id,
          },
          'Using runtime plagiarism reject threshold for submission approval',
        );
        return runtimeThreshold;
      }
    } catch (error) {
      logger.error(
        { error: error.message, envThreshold },
        'Failed to resolve runtime plagiarism reject threshold. Falling back to env value',
      );
    }

    return envThreshold;
  }

  /**
   * Send in-app notification + real-time socket event + email to the project's
   * assigned adviser. No-ops gracefully when no adviser is assigned.
   *
   * @param {Object} params
   * @param {Object} params.project - Hydrated project
   * @param {Object} params.submission - The new submission document
   * @param {string} params.notifType - Notification type constant
   * @param {string} params.notifTitle - Human-readable notification title
   * @param {string} params.docLabel - E.g. "Chapter 2 (v3)" or "compiled proposal (v1)"
   * @param {Object} [params.extraMetadata] - Extra fields for notification metadata
   */
  async _notifyAdviser({
    project,
    submission,
    notifType,
    notifTitle,
    docLabel,
    extraMetadata = {},
  }) {
    if (!project.adviserId) return;

    const notif = await Notification.create({
      userId: project.adviserId,
      type: notifType,
      title: notifTitle,
      message: `${docLabel} has been submitted for project "${project.title}".`,
      metadata: {
        projectId: project._id,
        submissionId: submission._id,
        version: submission.version,
        ...extraMetadata,
      },
    });
    emitToUser(project.adviserId, 'notification:new', notif);

    const adviser = await User.findById(project.adviserId).select('email firstName');
    if (adviser?.email) {
      enqueueEmailJob({
        to: adviser.email,
        subject: `${notifTitle} — ${project.title}`,
        html: `<p>Dear ${adviser.firstName || 'Adviser'},</p><p>${docLabel} has been submitted for project <strong>${project.title}</strong>.</p><p>Please log in to review the document.</p>`,
        text: `Dear ${adviser.firstName || 'Adviser'}, ${docLabel} has been submitted for project "${project.title}". Please log in to review the document.`,
      });
    }
  }

  /**
   * Mirror final submissions to Google Drive archive folder when configured.
   * S3 remains the source of truth; Drive mirror is best-effort.
   *
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.fileName
   * @param {string} params.mimeType
   * @param {string} params.projectId
   * @param {number} params.version
   * @param {'final_academic'|'final_journal'} params.type
   * @returns {Promise<{ driveFileId: string|null, driveWebViewLink: string|null, driveWebContentLink: string|null }>}
   */
  async _mirrorFinalToDrive({
    buffer: _buffer,
    fileName: _fileName,
    mimeType: _mimeType,
    projectId: _projectId,
    version: _version,
    type: _type,
  }) {
    // Google Drive mirror intentionally disabled.
    // Keep backward-compatible payload shape for existing consumers.
    return {
      driveFileId: null,
      driveWebViewLink: null,
      driveWebContentLink: null,
    };
  }

  /**
   * Store submissions in Google Drive and create an editable Google Doc.
   *
   * Workflow:
   * 1. Clone master template → creates per-student copy of Google Doc
   * 2. Set "Anyone Can Edit" permission → students can access via link
   * 3. Return doc URL for embedding in UI
   *
   * On error, gracefully degrades: returns nulls for Google sync fields
   * but does NOT fail the upload. Audit logs all sync attempts.
   *
   * @param {Object} params
   * @param {Object} params.user - User performing upload
   * @param {Buffer} params.buffer - File content (unused for Google Docs, kept for compatibility)
   * @param {string} params.fileName - Name for cloned doc
   * @param {string} params.mimeType - Original file MIME type
   * @param {string} params.projectId - Project reference for audit
   * @param {number} params.version - Version number
   * @param {'chapter'|'proposal'|'system_design'|'test_results'|'final_academic'|'final_journal'} params.type - Submission type
   * @returns {Promise<{
   * userDriveFolderId: string|null,
   * driveFileId: string|null,
   * driveWebViewLink: string|null,
   * driveWebContentLink: string|null,
   * syncedGoogleDocId: string|null,
   * syncedGoogleDocUrl: string|null,
   * googleDocSyncStatus: 'not_requested'|'synced'|'not_supported'|'failed',
   * googleDocSyncErrorCode: string|null,
   * googleDocSyncErrorMessage: string|null,
   * googleDocSyncedAt: Date|null
   * }>}
   */
  async _syncSubmissionToUserDriveAndGoogleDoc({ user, fileName, projectId, version, type }) {
    // Default response — used if sync disabled, type unsupported, or service unavailable
    const nullResponse = {
      userDriveFolderId: null,
      driveFileId: null,
      driveWebViewLink: null,
      driveWebContentLink: null,
      syncedGoogleDocId: null,
      syncedGoogleDocUrl: null,
      googleDocSyncStatus: 'not_requested',
      googleDocSyncErrorCode: null,
      googleDocSyncErrorMessage: null,
      googleDocSyncedAt: null,
    };

    await auditService.log({
      action: 'submission.google_docs_sync_skipped',
      actor: user._id,
      actorRole: user.role,
      targetType: 'Submission',
      targetId: null,
      description: `Skipped Google Docs sync for ${type} submission (v${version}).`,
      metadata: {
        projectId,
        version,
        type,
        fileName,
        reason: 'google_integration_de_scoped',
      },
    });

    return {
      ...nullResponse,
      googleDocSyncStatus: 'not_supported',
    };
  }

  /**
   * If a placeholder round exists for this upload version, convert it into
   * an instructor-review round and attach the concrete submission reference.
   *
   * @param {Object} submission
   */
  async _syncPendingRoundForUpload(submission) {
    const query = {
      projectId: submission.projectId,
      chapter: submission.chapter || null,
      type: submission.type,
      roundNumber: submission.version,
      status: SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD,
      sourceSubmissionId: null,
    };

    const update = {
      sourceSubmissionId: submission._id,
      filePath: submission.storageKey,
      status: SUBMISSION_STATUSES.PENDING_INSTRUCTOR_REVIEW,
      isPlaceholder: false,
    };

    await SubmissionRound.findOneAndUpdate(query, update).exec();
  }

  /* ═══════════════════ View Authorization ═══════════════════ */

  /**
   * Authorization for viewing a submission document.
   * Allowed: instructor, assigned adviser, assigned panelist, and project team students.
   *
   * @param {Object} user
   * @param {Object} project
   * @param {Object|null} submission
   * @param {Object} options
   * @param {boolean} options.allowArchivedFinalJournalPublicView
   */
  _assertCanViewSubmission(user, project, submission = null, options = {}) {
    const userId = user._id.toString();
    const { allowArchivedFinalJournalPublicView = false } = options;

    // Central archiving exception: any authenticated user can view archived final journals.
    if (
      allowArchivedFinalJournalPublicView &&
      submission &&
      project.projectStatus === PROJECT_STATUSES.ARCHIVED &&
      submission.type === 'final_journal'
    ) {
      return;
    }

    if (user.role === ROLES.INSTRUCTOR) return;

    if (
      user.role === ROLES.ADVISER &&
      project.adviserId &&
      project.adviserId.toString() === userId
    ) {
      return;
    }

    if (
      user.role === ROLES.PANELIST &&
      project.panelistIds?.map((panelistId) => panelistId.toString()).includes(userId)
    ) {
      return;
    }

    if (
      user.role === ROLES.STUDENT &&
      project.teamId &&
      project.teamId.members?.map((memberId) => memberId.toString()).includes(userId)
    ) {
      return;
    }

    throw new AppError('You do not have permission to view this submission.', 403, 'FORBIDDEN');
  }

  /**
   * Authorization for faculty moderation mutations.
   * Allowed: instructor or assigned adviser of the submission's project.
   *
   * @param {Object} user
   * @param {Object} project
   */
  _assertCanModerateSubmission(user, project, options = {}) {
    const { allowPanelist = false } = options;
    const userId = user._id.toString();

    if (user.role === ROLES.INSTRUCTOR) {
      return;
    }

    if (
      user.role === ROLES.ADVISER &&
      project.adviserId &&
      project.adviserId.toString() === userId
    ) {
      return;
    }

    if (
      allowPanelist &&
      user.role === ROLES.PANELIST &&
      Array.isArray(project.panelistIds) &&
      project.panelistIds.map((panelistId) => panelistId.toString()).includes(userId)
    ) {
      return;
    }

    throw new AppError('You do not have permission to moderate this submission.', 403, 'FORBIDDEN');
  }

  /**
   * Resolve moderation context and enforce faculty mutation authorization.
   *
   * @param {Object} submission
   * @param {string} reviewerId
   * @returns {Promise<{ reviewer: Object, project: Object }>}
   */
  async _getModerationContext(submission, reviewerId, options = {}) {
    const reviewer = await User.findById(reviewerId).select('role');
    if (!reviewer) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const project = await Project.findById(submission.projectId).select('adviserId panelistIds');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanModerateSubmission(reviewer, project, options);

    return { reviewer, project };
  }

  /**
   * Resolve a submission + requester context and enforce submission-view authorization.
   *
   * @param {string} submissionId
   * @param {string} requesterId
   * @param {Object} options
   * @param {string} options.submissionSelect
   * @param {boolean} options.allowArchivedFinalJournalPublicView
   * @returns {Promise<{ submission: Object, user: Object, project: Object }>}
   */
  async getSubmissionViewContext(submissionId, requesterId, options = {}) {
    const { submissionSelect = 'projectId type', allowArchivedFinalJournalPublicView = false } =
      options;

    const submission = await Submission.findById(submissionId).select(submissionSelect);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const user = await User.findById(requesterId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const project = await Project.findById(submission.projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanViewSubmission(user, project, submission, {
      allowArchivedFinalJournalPublicView,
    });

    return { submission, user, project };
  }

  /* ═══════════════════ Upload: Chapter ═══════════════════ */

  /**
   * Upload a chapter document for a project.
   *
   * Business rules enforced:
   * - User must be a student on the owning team
   * - Project must be active with approved title
   * - Previous version (if any) must NOT be locked
   * - Late submissions must include remarks
   * - Version auto-increments from the highest existing version
   *
   * @param {string} userId - The authenticated student
   * @param {string} projectId - Target project
   * @param {Object} data - { chapter, remarks }
   * @param {Object} file - multer file object with buffer, originalname, size, validatedMime
   * @returns {Object} { submission }
   */
  async uploadChapter(userId, projectId, data, file) {
    const { user, project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'upload chapters',
    );
    const { chapter, remarks } = data;

    if (chapter > 1) {
      const previousChapterLocked = await Submission.findOne({
        projectId,
        chapter: chapter - 1,
        type: 'chapter',
        status: SUBMISSION_STATUSES.LOCKED,
      });

      if (!previousChapterLocked) {
        throw new AppError(
          `Chapter ${chapter - 1} must be approved before you can submit Chapter ${chapter}.`,
          400,
          'PREVIOUS_CHAPTER_NOT_APPROVED',
        );
      }
    }

    // --- Project state checks (chapter-specific) ---
    if (project.projectStatus !== PROJECT_STATUSES.ACTIVE) {
      throw new AppError('Cannot upload to a non-active project.', 400, 'PROJECT_NOT_ACTIVE');
    }
    if (project.titleStatus !== TITLE_STATUSES.APPROVED) {
      throw new AppError(
        'Your project title must be approved before uploading chapters.',
        400,
        'TITLE_NOT_APPROVED',
      );
    }

    if (Number(chapter) === 1) {
      const panelistsAssigned =
        Array.isArray(project.panelistIds) && project.panelistIds.length > 0;

      if (!panelistsAssigned) {
        throw new AppError(
          'Chapter 1 submission requires at least one assigned panelist.',
          400,
          'PANELISTS_NOT_ASSIGNED',
        );
      }
    }

    if (Number(chapter) >= 4) {
      const lockedProposal = await Submission.findOne({
        projectId,
        type: 'proposal',
        status: SUBMISSION_STATUSES.LOCKED,
      });

      if (!lockedProposal) {
        throw new AppError(
          'Your full proposal must be approved before submitting Chapters 4 and 5.',
          400,
          'PROPOSAL_NOT_APPROVED',
        );
      }
    }

    // --- Check if previous version is locked ---
    const latestSubmission = await Submission.findOne({
      projectId,
      chapter,
      type: 'chapter',
    }).sort({ version: -1 });

    if (latestSubmission && latestSubmission.status === SUBMISSION_STATUSES.LOCKED) {
      throw new AppError(
        'This chapter is locked. Submit an unlock request to your adviser.',
        403,
        'DOCUMENT_LOCKED',
      );
    }

    if (latestSubmission && latestSubmission.reviewClosed) {
      throw new AppError(
        'This review thread is already accepted and closed.',
        400,
        'REVIEW_THREAD_CLOSED',
      );
    }

    if (latestSubmission && latestSubmission.status !== SUBMISSION_STATUSES.REVISIONS_REQUIRED) {
      throw new AppError(
        'You can only upload a new chapter version after adviser revisions are requested.',
        400,
        'REVISION_NOT_REQUESTED',
      );
    }

    // --- Late submission detection ---
    const deadlineField = chapter <= 3 ? `chapter${chapter}` : 'proposal';
    const { isLate } = this._detectLateSubmission(project, deadlineField, remarks);

    // --- Auto-increment version ---
    const nextVersion = latestSubmission ? latestSubmission.version + 1 : 1;
    const revisionRound = latestSubmission ? (latestSubmission.revisionRound || 0) + 1 : 0;

    // --- Upload to S3 ---
    const storageKey = storageService.buildKey(projectId, chapter, nextVersion, file.originalname);
    try {
      await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
        projectId,
        chapter: String(chapter),
        version: String(nextVersion),
        uploadedBy: userId,
      });
    } catch (error) {
      if (error.isOperational) {
        logger.error('[SubmissionService] Chapter upload failed:', error.code, error.message);
        throw error;
      }
      logger.error('[SubmissionService] Unexpected chapter upload error:', error);
      throw new AppError(
        'Failed to upload chapter document. Please try again later.',
        500,
        'CHAPTER_UPLOAD_ERROR',
      );
    }

    const driveSync = await this._syncSubmissionToUserDriveAndGoogleDoc({
      user,
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.validatedMime,
      projectId,
      version: nextVersion,
      type: 'chapter',
    });

    const extractedMetadata = await this._extractUploadedPdfMetadata(file);

    // --- Create submission record ---
    const submission = await Submission.create({
      projectId,
      chapter,
      version: nextVersion,
      revisionRound,
      fileName: file.originalname,
      fileType: file.validatedMime,
      fileSize: file.size,
      storageKey,
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: userId,
      isLate,
      remarks: remarks || null,
      userDriveFolderId: driveSync.userDriveFolderId,
      driveFileId: driveSync.driveFileId,
      driveWebViewLink: driveSync.driveWebViewLink,
      driveWebContentLink: driveSync.driveWebContentLink,
      syncedGoogleDocId: driveSync.syncedGoogleDocId,
      syncedGoogleDocUrl: driveSync.syncedGoogleDocUrl,
      googleDocSyncStatus: driveSync.googleDocSyncStatus,
      googleDocSyncErrorCode: driveSync.googleDocSyncErrorCode,
      googleDocSyncErrorMessage: driveSync.googleDocSyncErrorMessage,
      googleDocSyncedAt: driveSync.googleDocSyncedAt,
      documentTitle: extractedMetadata.documentTitle,
      documentAbstract: extractedMetadata.documentAbstract,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    await this._syncPendingRoundForUpload(submission);

    // --- Plagiarism + Notification (shared pipeline) ---
    await this._enqueuePlagiarism(submission, {
      storageKey,
      fileType: file.validatedMime,
      projectId,
      chapter,
    });

    await this._notifyAdviser({
      project,
      submission,
      notifType: 'chapter_submitted',
      notifTitle: 'New Chapter Submission',
      docLabel: `Chapter ${chapter} (v${nextVersion})`,
      extraMetadata: { chapter },
    });

    project.projectStatus = PROJECT_STATUSES.PENDING_IN_REVIEW;
    await project.save();

    return { submission };
  }

  /* ═══════════════════ Upload: Proposal Compilation ═══════════════════ */

  /**
   * Compile and upload the full proposal document.
   *
   * Business rules enforced:
   * - User must be a student on the owning team
   * - Project must be active with approved title
   * - Chapters 1, 2, and 3 must each have at least one LOCKED submission
   * - Late submission detection against proposal deadline
   * - Version auto-increments from previous proposal uploads
   *
   * On success, the project status transitions to PROPOSAL_SUBMITTED.
   *
   * @param {string} userId - The authenticated student
   * @param {string} projectId - Target project
   * @param {Object} data - { remarks }
   * @param {Object} file - multer file object with buffer, originalname, size, validatedMime
   * @returns {Object} { submission }
   */
  async compileProposal(userId, projectId, data, file) {
    const { user, project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'compile proposals',
    );
    const { remarks } = data;

    const hasAdviser = Boolean(project.adviserId);
    if (!hasAdviser) {
      throw new AppError(
        'Proposal submission requires an assigned adviser.',
        400,
        'MISSING_ADVISER',
      );
    }

    if (!Array.isArray(project.panelistIds) || project.panelistIds.length !== 3) {
      throw new AppError(
        'Capstone 1 defense requires exactly 3 assigned panelists before proposal submission.',
        400,
        'THREE_PANELISTS_REQUIRED',
      );
    }

    // --- Project state checks (proposal-specific) ---
    if (
      ![
        PROJECT_STATUSES.ACTIVE,
        PROJECT_STATUSES.PENDING_FOR_SUBMISSION,
        PROJECT_STATUSES.PENDING_IN_REVIEW,
        PROJECT_STATUSES.REVISION_NEEDED,
      ].includes(project.projectStatus)
    ) {
      throw new AppError(
        'Cannot submit proposal for a non-active project.',
        400,
        'PROJECT_NOT_ACTIVE',
      );
    }
    if (project.titleStatus !== TITLE_STATUSES.APPROVED) {
      throw new AppError(
        'Your project title must be approved before submitting a proposal.',
        400,
        'TITLE_NOT_APPROVED',
      );
    }

    // --- Validate that Chapters 1, 2, and 3 each have a LOCKED submission ---
    const requiredChapters = [1, 2, 3];
    for (const ch of requiredChapters) {
      const locked = await Submission.findOne({
        projectId,
        chapter: ch,
        type: 'chapter',
        status: SUBMISSION_STATUSES.LOCKED,
      });
      if (!locked) {
        throw new AppError(
          `Chapter ${ch} must be approved (locked) before compiling the proposal.`,
          400,
          'CHAPTER_NOT_LOCKED',
        );
      }
    }

    // --- Late submission detection ---
    const { isLate } = this._detectLateSubmission(project, 'proposal', remarks);

    // --- Auto-increment version for proposals ---
    const latestProposal = await Submission.findOne({
      projectId,
      type: 'proposal',
    }).sort({ version: -1 });
    const nextVersion = latestProposal ? latestProposal.version + 1 : 1;

    // --- Upload to S3 ---
    const storageKey = storageService.buildProposalKey(projectId, nextVersion, file.originalname);
    try {
      await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
        projectId,
        type: 'proposal',
        version: String(nextVersion),
        uploadedBy: userId,
      });
    } catch (error) {
      if (error.isOperational) {
        logger.error('[SubmissionService] Proposal upload failed:', error.code, error.message);
        throw error;
      }
      logger.error('[SubmissionService] Unexpected proposal upload error:', error);
      throw new AppError(
        'Failed to upload proposal document. Please try again later.',
        500,
        'PROPOSAL_UPLOAD_ERROR',
      );
    }

    const driveSync = await this._syncSubmissionToUserDriveAndGoogleDoc({
      user,
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.validatedMime,
      projectId,
      version: nextVersion,
      type: 'proposal',
    });

    const extractedMetadata = await this._extractUploadedPdfMetadata(file);

    // --- Create submission record ---
    const submission = await Submission.create({
      projectId,
      type: 'proposal',
      chapter: null,
      version: nextVersion,
      fileName: file.originalname,
      fileType: file.validatedMime,
      fileSize: file.size,
      storageKey,
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: userId,
      isLate,
      remarks: remarks || null,
      userDriveFolderId: driveSync.userDriveFolderId,
      driveFileId: driveSync.driveFileId,
      driveWebViewLink: driveSync.driveWebViewLink,
      driveWebContentLink: driveSync.driveWebContentLink,
      syncedGoogleDocId: driveSync.syncedGoogleDocId,
      syncedGoogleDocUrl: driveSync.syncedGoogleDocUrl,
      googleDocSyncStatus: driveSync.googleDocSyncStatus,
      googleDocSyncErrorCode: driveSync.googleDocSyncErrorCode,
      googleDocSyncErrorMessage: driveSync.googleDocSyncErrorMessage,
      googleDocSyncedAt: driveSync.googleDocSyncedAt,
      documentTitle: extractedMetadata.documentTitle,
      documentAbstract: extractedMetadata.documentAbstract,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    await this._syncPendingRoundForUpload(submission);

    // --- Plagiarism + Notification (shared pipeline) ---
    await this._enqueuePlagiarism(submission, {
      storageKey,
      fileType: file.validatedMime,
      projectId,
      type: 'proposal',
    });

    // --- Transition project status to PENDING_IN_REVIEW ---
    project.projectStatus = PROJECT_STATUSES.PENDING_IN_REVIEW;
    await project.save();

    await this._notifyAdviser({
      project,
      submission,
      notifType: 'proposal_submitted',
      notifTitle: 'Proposal Submitted',
      docLabel: `The compiled proposal (v${nextVersion})`,
    });

    return { submission };
  }

  /* ═══════════════════ Upload: Supporting Documents ═══════════════════ */

  /**
   * Shared pre-validation for supporting uploads (system design + test results).
   * Requires active project, approved title, and assigned adviser.
   *
   * @param {Object} project
   */
  _assertSupportingDocumentEligible(project) {
    if (
      ![
        PROJECT_STATUSES.ACTIVE,
        PROJECT_STATUSES.PENDING_FOR_SUBMISSION,
        PROJECT_STATUSES.PENDING_IN_REVIEW,
        PROJECT_STATUSES.REVISION_NEEDED,
      ].includes(project.projectStatus)
    ) {
      throw new AppError(
        'Supporting document uploads are only allowed for active projects.',
        400,
        'PROJECT_NOT_ACTIVE',
      );
    }

    if (project.titleStatus !== TITLE_STATUSES.APPROVED) {
      throw new AppError(
        'Your project title must be approved before uploading supporting documents.',
        400,
        'TITLE_NOT_APPROVED',
      );
    }

    if (!project.adviserId) {
      throw new AppError(
        'An assigned adviser is required before uploading supporting documents.',
        400,
        'MISSING_ADVISER',
      );
    }
  }

  /**
   * Shared upload pipeline for supporting document types.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.projectId
   * @param {Object} params.user
   * @param {Object} params.project
   * @param {string} params.remarks
   * @param {Object} params.file
   * @param {'system_design'|'test_results'} params.type
   * @param {Function} params.buildStorageKey
   * @param {string} params.notifTitle
   * @param {string} params.docLabelPrefix
   * @returns {Promise<{ submission: Object }>}
   */
  async _uploadSupportingDocument({
    userId,
    projectId,
    user,
    project,
    remarks,
    file,
    type,
    buildStorageKey,
    notifTitle,
    docLabelPrefix,
  }) {
    const { isLate } = this._detectLateSubmission(project, 'proposal', remarks);

    const latest = await Submission.findOne({ projectId, type }).sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    const storageKey = buildStorageKey(projectId, nextVersion, file.originalname);
    try {
      await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
        projectId,
        type,
        version: String(nextVersion),
        uploadedBy: userId,
      });
    } catch (error) {
      if (error.isOperational) {
        logger.error(
          `[SubmissionService] Supporting document (${type}) upload failed:`,
          error.code,
          error.message,
        );
        throw error;
      }
      logger.error(
        `[SubmissionService] Unexpected supporting document (${type}) upload error:`,
        error,
      );
      throw new AppError(
        'Failed to upload supporting document. Please try again later.',
        500,
        'SUPPORTING_DOCUMENT_UPLOAD_ERROR',
      );
    }

    const driveSync = await this._syncSubmissionToUserDriveAndGoogleDoc({
      user,
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.validatedMime,
      projectId,
      version: nextVersion,
      type,
    });

    const extractedMetadata = await this._extractUploadedPdfMetadata(file);

    const submission = await Submission.create({
      projectId,
      type,
      chapter: null,
      version: nextVersion,
      fileName: file.originalname,
      fileType: file.validatedMime,
      fileSize: file.size,
      storageKey,
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: userId,
      isLate,
      remarks: remarks || null,
      userDriveFolderId: driveSync.userDriveFolderId,
      driveFileId: driveSync.driveFileId,
      driveWebViewLink: driveSync.driveWebViewLink,
      driveWebContentLink: driveSync.driveWebContentLink,
      syncedGoogleDocId: driveSync.syncedGoogleDocId,
      syncedGoogleDocUrl: driveSync.syncedGoogleDocUrl,
      googleDocSyncStatus: driveSync.googleDocSyncStatus,
      googleDocSyncErrorCode: driveSync.googleDocSyncErrorCode,
      googleDocSyncErrorMessage: driveSync.googleDocSyncErrorMessage,
      googleDocSyncedAt: driveSync.googleDocSyncedAt,
      documentTitle: extractedMetadata.documentTitle,
      documentAbstract: extractedMetadata.documentAbstract,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    await this._syncPendingRoundForUpload(submission);

    await this._enqueuePlagiarism(submission, {
      storageKey,
      fileType: file.validatedMime,
      projectId,
      type,
    });

    await this._notifyAdviser({
      project,
      submission,
      notifType: 'chapter_submitted',
      notifTitle,
      docLabel: `${docLabelPrefix} (v${nextVersion})`,
      extraMetadata: { type },
    });

    return { submission };
  }

  /**
   * Upload system design document for adviser review.
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} data - { remarks }
   * @param {Object} file - multer file object
   * @returns {Promise<{ submission: Object }>}
   */
  async uploadSystemDesign(userId, projectId, data, file) {
    const { user, project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'upload supporting documents',
    );
    this._assertSupportingDocumentEligible(project);

    return this._uploadSupportingDocument({
      userId,
      projectId,
      user,
      project,
      remarks: data.remarks,
      file,
      type: 'system_design',
      buildStorageKey: storageService.buildSystemDesignKey.bind(storageService),
      notifTitle: 'System Design Submitted',
      docLabelPrefix: 'The system design document',
    });
  }

  /**
   * Upload test results document for adviser review.
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} data - { remarks }
   * @param {Object} file - multer file object
   * @returns {Promise<{ submission: Object }>}
   */
  async uploadTestResults(userId, projectId, data, file) {
    const { user, project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'upload supporting documents',
    );
    this._assertSupportingDocumentEligible(project);

    return this._uploadSupportingDocument({
      userId,
      projectId,
      user,
      project,
      remarks: data.remarks,
      file,
      type: 'test_results',
      buildStorageKey: storageService.buildTestResultsKey.bind(storageService),
      notifTitle: 'Test Results Submitted',
      docLabelPrefix: 'The test results document',
    });
  }

  /* ═══════════════════ Upload: Final Papers (Capstone 4) ═══════════════════ */

  /**
   * Shared pre-validation for both final paper types (academic + journal).
   * Checks capstone phase 4 and title approval status.
   *
   * @param {Object} project
   */
  _assertFinalPaperEligible(project) {
    if (
      ![
        PROJECT_STATUSES.ACTIVE,
        PROJECT_STATUSES.PENDING_FOR_SUBMISSION,
        PROJECT_STATUSES.PENDING_IN_REVIEW,
        PROJECT_STATUSES.REVISION_NEEDED,
      ].includes(project.projectStatus)
    ) {
      throw new AppError(
        'Final paper uploads are only allowed for active projects.',
        400,
        'PROJECT_NOT_ACTIVE',
      );
    }

    if (project.capstonePhase !== 4) {
      throw new AppError(
        'Final paper uploads are only allowed in Capstone Phase 4.',
        400,
        'WRONG_PHASE',
      );
    }
    if (project.titleStatus !== TITLE_STATUSES.APPROVED) {
      throw new AppError(
        'Your project title must be approved before uploading final papers.',
        400,
        'TITLE_NOT_APPROVED',
      );
    }
  }

  /**
   * Shared upload pipeline for both final paper types (academic + journal).
   * Handles: late detection → version increment → S3 upload → Drive mirror →
   * submission creation → plagiarism enqueue → adviser notification.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.projectId
   * @param {Object} params.user - Authenticated uploader
   * @param {Object} params.project - Hydrated project
   * @param {string} params.remarks
   * @param {Object} params.file - multer file
   * @param {'final_academic'|'final_journal'} params.type
   * @param {Function} params.buildStorageKey - storageService key builder
   * @param {string} params.notifTitle - E.g. "Final Academic Paper Submitted"
   * @param {string} params.docLabelPrefix - E.g. "The full academic version"
   * @returns {Promise<{ submission: Object }>}
   */
  async _uploadFinalPaper({
    userId,
    projectId,
    user,
    project,
    remarks,
    file,
    type,
    buildStorageKey,
    notifTitle,
    docLabelPrefix,
  }) {
    // --- Late submission detection ---
    const { isLate } = this._detectLateSubmission(project, 'defense', remarks);

    // --- Auto-increment version ---
    const latest = await Submission.findOne({ projectId, type }).sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    // --- Upload to S3 ---
    const storageKey = buildStorageKey(projectId, nextVersion, file.originalname);
    try {
      await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
        projectId,
        type,
        version: String(nextVersion),
        uploadedBy: userId,
      });
    } catch (error) {
      if (error.isOperational) {
        logger.error(
          `[SubmissionService] Final paper (${type}) upload failed:`,
          error.code,
          error.message,
        );
        throw error;
      }
      logger.error(`[SubmissionService] Unexpected final paper (${type}) upload error:`, error);
      throw new AppError(
        'Failed to upload final paper. Please try again later.',
        500,
        'FINAL_PAPER_UPLOAD_ERROR',
      );
    }

    // --- Legacy Drive archive mirror (best-effort) ---
    await this._mirrorFinalToDrive({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.validatedMime,
      projectId,
      version: nextVersion,
      type,
    });

    // --- User Drive storage + Google Doc sync (best-effort) ---
    const driveSync = await this._syncSubmissionToUserDriveAndGoogleDoc({
      user,
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.validatedMime,
      projectId,
      version: nextVersion,
      type,
    });

    const extractedMetadata = await this._extractUploadedPdfMetadata(file);

    // --- Create submission record ---
    const submission = await Submission.create({
      projectId,
      type,
      chapter: null,
      version: nextVersion,
      fileName: file.originalname,
      fileType: file.validatedMime,
      fileSize: file.size,
      storageKey,
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: userId,
      isLate,
      remarks: remarks || null,
      userDriveFolderId: driveSync.userDriveFolderId,
      driveFileId: driveSync.driveFileId,
      driveWebViewLink: driveSync.driveWebViewLink,
      driveWebContentLink: driveSync.driveWebContentLink,
      syncedGoogleDocId: driveSync.syncedGoogleDocId,
      syncedGoogleDocUrl: driveSync.syncedGoogleDocUrl,
      googleDocSyncStatus: driveSync.googleDocSyncStatus,
      googleDocSyncErrorCode: driveSync.googleDocSyncErrorCode,
      googleDocSyncErrorMessage: driveSync.googleDocSyncErrorMessage,
      googleDocSyncedAt: driveSync.googleDocSyncedAt,
      documentTitle: extractedMetadata.documentTitle,
      documentAbstract: extractedMetadata.documentAbstract,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    await this._syncPendingRoundForUpload(submission);

    // --- Plagiarism + Notification (shared pipeline) ---
    await this._enqueuePlagiarism(submission, {
      storageKey,
      fileType: file.validatedMime,
      projectId,
      type,
    });

    await this._notifyAdviser({
      project,
      submission,
      notifType: 'chapter_submitted',
      notifTitle,
      docLabel: `${docLabelPrefix} (v${nextVersion})`,
      extraMetadata: { type },
    });

    return { submission };
  }

  /**
   * Upload the full Academic Version of the final paper.
   * This version is restricted to faculty only (viewable within the system).
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} data - { remarks }
   * @param {Object} file - multer file object
   * @returns {Object} { submission }
   */
  async uploadFinalAcademic(userId, projectId, data, file) {
    const { user, project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'upload final papers',
    );
    this._assertFinalPaperEligible(project);

    return this._uploadFinalPaper({
      userId,
      projectId,
      user,
      project,
      remarks: data.remarks,
      file,
      type: 'final_academic',
      buildStorageKey: storageService.buildFinalAcademicKey.bind(storageService),
      notifTitle: 'Final Academic Paper Submitted',
      docLabelPrefix: 'The full academic version',
    });
  }

  /**
   * Upload the Journal/Publishable Version of the final paper.
   * This version is public-facing for archive searches.
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} data - { remarks }
   * @param {Object} file - multer file object
   * @returns {Object} { submission }
   */
  async uploadFinalJournal(userId, projectId, data, file) {
    const { user, project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'upload final papers',
    );
    this._assertFinalPaperEligible(project);

    return this._uploadFinalPaper({
      userId,
      projectId,
      user,
      project,
      remarks: data.remarks,
      file,
      type: 'final_journal',
      buildStorageKey: storageService.buildFinalJournalKey.bind(storageService),
      notifTitle: 'Journal Version Submitted',
      docLabelPrefix: 'The journal/publishable version',
    });
  }

  /* ═══════════════════ Read ═══════════════════ */

  /**
   * Get a single submission by ID with populated references.
   * @param {string} submissionId
   * @param {string} requesterId
   * @returns {Object} { submission }
   */
  async getSubmission(submissionId, requesterId) {
    const submission = await Submission.findById(submissionId)
      .populate('submittedBy', 'firstName middleName lastName email')
      .populate('reviewedBy', 'firstName middleName lastName email')
      .populate('annotations.userId', 'firstName middleName lastName email')
      .populate('annotations.replies.userId', 'firstName middleName lastName email');

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const user = await User.findById(requesterId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const project = await Project.findById(submission.projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanViewSubmission(user, project, submission);

    const enrichedSubmission = submission.toObject();
    const deadlineInfo = this._resolveSubmissionDeadlineInfo(enrichedSubmission, project);
    enrichedSubmission.deadlineField = deadlineInfo.deadlineField;
    enrichedSubmission.deadlineAt = deadlineInfo.deadlineAt;

    return { submission: enrichedSubmission };
  }

  /**
   * Get all submissions for a project with optional filters and pagination.
   * Authorization: instructor, assigned adviser, assigned panelist, or project team student.
   *
   * @param {string} projectId
   * @param {Object} query - { chapter?, status?, page, limit }
   * @param {string} requesterId - The authenticated user's ID
   * @returns {Object} { submissions, pagination }
   */
  async getSubmissionsByProject(projectId, query = {}, requesterId) {
    // Fetch project with team members for authorization check
    const project = await Project.findById(projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    // Fetch user for authorization check
    const user = await User.findById(requesterId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Verify the user has permission to view this project's submissions
    this._assertCanViewSubmission(user, project);

    const { chapter, status, page = 1, limit = 10 } = query;

    const filter = { projectId };
    if (chapter) filter.chapter = chapter;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .sort({ chapter: 1, version: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'firstName middleName lastName email'),
      Submission.countDocuments(filter),
    ]);

    const enrichedSubmissions = submissions.map((item) => {
      const submission = item.toObject();
      const deadlineInfo = this._resolveSubmissionDeadlineInfo(submission, project);
      submission.deadlineField = deadlineInfo.deadlineField;
      submission.deadlineAt = deadlineInfo.deadlineAt;
      return submission;
    });

    return {
      submissions: enrichedSubmissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the version history for a specific chapter of a project.
   * Authorization: instructor, assigned adviser, assigned panelist, or project team student.
   * Returns all versions in descending order.
   *
   * @param {string} projectId
   * @param {number} chapter
   * @param {string} requesterId - The authenticated user's ID
   * @returns {Object} { submissions }
   */
  async getChapterHistory(projectId, chapter, requesterId) {
    // Fetch project with team members for authorization check
    const project = await Project.findById(projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    // Fetch user for authorization check
    const user = await User.findById(requesterId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Verify the user has permission to view this project's submissions
    this._assertCanViewSubmission(user, project);

    const submissions = await Submission.find({ projectId, chapter })
      .sort({ version: -1 })
      .populate('submittedBy', 'firstName middleName lastName email')
      .populate('reviewedBy', 'firstName middleName lastName email');

    return { submissions };
  }

  /**
   * Get the latest submission for a specific chapter.
   * Authorization: instructor, assigned adviser, assigned panelist, or project team student.
   *
   * @param {string} projectId
   * @param {number} chapter
   * @param {string} requesterId - The authenticated user's ID
   * @returns {Object} { submission } (null if no submissions exist)
   */
  async getLatestChapterSubmission(projectId, chapter, requesterId) {
    // Fetch project with team members for authorization check
    const project = await Project.findById(projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    // Fetch user for authorization check
    const user = await User.findById(requesterId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Verify the user has permission to view this project's submissions
    this._assertCanViewSubmission(user, project);

    const submission = await Submission.findOne({ projectId, chapter })
      .sort({ version: -1 })
      .populate('submittedBy', 'firstName middleName lastName email')
      .populate('reviewedBy', 'firstName middleName lastName email');

    return { submission };
  }

  /* ═══════════════════ Signed URL ═══════════════════ */

  /**
   * Generate a pre-signed URL for viewing a submission's document.
   * Authorization must be checked by the controller before calling this.
   *
   * @param {string} submissionId
   * @param {string} requesterId
   * @returns {Object} { url, expiresIn }
   */
  async getViewUrl(submissionId, requesterId) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const user = await User.findById(requesterId).select('role teamId');
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    const project = await Project.findById(submission.projectId).populate('teamId', 'members');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    this._assertCanViewSubmission(user, project, submission, {
      allowArchivedFinalJournalPublicView: true,
    });

    const expiresIn = 3600; // 1 hour

    const fallbackUrl = this._resolveSubmissionFallbackUrl(submission);

    if (!submission.storageKey) {
      if (fallbackUrl) {
        return { url: fallbackUrl, expiresIn, source: 'google_drive' };
      }

      throw new AppError(
        'Submission file is unavailable. Please ask the student to upload a new revision.',
        404,
        'SUBMISSION_FILE_UNAVAILABLE',
      );
    }

    try {
      const url = await storageService.getSignedUrl(submission.storageKey, expiresIn);
      return { url, expiresIn, source: 's3' };
    } catch {
      if (fallbackUrl) {
        return { url: fallbackUrl, expiresIn, source: 'google_drive' };
      }

      throw new AppError(
        'Submission file is unavailable. Please ask the student to upload a new revision.',
        404,
        'SUBMISSION_FILE_UNAVAILABLE',
      );
    }
  }

  /**
   * Get Google Docs comments for a submission's synced document.
   *
   * Returns a status envelope so the frontend can gracefully render fallback states:
   * - ok: comments retrieved
   * - not_linked: submission has no synced Google Doc
   * - unavailable: Google integration not configured
   * - error: API call failed
   *
   * @param {string} submissionId
   * @param {string} requesterId
   * @returns {Promise<{status:string, docId:string|null, comments:Array, message?:string}>}
   */
  async getGoogleDocComments(submissionId, requesterId) {
    const submission = await Submission.findById(submissionId).select(
      'projectId syncedGoogleDocId type',
    );
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const user = await User.findById(requesterId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const project = await Project.findById(submission.projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanViewSubmission(user, project, submission);

    if (!submission.syncedGoogleDocId) {
      return {
        status: 'not_linked',
        docId: null,
        comments: [],
        message: 'This submission is not linked to a Google Doc.',
      };
    }

    if (!googleDriveReviewService.isConfigured()) {
      return {
        status: 'unavailable',
        docId: submission.syncedGoogleDocId,
        comments: [],
        message:
          'Google Docs comments integration is unavailable in this environment. Open the document file to review native comments.',
      };
    }

    try {
      const comments = [];
      let pageToken = null;

      do {
        const page = await googleDriveReviewService.listComments(
          submission.syncedGoogleDocId,
          pageToken,
        );

        comments.push(...(page?.comments || []));
        pageToken = page?.nextPageToken || null;
      } while (pageToken);

      return {
        status: 'ok',
        docId: submission.syncedGoogleDocId,
        comments,
        totalCount: comments.length,
      };
    } catch (error) {
      return {
        status: 'error',
        docId: submission.syncedGoogleDocId,
        comments: [],
        message:
          error?.message || 'Unable to load Google Docs comments right now. Please try again.',
      };
    }
  }

  /* ═══════════════════ Plagiarism ═══════════════════ */

  /**
   * Get the plagiarism/originality check status for a submission.
   *
   * @param {string} submissionId
   * @returns {Object} { submissionId, plagiarismResult, originalityScore }
   */
  async getPlagiarismStatus(submissionId, requesterId) {
    const { submission } = await this.getSubmissionViewContext(submissionId, requesterId, {
      submissionSelect: 'projectId type plagiarismResult originalityScore',
    });

    return {
      submissionId: submission._id,
      originalityScore: submission.originalityScore,
      plagiarismResult: submission.plagiarismResult || {},
    };
  }

  /**
   * Get the full PlagiarismReport (match list with character-level spans and
   * source snippets) for the highlight-and-compare viewer.
   *
   * @param {string} submissionId
   * @param {string} requesterId
   * @returns {Object} { submissionId, originalityScore, fullReport, matchedSources }
   */
  async getPlagiarismReport(submissionId, requesterId) {
    if (!requesterId) {
      throw new AppError(
        'Authentication required to access plagiarism reports.',
        401,
        'UNAUTHENTICATED',
      );
    }

    const { submission } = await this.getSubmissionViewContext(submissionId, requesterId, {
      submissionSelect: 'projectId type plagiarismResult originalityScore extractedText',
    });

    const collectionResult = await PlagiarismResult.findOne({ submissionId: submission._id })
      .select('status similarityPercentage textMatches rawData checkedAt completedAt')
      .lean();

    const { plagiarismResult, extractedText } = submission;

    const effectiveStatus = plagiarismResult?.status || collectionResult?.status || null;

    if (effectiveStatus !== PLAGIARISM_STATUSES.COMPLETED) {
      throw new AppError(
        'Plagiarism check has not completed yet.',
        400,
        'PLAGIARISM_NOT_COMPLETED',
      );
    }

    const originalityScore =
      submission.originalityScore ??
      plagiarismResult?.originalityScore ??
      (Number.isFinite(collectionResult?.similarityPercentage)
        ? Math.max(0, 100 - collectionResult.similarityPercentage)
        : null);

    const fullReport = plagiarismResult?.fullReport || collectionResult?.rawData || null;

    const matchedSources =
      (Array.isArray(plagiarismResult?.matchedSources) && plagiarismResult.matchedSources) ||
      this._toMatchedSourcesFromCollection(collectionResult);

    return {
      submissionId: submission._id,
      originalityScore,
      extractedText: extractedText || null,
      fullReport,
      matchedSources,
      processedAt:
        plagiarismResult?.processedAt ||
        collectionResult?.completedAt ||
        collectionResult?.checkedAt,
    };
  }

  /* ═══════════════════ Review Workflow ═══════════════════ */

  /**
   * Review a submission — approve, request revisions, or reject.
   * Instructors and assigned advisers can review submissions.
   * Proposal approvals are restricted to instructors and assigned panelists.
   *
   * @param {string} submissionId
   * @param {string} reviewerId - The reviewing faculty member
   * @param {Object} data - { status, reviewNote }
   * @returns {Object} { submission }
   */
  async reviewSubmission(submissionId, reviewerId, data) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const { reviewer } = await this._getModerationContext(submission, reviewerId, {
      allowPanelist: true,
    });

    if (reviewer.role === ROLES.PANELIST && submission.type !== 'proposal') {
      throw new AppError(
        'Panelists can only review proposal submissions.',
        403,
        'PANELIST_PROPOSAL_ONLY',
      );
    }

    if (submission.status === SUBMISSION_STATUSES.LOCKED) {
      throw new AppError('Cannot review a locked submission.', 400, 'SUBMISSION_LOCKED');
    }

    const { status, reviewNote } = data;

    if (
      submission.type === 'proposal' &&
      status === SUBMISSION_STATUSES.APPROVED &&
      ![ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST].includes(reviewer.role)
    ) {
      throw new AppError(
        'Only instructors, assigned advisers, and assigned panelists can approve proposals.',
        403,
        'PROPOSAL_APPROVAL_FORBIDDEN_ROLE',
      );
    }

    submission.status = status;
    submission.reviewedBy = reviewerId;
    submission.reviewNote = reviewNote || null;
    submission.reviewedAt = new Date(); // Phase 1: Track review timestamp

    // --- Set revision deadline if revisions requested ---
    if (status === SUBMISSION_STATUSES.REVISIONS_REQUIRED) {
      const revisionDeadlineDate = new Date();
      revisionDeadlineDate.setDate(
        revisionDeadlineDate.getDate() + submission.revisionExpectedDays,
      );
      submission.revisionDeadline = revisionDeadlineDate;
    }

    // --- Plagiarism check enforcement before approval ---
    if (status === SUBMISSION_STATUSES.APPROVED) {
      // Fetch plagiarism result from database
      let plagiarismResult = await PlagiarismResult.findOne({
        submissionId: submission._id,
      }).lean();
      plagiarismResult = await this._reconcileStalePlagiarismResult(
        submission._id,
        plagiarismResult,
      );
      if (!plagiarismResult || plagiarismResult.status !== PLAGIARISM_STATUSES.COMPLETED) {
        plagiarismResult = await this._ensureMockPlagiarismForApproval(submission);
      }

      // Require completed plagiarism check before approval
      if (!plagiarismResult || plagiarismResult.status !== PLAGIARISM_STATUSES.COMPLETED) {
        throw new AppError(
          'Plagiarism check must be completed before approving this submission. Please run the plagiarism checker first.',
          400,
          'PLAGIARISM_CHECK_REQUIRED',
        );
      }

      // Check similarity threshold
      const threshold = await this._getPlagiarismRejectThreshold();
      if (plagiarismResult.similarityPercentage > threshold) {
        throw new AppError(
          `Cannot approve: Plagiarism score (${plagiarismResult.similarityPercentage.toFixed(1)}%) exceeds threshold (${threshold}%). Please review matched sources or request revisions.`,
          400,
          'PLAGIARISM_SCORE_TOO_HIGH',
        );
      }

      // Threshold passed - lock submission to prevent further edits
      submission.status = SUBMISSION_STATUSES.LOCKED;
    }

    await submission.save();

    // --- Index approved submission in plagiarism corpus ---
    if (status === SUBMISSION_STATUSES.APPROVED) {
      try {
        // Note: Full corpus indexing will be implemented when plagiarism service integration is complete
        // For now, we log the intent. Full implementation requires:
        // 1. Import plagiarismService
        // 2. Extract text from file (using textExtraction utility)
        // 3. Call plagiarismService.indexDocument()
        logger.info(
          { submissionId: submission._id, projectId: submission.projectId },
          'Submission approved - ready for corpus indexing',
        );

        // TODO: Uncomment when plagiarism service corpus indexing is ready
        // const plagiarismService = require('../plagiarism/plagiarism.service');
        // await plagiarismService.indexDocument({
        //   documentId: submission._id.toString(),
        //   text: submission.extractedText || '',
        //   title: `${submission.type} - Chapter ${submission.chapter || 'N/A'}`,
        //   metadata: {
        //     projectId: submission.projectId.toString(),
        //     chapter: submission.chapter,
        //     type: submission.type,
        //   },
        // });
      } catch (indexError) {
        // Don't fail approval if indexing fails
        logger.error(
          { error: indexError, submissionId: submission._id },
          'Failed to index submission in plagiarism corpus',
        );
      }
    }

    // --- Project status transition based on submission review ---
    const project = await Project.findById(submission.projectId);
    if (project) {
      if (status === SUBMISSION_STATUSES.REVISIONS_REQUIRED) {
        project.projectStatus = PROJECT_STATUSES.REVISION_NEEDED;
        await project.save();
      } else if (status === SUBMISSION_STATUSES.APPROVED || status === 'approved') {
        if (submission.type === 'proposal' && project.capstonePhase === 1) {
          project.capstonePhase = 2;
        }
        project.projectStatus = PROJECT_STATUSES.PENDING_FOR_SUBMISSION;
        await project.save();
      }
    }

    // --- Notify the submitter ---
    const notifType =
      status === SUBMISSION_STATUSES.APPROVED || status === 'approved'
        ? 'submission_approved'
        : status === SUBMISSION_STATUSES.REVISIONS_REQUIRED
          ? 'submission_revisions_required'
          : 'submission_rejected';

    const statusLabel =
      status === 'approved'
        ? 'approved & locked'
        : status === 'revisions_required'
          ? 'sent back for revisions'
          : 'rejected';

    const docLabel =
      submission.type === 'proposal'
        ? `Proposal (v${submission.version})`
        : `Chapter ${submission.chapter} (v${submission.version})`;

    const revisionDeadlineText =
      status === SUBMISSION_STATUSES.REVISIONS_REQUIRED && submission.revisionDeadline
        ? ` Revision deadline: ${submission.revisionDeadline.toISOString().slice(0, 10)}.`
        : '';

    await Notification.create({
      userId: submission.submittedBy,
      type: notifType,
      title: 'Submission Reviewed',
      message: `Your ${docLabel} has been ${statusLabel}.${revisionDeadlineText}`,
      metadata: {
        submissionId: submission._id,
        projectId: submission.projectId,
        chapter: submission.chapter,
        type: submission.type,
        newStatus: submission.status,
        reviewedAt: submission.reviewedAt,
        revisionDeadline: submission.revisionDeadline,
      },
    }).then((n) => emitToUser(n.userId, 'notification:new', n));

    return { submission };
  }

  /* ═══════════════════ Unlock Request ═══════════════════ */

  /**
   * Request to unlock a locked submission.
   * Sets the status back to PENDING so the student can re-upload.
   * Only the project's adviser can approve this (enforced in controller).
   *
   * @param {string} submissionId
   * @param {string} adviserId - The approving adviser
   * @param {string} reason - Reason for unlock (provided by student, forwarded by adviser)
   * @returns {Object} { submission }
   */
  async unlockSubmission(submissionId, adviserId, reason) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    await this._getModerationContext(submission, adviserId);

    if (submission.status !== SUBMISSION_STATUSES.LOCKED) {
      throw new AppError('Only locked submissions can be unlocked.', 400, 'NOT_LOCKED');
    }

    submission.status = SUBMISSION_STATUSES.PENDING;
    submission.reviewNote = `Unlocked by adviser. Reason: ${reason}`;
    await submission.save();

    // Notify the submitter
    const unlockNotif = await Notification.create({
      userId: submission.submittedBy,
      type: 'unlock_resolved',
      title: 'Submission Unlocked',
      message: `Your Chapter ${submission.chapter} (v${submission.version}) has been unlocked. You may now upload a new version.`,
      metadata: {
        submissionId: submission._id,
        projectId: submission.projectId,
        chapter: submission.chapter,
      },
    });
    emitToUser(submission.submittedBy, 'notification:new', unlockNotif);

    return { submission };
  }

  /* ═══════════════════ Annotations ═══════════════════ */

  /**
   * Add an annotation (highlight & comment) to a submission.
   * Only advisers and instructors can annotate.
   *
   * @param {string} submissionId
   * @param {string} userId - The annotating faculty member
   * @param {Object} data - { page, lineStart, lineEnd, content, selectedText, highlightCoords }
   * @returns {Object} { submission }
   */
  async addAnnotation(submissionId, userId, data) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    await this._getModerationContext(submission, userId);

    submission.annotations.push({
      userId,
      page: data.page || 1,
      lineStart: data.lineStart || null,
      lineEnd: data.lineEnd || null,
      content: data.content,
      selectedText: data.selectedText || '',
      highlightCoords: data.highlightCoords || null,
    });

    await submission.save();

    // Notify the submitter
    const annotNotif = await Notification.create({
      userId: submission.submittedBy,
      type: 'annotation_added',
      title: 'New Comment on Submission',
      message: `A faculty member added a comment on your Chapter ${submission.chapter} (v${submission.version}).`,
      metadata: {
        submissionId: submission._id,
        projectId: submission.projectId,
        chapter: submission.chapter,
      },
    });
    emitToUser(submission.submittedBy, 'notification:new', annotNotif);

    return { submission };
  }

  /**
   * Add a threaded reply to an existing annotation.
   *
   * @param {string} submissionId
   * @param {string} annotationId
   * @param {string} userId
   * @param {{ content: string }} data
   * @returns {Object} { submission }
   */
  async addAnnotationReply(submissionId, annotationId, userId, data) {
    const { submission } = await this.getSubmissionViewContext(submissionId, userId, {
      submissionSelect: 'projectId type annotations',
    });

    const annotation = submission.annotations.id(annotationId);
    if (!annotation) {
      throw new AppError('Annotation not found.', 404, 'ANNOTATION_NOT_FOUND');
    }

    annotation.replies.push({
      userId,
      content: data.content,
    });

    await submission.save();

    return { submission };
  }

  /**
   * Remove an annotation from a submission.
   * Only the annotation author or an instructor can remove it.
   *
   * @param {string} submissionId
   * @param {string} annotationId
   * @param {string} userId
   * @param {string} userRole
   * @returns {Object} { submission }
   */
  async removeAnnotation(submissionId, annotationId, userId, userRole) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    await this._getModerationContext(submission, userId);

    const annotation = submission.annotations.id(annotationId);
    if (!annotation) {
      throw new AppError('Annotation not found.', 404, 'ANNOTATION_NOT_FOUND');
    }

    // Only author or instructor can delete
    if (annotation.userId.toString() !== userId.toString() && userRole !== ROLES.INSTRUCTOR) {
      throw new AppError('You can only remove your own annotations.', 403, 'FORBIDDEN');
    }

    submission.annotations.pull({ _id: annotationId });
    await submission.save();

    return { submission };
  }

  /**
   * Mark an annotation as resolved (adviser/instructor marks it as addressed).
   *
   * @param {string} submissionId
   * @param {string} annotationId
   * @param {string} userId - The faculty member marking as resolved
   * @returns {Object} { submission }
   */
  async markAnnotationResolved(submissionId, annotationId, userId) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    await this._getModerationContext(submission, userId);

    const annotation = submission.annotations.id(annotationId);
    if (!annotation) {
      throw new AppError('Annotation not found.', 404, 'ANNOTATION_NOT_FOUND');
    }

    annotation.resolved = true;
    annotation.resolvedAt = new Date();
    await submission.save();

    return { submission };
  }

  /**
   * Get submission feedback context: annotations, review notes, timeline, deadline.
   * Includes review timeline and calculated deadline info.
   *
   * @param {string} submissionId
   * @param {string} userId - Current user
   * @param {string} userRole - User's role
   * @returns {Object} { feedback }
   */
  async getSubmissionFeedback(submissionId, userId, _userRole) {
    const submission = await Submission.findById(submissionId)
      .populate('submittedBy', 'name email')
      .populate('projectId', 'title')
      .lean();

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const user = await User.findById(userId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const projectId = submission.projectId?._id || submission.projectId;
    const project = await Project.findById(projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanViewSubmission(user, project, submission);

    const now = new Date();
    const daysRemaining = submission.revisionDeadline
      ? Math.ceil((submission.revisionDeadline - now) / (1000 * 60 * 60 * 24))
      : null;

    const feedback = {
      submissionId: submission._id,
      projectId: submission.projectId._id,
      projectTitle: submission.projectId.title,
      chapter: submission.chapter,
      version: submission.version,
      status: submission.status,
      submittedBy: submission.submittedBy,
      submittedAt: submission.createdAt,
      reviewedAt: submission.reviewedAt,
      reviewedBy: submission.reviewedBy,
      reviewNote: submission.reviewNote,
      revisionDeadline: submission.revisionDeadline,
      daysRemaining,
      annotations: submission.annotations.map((ann) => ({
        _id: ann._id,
        page: ann.page,
        lineStart: ann.lineStart,
        lineEnd: ann.lineEnd,
        content: ann.content,
        selectedText: ann.selectedText || '',
        highlightCoords: ann.highlightCoords,
        addedBy: ann.userId,
        addedAt: ann.createdAt,
        resolved: ann.resolved || false,
        replies: (ann.replies || []).map((reply) => ({
          _id: reply._id,
          userId: reply.userId,
          content: reply.content,
          createdAt: reply.createdAt,
        })),
      })),
      unaddressedCount: submission.annotations.filter((a) => !a.resolved).length,
      plagiarism: {
        score: submission.originalityScore ?? submission.plagiarismResult?.originalityScore ?? null,
        status: submission.plagiarismResult?.status || 'not_checked',
      },
    };

    return { feedback };
  }

  /**
   * Get all versions (upload history) for a submission.
   *
   * @param {string} submissionId - The submission to fetch versions for
   * @param {string} userId - Current user
   * @param {string} userRole - User's role
   * @returns {Object} { versions }
   */
  async getSubmissionVersions(submissionId, userId, _userRole) {
    const submission = await Submission.findById(submissionId)
      .populate('submittedBy', 'name email')
      .lean();

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const user = await User.findById(userId).select('role teamId');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const project = await Project.findById(submission.projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanViewSubmission(user, project, submission);

    // Fetch all versions of this chapter from the same project
    const allVersions = await Submission.find({
      projectId: submission.projectId,
      chapter: submission.chapter,
      submittedBy: submission.submittedBy,
    })
      .select(
        'version createdAt status fileName fileSize submittedBy reviewNote plagiarismResult originalityScore',
      )
      .populate('submittedBy', 'name')
      .sort({ version: -1 })
      .lean();

    const versions = allVersions.map((v) => ({
      _id: v._id,
      version: v.version,
      submittedAt: v.createdAt,
      status: v.status,
      fileName: v.fileName,
      fileSize: v.fileSize,
      submittedBy: v.submittedBy,
      reviewNote: v.reviewNote,
      plagiarismScore: v.originalityScore ?? v.plagiarismResult?.originalityScore ?? null,
    }));

    return { versions };
  }

  /**
   * Build and return the review workspace payload for split-view UI.
   * Rounds are derived from existing submission versions, plus any pending
   * placeholder rounds stored in SubmissionRound.
   *
   * @param {string} submissionId
   * @param {string} userId
   * @param {string} userRole
   * @returns {Object} { workspace }
   */
  async getSubmissionReviewWorkspace(submissionId, userId, _userRole) {
    const { submission } = await this.getSubmission(submissionId, userId);

    const project = await Project.findById(submission.projectId).populate('teamId', 'name members');
    const user = await User.findById(userId);

    if (!project || !user) {
      throw new AppError('Project or user not found.', 404, 'NOT_FOUND');
    }

    this._assertCanViewSubmission(user, project, submission);

    const baseFilter = {
      projectId: submission.projectId,
      chapter: submission.chapter,
      type: submission.type,
    };

    const versionSubmissions = await Submission.find(baseFilter)
      .sort({ version: 1 })
      .select(
        '_id chapter type version fileName fileSize fileType status createdAt originalityScore plagiarismResult reviewNote reviewClosed annotations driveWebViewLink syncedGoogleDocId syncedGoogleDocUrl',
      )
      .populate('annotations.userId', 'firstName middleName lastName')
      .populate('annotations.replies.userId', 'firstName middleName lastName')
      .lean();

    const placeholderRounds = await SubmissionRound.find({
      ...baseFilter,
      sourceSubmissionId: null,
      status: SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD,
    })
      .sort({ roundNumber: 1 })
      .lean();

    const rounds = versionSubmissions.map((item) => ({
      roundNumber: item.version,
      label: item.version === 1 ? 'Round 1 (Original)' : `Round ${item.version} (Revision)`,
      status:
        item.status === SUBMISSION_STATUSES.PENDING
          ? SUBMISSION_STATUSES.PENDING_INSTRUCTOR_REVIEW
          : item.status,
      sourceSubmissionId: item._id,
      createdAt: item.createdAt,
      fileName: item.fileName,
      fileSize: item.fileSize,
      fileType: item.fileType,
      originalityScore: item.originalityScore,
      reviewNote: item.reviewNote,
      reviewClosed: item.reviewClosed || false,
      annotations: item.annotations || [],
      driveWebViewLink: item.driveWebViewLink || null,
      syncedGoogleDocId: item.syncedGoogleDocId || null,
      syncedGoogleDocUrl: item.syncedGoogleDocUrl || null,
      isPlaceholder: false,
    }));

    placeholderRounds.forEach((placeholder) => {
      rounds.push({
        roundNumber: placeholder.roundNumber,
        label: `Round ${placeholder.roundNumber} (Pending Upload)`,
        status: placeholder.status,
        sourceSubmissionId: null,
        createdAt: placeholder.createdAt,
        fileName: null,
        fileSize: null,
        fileType: null,
        originalityScore: null,
        reviewNote: placeholder.overallFeedback || null,
        reviewClosed: false,
        annotations: [],
        driveWebViewLink: null,
        syncedGoogleDocId: null,
        syncedGoogleDocUrl: null,
        isPlaceholder: true,
      });
    });

    rounds.sort((a, b) => a.roundNumber - b.roundNumber);

    const workspace = {
      submissionId: submission._id,
      projectId: project._id,
      projectTitle: project.title,
      chapter: submission.chapter,
      type: submission.type,
      teamName: project.teamId?.name || 'Unknown Team',
      rounds,
    };

    return { workspace };
  }

  /**
   * Request another revision and create the next pending student upload round.
   *
   * @param {string} submissionId
   * @param {string} reviewerId
   * @param {{ overallFeedback?: string }} data
   * @returns {Object} { submission, nextRound }
   */
  async requestRevisionRound(submissionId, reviewerId, data) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    await this._getModerationContext(submission, reviewerId);

    if (
      submission.reviewClosed ||
      [SUBMISSION_STATUSES.ACCEPTED, SUBMISSION_STATUSES.LOCKED].includes(submission.status)
    ) {
      throw new AppError(
        'Cannot request revision from the current review state.',
        400,
        'INVALID_REVIEW_STATE_TRANSITION',
      );
    }

    submission.status = SUBMISSION_STATUSES.REVISIONS_REQUIRED;
    submission.reviewNote = data.overallFeedback || submission.reviewNote;
    submission.reviewedBy = reviewerId;
    submission.reviewedAt = new Date();
    await submission.save();

    const nextRoundNumber = (submission.version || 1) + 1;

    const nextRound = await SubmissionRound.findOneAndUpdate(
      {
        projectId: submission.projectId,
        chapter: submission.chapter,
        type: submission.type,
        roundNumber: nextRoundNumber,
      },
      {
        $set: {
          status: SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD,
          overallFeedback: data.overallFeedback || null,
          createdBy: reviewerId,
          sourceSubmissionId: null,
          isPlaceholder: true,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    ).lean();

    await Notification.create({
      userId: submission.submittedBy,
      type: 'submission_revisions_required',
      title: 'Another Revision Requested',
      message: `Round ${nextRoundNumber} is open for upload. Please submit your revised document.`,
      metadata: {
        submissionId: submission._id,
        projectId: submission.projectId,
        roundNumber: nextRoundNumber,
      },
    }).then((n) => emitToUser(n.userId, 'notification:new', n));

    return { submission, nextRound };
  }

  /**
   * Mark current submission accepted and close the review thread.
   *
   * @param {string} submissionId
   * @param {string} reviewerId
   * @param {{ overallFeedback?: string }} data
   * @returns {Object} { submission }
   */
  async markSubmissionAccepted(submissionId, reviewerId, data) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    await this._getModerationContext(submission, reviewerId);

    let plagiarismResult = await PlagiarismResult.findOne({
      submissionId: submission._id,
    }).lean();
    plagiarismResult = await this._reconcileStalePlagiarismResult(submission._id, plagiarismResult);
    if (!plagiarismResult || plagiarismResult.status !== PLAGIARISM_STATUSES.COMPLETED) {
      plagiarismResult = await this._ensureMockPlagiarismForApproval(submission);
    }

    if (!plagiarismResult || plagiarismResult.status !== PLAGIARISM_STATUSES.COMPLETED) {
      throw new AppError(
        'Plagiarism check must be completed before approving this submission. Please run the plagiarism checker first.',
        400,
        'PLAGIARISM_CHECK_REQUIRED',
      );
    }

    const threshold = await this._getPlagiarismRejectThreshold();
    if (plagiarismResult.similarityPercentage > threshold) {
      throw new AppError(
        `Cannot approve: Plagiarism score (${plagiarismResult.similarityPercentage.toFixed(1)}%) exceeds threshold (${threshold}%). Please review matched sources or request revisions.`,
        400,
        'PLAGIARISM_SCORE_TOO_HIGH',
      );
    }

    submission.status = SUBMISSION_STATUSES.ACCEPTED;
    submission.reviewClosed = true;
    submission.reviewedBy = reviewerId;
    submission.reviewedAt = new Date();
    if (data.overallFeedback) {
      submission.reviewNote = data.overallFeedback;
    }
    await submission.save();

    await Submission.updateMany(
      {
        projectId: submission.projectId,
        chapter: submission.chapter,
        type: submission.type,
      },
      {
        $set: {
          reviewClosed: true,
        },
      },
    );

    await SubmissionRound.updateMany(
      {
        projectId: submission.projectId,
        chapter: submission.chapter,
        type: submission.type,
        sourceSubmissionId: null,
      },
      {
        $set: {
          status: 'approved',
        },
      },
    );

    return { submission };
  }
}

const submissionService = new SubmissionService();
export default submissionService;
