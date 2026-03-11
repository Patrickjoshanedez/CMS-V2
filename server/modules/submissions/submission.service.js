/**
 * SubmissionService — Business logic for document uploads, versioning,
 * review workflow, annotations, and document locking.
 *
 * Controllers are thin — they delegate here.
 * StorageService handles S3 I/O; this service owns the workflow.
 *
 * ARCHITECTURE NOTE (refactored):
 * The four upload methods (uploadChapter, compileProposal, uploadFinalAcademic,
 * uploadFinalJournal) share a common pipeline extracted into private helpers:
 *   _authorizeStudentUpload()  — user lookup + role + team membership
 *   _detectLateSubmission()    — deadline lookup + remarks enforcement
 *   _enqueuePlagiarism()       — BullMQ enqueue with sync fallback
 *   _notifyAdviser()           — in-app notification + real-time emit + email
 * Each public method now contains ONLY its unique pre-validation logic,
 * then delegates to the shared pipeline, cutting ~400 lines of duplication.
 */
import Submission from './submission.model.js';
import Project from '../projects/project.model.js';
import User from '../users/user.model.js';
import Notification from '../notifications/notification.model.js';
import PlagiarismResult from '../plagiarism/plagiarism.model.js';
import storageService from '../../services/storage.service.js';
import googleDocsService from '../../services/google-docs.service.js';
import env from '../../config/env.js';
import { enqueuePlagiarismJob, enqueueEmailJob } from '../../jobs/queue.js';
import { runPlagiarismCheckSync } from '../../jobs/plagiarism.job.js';
import { emitToUser } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import {
  ROLES,
  SUBMISSION_STATUSES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  PLAGIARISM_STATUSES,
} from '@cms/shared';

const logger = {
  info: (...args) => console.info(...args), // eslint-disable-line no-console
  error: (...args) => console.error(...args), // eslint-disable-line no-console
};

