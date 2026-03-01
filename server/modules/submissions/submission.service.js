/**
 * SubmissionService — Business logic for document uploads, versioning,
 * review workflow, annotations, and document locking.
 *
 * Controllers are thin — they delegate here.
 * StorageService handles S3 I/O; this service owns the workflow.
 */
import Submission from './submission.model.js';
import Project from '../projects/project.model.js';
import User from '../users/user.model.js';
import Notification from '../notifications/notification.model.js';
import storageService from '../../services/storage.service.js';
import { enqueuePlagiarismJob } from '../../jobs/queue.js';
import { runPlagiarismCheckSync } from '../../jobs/plagiarism.job.js';
import AppError from '../../utils/AppError.js';
import {
  ROLES,
  SUBMISSION_STATUSES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  PLAGIARISM_STATUSES,
  CAPSTONE_PHASES,
} from '@cms/shared';

class SubmissionService {
  /* ═══════════════════ Upload ═══════════════════ */

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
    // --- Authorization: user must be on the owning team ---
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can upload chapters.', 403, 'FORBIDDEN');
    }

    const project = await Project.findById(projectId).populate('teamId');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    // Verify user belongs to the project's team
    if (!user.teamId || user.teamId.toString() !== project.teamId._id.toString()) {
      throw new AppError('You can only upload to your own project.', 403, 'FORBIDDEN');
    }

    // --- Project state checks ---
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

    const { chapter, remarks } = data;

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
    const deadline = project.deadlines?.[deadlineField];
    const isLate = deadline ? new Date() > new Date(deadline) : false;

    if (isLate && (!remarks || remarks.trim().length === 0)) {
      throw new AppError(
        'This submission is past the deadline. You must provide remarks explaining the delay.',
        400,
        'LATE_REMARKS_REQUIRED',
      );
    }

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

    // --- Enqueue plagiarism check (async via BullMQ, sync fallback) ---
    const plagiarismPayload = {
      submissionId: submission._id.toString(),
      storageKey,
      fileType: file.validatedMime,
      projectId,
      chapter,
    };
    const jobId = await enqueuePlagiarismJob(plagiarismPayload);
    if (!jobId) {
      // Redis unavailable — run synchronously as fallback (dev/test)
      runPlagiarismCheckSync(plagiarismPayload).catch((err) => {
        console.error(`[SubmissionService] Sync plagiarism fallback failed: ${err.message}`);
      });
    } else {
      // Store the job ID reference on the submission
      await Submission.findByIdAndUpdate(submission._id, {
        'plagiarismResult.jobId': jobId,
      });
    }

    // --- Notify adviser (if assigned) ---
    if (project.adviserId) {
      await Notification.create({
        userId: project.adviserId,
        type: 'chapter_submitted',
        title: 'New Chapter Submission',
        message: `Chapter ${chapter} (v${nextVersion}) has been submitted for project "${project.title}".`,
        metadata: { projectId, submissionId: submission._id, chapter, version: nextVersion },
      });
    }

    return { submission };
  }

  /* ═══════════════════ Proposal Compilation ═══════════════════ */

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
    // --- Authorization: user must be on the owning team ---
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can compile proposals.', 403, 'FORBIDDEN');
    }

    const project = await Project.findById(projectId).populate('teamId');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    if (!user.teamId || user.teamId.toString() !== project.teamId._id.toString()) {
      throw new AppError('You can only upload to your own project.', 403, 'FORBIDDEN');
    }

    // --- Project state checks ---
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

    const { remarks } = data;

    // --- Late submission detection ---
    const deadline = project.deadlines?.proposal;
    const isLate = deadline ? new Date() > new Date(deadline) : false;

    if (isLate && (!remarks || remarks.trim().length === 0)) {
      throw new AppError(
        'This submission is past the deadline. You must provide remarks explaining the delay.',
        400,
        'LATE_REMARKS_REQUIRED',
      );
    }

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

    // --- Enqueue plagiarism check ---
    const plagiarismPayload = {
      submissionId: submission._id.toString(),
      storageKey,
      fileType: file.validatedMime,
      projectId,
      type: 'proposal',
    };
    const jobId = await enqueuePlagiarismJob(plagiarismPayload);
    if (!jobId) {
      runPlagiarismCheckSync(plagiarismPayload).catch((err) => {
        console.error(`[SubmissionService] Sync plagiarism fallback failed: ${err.message}`);
      });
    } else {
      await Submission.findByIdAndUpdate(submission._id, {
        'plagiarismResult.jobId': jobId,
      });
    }

    // --- Transition project status to PROPOSAL_SUBMITTED ---
    project.projectStatus = PROJECT_STATUSES.PROPOSAL_SUBMITTED;
    await project.save();

    // --- Notify adviser (if assigned) ---
    if (project.adviserId) {
      await Notification.create({
        userId: project.adviserId,
        type: 'proposal_submitted',
        title: 'Proposal Submitted',
        message: `The compiled proposal (v${nextVersion}) has been submitted for project "${project.title}".`,
        metadata: { projectId, submissionId: submission._id, version: nextVersion },
      });
    }

    return { submission };
  }

  /* ═══════════════════ Final Paper Uploads (Capstone 4) ═══════════════════ */

  /**
   * Upload the full Academic Version of the final paper.
   * This version is restricted to faculty only (viewable within the system).
   *
   * Business rules:
   * - User must be a student on the owning team
   * - Project must be in Capstone Phase 4
   * - Project title must be approved
   * - Late submissions require remarks
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} data - { remarks }
   * @param {Object} file - multer file object
   * @returns {Object} { submission }
   */
  async uploadFinalAcademic(userId, projectId, data, file) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can upload final papers.', 403, 'FORBIDDEN');
    }

    const project = await Project.findById(projectId).populate('teamId');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    // Verify user belongs to the project's team (members are plain ObjectIds)
    if (!user.teamId || user.teamId.toString() !== project.teamId._id.toString()) {
      throw new AppError('You are not a member of this project team.', 403, 'NOT_TEAM_MEMBER');
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

    const { remarks } = data;

    // Late submission detection
    const deadline = project.deadlines?.defense;
    const isLate = deadline ? new Date() > new Date(deadline) : false;
    if (isLate && (!remarks || remarks.trim().length === 0)) {
      throw new AppError(
        'This submission is past the deadline. You must provide remarks explaining the delay.',
        400,
        'LATE_REMARKS_REQUIRED',
      );
    }

    // Auto-increment version
    const latest = await Submission.findOne({
      projectId,
      type: 'final_academic',
    }).sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    // Upload to S3
    const storageKey = storageService.buildFinalAcademicKey(
      projectId,
      nextVersion,
      file.originalname,
    );
    await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
      projectId,
      type: 'final_academic',
      version: String(nextVersion),
      uploadedBy: userId,
    });

    // Create submission record
    const submission = await Submission.create({
      projectId,
      type: 'final_academic',
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

    // Enqueue plagiarism check
    const plagiarismPayload = {
      submissionId: submission._id.toString(),
      storageKey,
      fileType: file.validatedMime,
      projectId,
      type: 'final_academic',
    };
    const jobId = await enqueuePlagiarismJob(plagiarismPayload);
    if (!jobId) {
      runPlagiarismCheckSync(plagiarismPayload).catch((err) => {
        console.error(`[SubmissionService] Sync plagiarism fallback failed: ${err.message}`);
      });
    } else {
      await Submission.findByIdAndUpdate(submission._id, {
        'plagiarismResult.jobId': jobId,
      });
    }

    // Notify adviser
    if (project.adviserId) {
      await Notification.create({
        userId: project.adviserId,
        type: 'chapter_submitted',
        title: 'Final Academic Paper Submitted',
        message: `The full academic version (v${nextVersion}) has been submitted for project "${project.title}".`,
        metadata: { projectId, submissionId: submission._id, version: nextVersion, type: 'final_academic' },
      });
    }

    return { submission };
  }

  /**
   * Upload the Journal/Publishable Version of the final paper.
   * This version is public-facing for archive searches.
   *
   * Business rules same as academic version.
   *
   * @param {string} userId
   * @param {string} projectId
   * @param {Object} data - { remarks }
   * @param {Object} file - multer file object
   * @returns {Object} { submission }
   */
  async uploadFinalJournal(userId, projectId, data, file) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can upload final papers.', 403, 'FORBIDDEN');
    }

    const project = await Project.findById(projectId).populate('teamId');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    // Verify user belongs to the project's team (members are plain ObjectIds)
    if (!user.teamId || user.teamId.toString() !== project.teamId._id.toString()) {
      throw new AppError('You are not a member of this project team.', 403, 'NOT_TEAM_MEMBER');
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

    const { remarks } = data;

    // Late submission detection
    const deadline = project.deadlines?.defense;
    const isLate = deadline ? new Date() > new Date(deadline) : false;
    if (isLate && (!remarks || remarks.trim().length === 0)) {
      throw new AppError(
        'This submission is past the deadline. You must provide remarks explaining the delay.',
        400,
        'LATE_REMARKS_REQUIRED',
      );
    }

    // Auto-increment version
    const latest = await Submission.findOne({
      projectId,
      type: 'final_journal',
    }).sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    // Upload to S3
    const storageKey = storageService.buildFinalJournalKey(
      projectId,
      nextVersion,
      file.originalname,
    );
    await storageService.uploadFile(file.buffer, storageKey, file.validatedMime, {
      projectId,
      type: 'final_journal',
      version: String(nextVersion),
      uploadedBy: userId,
    });

    // Create submission record
    const submission = await Submission.create({
      projectId,
      type: 'final_journal',
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

    // Enqueue plagiarism check
    const plagiarismPayload = {
      submissionId: submission._id.toString(),
      storageKey,
      fileType: file.validatedMime,
      projectId,
      type: 'final_journal',
    };
    const jobId = await enqueuePlagiarismJob(plagiarismPayload);
    if (!jobId) {
      runPlagiarismCheckSync(plagiarismPayload).catch((err) => {
        console.error(`[SubmissionService] Sync plagiarism fallback failed: ${err.message}`);
      });
    } else {
      await Submission.findByIdAndUpdate(submission._id, {
        'plagiarismResult.jobId': jobId,
      });
    }

    // Notify adviser
    if (project.adviserId) {
      await Notification.create({
        userId: project.adviserId,
        type: 'chapter_submitted',
        title: 'Journal Version Submitted',
        message: `The journal/publishable version (v${nextVersion}) has been submitted for project "${project.title}".`,
        metadata: { projectId, submissionId: submission._id, version: nextVersion, type: 'final_journal' },
      });
    }

    return { submission };
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
   * @returns {Object} { url, expiresIn }
   */
  async getViewUrl(submissionId) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const expiresIn = 300; // 5 minutes
    const url = await storageService.getSignedUrl(submission.storageKey, expiresIn);

    return { url, expiresIn };
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

    // If approved, lock the submission to prevent unauthorized edits
    if (status === SUBMISSION_STATUSES.APPROVED) {
      submission.status = SUBMISSION_STATUSES.LOCKED;
    }

    await submission.save();

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
    });

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
    await Notification.create({
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
    await Notification.create({
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