class SubmissionService {
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
        'This submission is past the deadline. You must provide remarks explaining the delay.',
        400,
        'LATE_REMARKS_REQUIRED',
      );
    }

    return { isLate };
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

    const jobId = await enqueuePlagiarismJob(plagiarismPayload);
    if (!jobId) {
      // Redis unavailable — run synchronously as fallback (dev/test)
      runPlagiarismCheckSync(plagiarismPayload).catch((err) => {
        console.error(`[SubmissionService] Sync plagiarism fallback failed: ${err.message}`);
      });
    } else {
      await Submission.findByIdAndUpdate(submission._id, {
        'plagiarismResult.jobId': jobId,
      });
    }
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
  async _mirrorFinalToDrive({ buffer, fileName, mimeType, projectId, version, type }) {
    const fallback = {
      driveFileId: null,
      driveWebViewLink: null,
      driveWebContentLink: null,
    };

    if (!googleDocsService.isConfigured()) {
      return fallback;
    }

    try {
      const uploaded = await googleDocsService.uploadFileToDrive(
        buffer,
        fileName,
        mimeType,
        env.GOOGLE_DRIVE_CAPSTONE_DOCS_FOLDER_ID || null,
        {
          description: `CMS ${type} submission for project ${projectId} (v${version})`,
          appProperties: {
            projectId: String(projectId),
            submissionType: type,
            version: String(version),
          },
        },
      );

      if (type === 'final_journal') {
        await googleDocsService.setViewPermission(uploaded.fileId);
      }

      return {
        driveFileId: uploaded.fileId,
        driveWebViewLink: uploaded.webViewLink || null,
        driveWebContentLink: uploaded.webContentLink || null,
      };
    } catch (error) {
      console.warn(`[SubmissionService] Drive mirror failed for ${type}: ${error.message}`);
      return fallback;
    }
  }

  /* ═══════════════════ View Authorization ═══════════════════ */

  /**
   * Authorization for viewing a submission document.
   * Allowed: instructor, assigned adviser, assigned panelist, and project team students.
   *
   * @param {Object} user
   * @param {Object} project
   */
  _assertCanViewSubmission(user, project) {
    const userId = user._id.toString();

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
    const { project } = await this._authorizeStudentUpload(userId, projectId, 'upload chapters');
    const { chapter, remarks } = data;

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

    // --- Check if previous version is locked ---
    const latestSubmission = await Submission.findOne({
      projectId,
      chapter,
    }).sort({ version: -1 });

    if (latestSubmission && latestSubmission.status === SUBMISSION_STATUSES.LOCKED) {
      throw new AppError(
        'This chapter is locked. Submit an unlock request to your adviser.',
        403,
        'DOCUMENT_LOCKED',
      );
    }

    // --- Late submission detection ---
    const deadlineField = chapter <= 3 ? `chapter${chapter}` : 'proposal';
    const { isLate } = this._detectLateSubmission(project, deadlineField, remarks);

    // --- Auto-increment version ---
    const nextVersion = latestSubmission ? latestSubmission.version + 1 : 1;

    // --- Upload to S3 ---
    const storageKey = storageService.buildKey(projectId, chapter, nextVersion, file.originalname);
    await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
      projectId,
      chapter: String(chapter),
      version: String(nextVersion),
      uploadedBy: userId,
    });

    // --- Create submission record ---
    const submission = await Submission.create({
      projectId,
      chapter,
      version: nextVersion,
      fileName: file.originalname,
      fileType: file.validatedMime,
      fileSize: file.size,
      storageKey,
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: userId,
      isLate,
      remarks: remarks || null,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

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
    const { project } = await this._authorizeStudentUpload(userId, projectId, 'compile proposals');
    const { remarks } = data;

    // --- Project state checks (proposal-specific) ---
    if (project.projectStatus !== PROJECT_STATUSES.ACTIVE) {
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
    await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
      projectId,
      type: 'proposal',
      version: String(nextVersion),
      uploadedBy: userId,
    });

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
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    // --- Plagiarism + Notification (shared pipeline) ---
    await this._enqueuePlagiarism(submission, {
      storageKey,
      fileType: file.validatedMime,
      projectId,
      type: 'proposal',
    });

    // --- Transition project status to PROPOSAL_SUBMITTED ---
    project.projectStatus = PROJECT_STATUSES.PROPOSAL_SUBMITTED;
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

  /* ═══════════════════ Upload: Final Papers (Capstone 4) ═══════════════════ */

  /**
   * Shared pre-validation for both final paper types (academic + journal).
   * Checks capstone phase 4 and title approval status.
   *
   * @param {Object} project
   */
  _assertFinalPaperEligible(project) {
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
    await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
      projectId,
      type,
      version: String(nextVersion),
      uploadedBy: userId,
    });

    // --- Drive mirror (best-effort for final papers) ---
    const driveMirror = await this._mirrorFinalToDrive({
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.validatedMime,
      projectId,
      version: nextVersion,
      type,
    });

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
      driveFileId: driveMirror.driveFileId,
      driveWebViewLink: driveMirror.driveWebViewLink,
      driveWebContentLink: driveMirror.driveWebContentLink,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

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
    const { project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'upload final papers',
    );
    this._assertFinalPaperEligible(project);

    return this._uploadFinalPaper({
      userId,
      projectId,
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
    const { project } = await this._authorizeStudentUpload(
      userId,
      projectId,
      'upload final papers',
    );
    this._assertFinalPaperEligible(project);

    return this._uploadFinalPaper({
      userId,
      projectId,
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
   * @returns {Object} { submission }
   */
  async getSubmission(submissionId) {
    const submission = await Submission.findById(submissionId)
      .populate('submittedBy', 'firstName middleName lastName email')
      .populate('reviewedBy', 'firstName middleName lastName email')
      .populate('annotations.userId', 'firstName middleName lastName email');

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    return { submission };
  }

  /**
   * Get all submissions for a project with optional filters and pagination.
   * @param {string} projectId
   * @param {Object} query - { chapter?, status?, page, limit }
   * @returns {Object} { submissions, pagination }
   */
  async getSubmissionsByProject(projectId, query = {}) {
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

    return {
      submissions,
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
   * Returns all versions in descending order.
   * @param {string} projectId
   * @param {number} chapter
   * @returns {Object} { submissions }
   */
  async getChapterHistory(projectId, chapter) {
    const submissions = await Submission.find({ projectId, chapter })
      .sort({ version: -1 })
      .populate('submittedBy', 'firstName middleName lastName email')
      .populate('reviewedBy', 'firstName middleName lastName email');

    return { submissions };
  }

  /**
   * Get the latest submission for a specific chapter.
   * @param {string} projectId
   * @param {number} chapter
   * @returns {Object} { submission } (null if no submissions exist)
   */
  async getLatestChapterSubmission(projectId, chapter) {
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

    this._assertCanViewSubmission(user, project);

    const expiresIn = 300; // 5 minutes

    try {
      const url = await storageService.getSignedUrl(submission.storageKey, expiresIn);
      return { url, expiresIn, source: 's3' };
    } catch (error) {
      if (submission.driveWebViewLink) {
        return { url: submission.driveWebViewLink, expiresIn: null, source: 'drive' };
      }
      throw error;
    }
  }

  /* ═══════════════════ Plagiarism ═══════════════════ */

  /**
   * Get the plagiarism/originality check status for a submission.
   *
   * @param {string} submissionId
   * @returns {Object} { submissionId, plagiarismResult, originalityScore }
   */
  async getPlagiarismStatus(submissionId) {
    const submission = await Submission.findById(submissionId).select(
      'plagiarismResult originalityScore',
    );

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

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
   * @returns {Object} { submissionId, originalityScore, fullReport, matchedSources }
   */
  async getPlagiarismReport(submissionId) {
    const submission = await Submission.findById(submissionId).select(
      'plagiarismResult originalityScore extractedText',
    );

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const { plagiarismResult, originalityScore, extractedText } = submission;

    if (!plagiarismResult || plagiarismResult.status !== 'completed') {
      throw new AppError(
        'Plagiarism check has not completed yet.',
        400,
        'PLAGIARISM_NOT_COMPLETED',
      );
    }

    return {
      submissionId: submission._id,
      originalityScore,
      extractedText: extractedText || null,
      fullReport: plagiarismResult.fullReport || null,
      matchedSources: plagiarismResult.matchedSources || [],
      processedAt: plagiarismResult.processedAt,
    };
  }

  /* ═══════════════════ Review Workflow ═══════════════════ */

  /**
   * Review a submission — approve, request revisions, or reject.
   * Only advisers assigned to the project or instructors can review.
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

    if (submission.status === SUBMISSION_STATUSES.LOCKED) {
      throw new AppError('Cannot review a locked submission.', 400, 'SUBMISSION_LOCKED');
    }

    const { status, reviewNote } = data;

    submission.status = status;
    submission.reviewedBy = reviewerId;
    submission.reviewNote = reviewNote || null;

    // --- Plagiarism check enforcement before approval ---
    if (status === SUBMISSION_STATUSES.APPROVED) {
      // Fetch plagiarism result from database
      const plagiarismResult = await PlagiarismResult.findOne({
        submissionId: submission._id,
      }).lean();

      // Require completed plagiarism check before approval
      if (!plagiarismResult || plagiarismResult.status !== 'completed') {
        throw new AppError(
          'Plagiarism check must be completed before approving this submission. Please run the plagiarism checker first.',
          400,
          'PLAGIARISM_CHECK_REQUIRED',
        );
      }

      // Check similarity threshold
      const threshold = Number(process.env.PLAGIARISM_REJECT_THRESHOLD) || 50;
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

    // --- If this is a proposal submission being approved, transition project status ---
    if (
      submission.type === 'proposal' &&
      (status === SUBMISSION_STATUSES.APPROVED || status === 'approved')
    ) {
      const project = await Project.findById(submission.projectId);
      if (project && project.projectStatus === PROJECT_STATUSES.PROPOSAL_SUBMITTED) {
        project.projectStatus = PROJECT_STATUSES.PROPOSAL_APPROVED;
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

    await Notification.create({
      userId: submission.submittedBy,
      type: notifType,
      title: 'Submission Reviewed',
      message: `Your ${docLabel} has been ${statusLabel}.`,
      metadata: {
        submissionId: submission._id,
        projectId: submission.projectId,
        chapter: submission.chapter,
        type: submission.type,
        newStatus: submission.status,
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
   * @param {Object} data - { page, content, highlightCoords }
   * @returns {Object} { submission }
   */
  async addAnnotation(submissionId, userId, data) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    submission.annotations.push({
      userId,
      page: data.page || 1,
      content: data.content,
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
}

const submissionService = new SubmissionService();
export default submissionService;
