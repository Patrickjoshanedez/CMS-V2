/**
 * SubmissionReviewWorkspaceService — Modular domain service handling submission feedback,
 * multi-member version history resolution, and split-view review workspace assembly.
 */
import Submission from '../submission.model.js';
import SubmissionRound from '../submissionRound.model.js';
import Project from '../../projects/project.model.js';
import User from '../../users/user.model.js';
import AppError from '../../../utils/AppError.js';
import { SUBMISSION_STATUSES } from '@cms/shared';

export class SubmissionReviewWorkspaceService {
  /**
   * Get submission feedback context: annotations, review notes, timeline, deadline.
   *
   * @param {string} submissionId
   * @param {string} userId
   * @param {string} _userRole
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<{ feedback: Object }>}
   */
  async getSubmissionFeedback(submissionId, userId, _userRole, options = {}) {
    const [submission, user] = await Promise.all([
      Submission.findById(submissionId)
        .populate('submittedBy', 'firstName middleName lastName email')
        .populate('projectId', 'title')
        .lean({ virtuals: true }),
      User.findById(userId).select('role teamId'),
    ]);

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const projectId = submission.projectId?._id || submission.projectId;
    const project = await Project.findById(projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    if (
      options.submissionService &&
      typeof options.submissionService._assertCanViewSubmission === 'function'
    ) {
      options.submissionService._assertCanViewSubmission(user, project, submission);
    }

    const now = new Date();
    const daysRemaining = submission.revisionDeadline
      ? Math.ceil((new Date(submission.revisionDeadline) - now) / (1000 * 60 * 60 * 24))
      : null;

    const feedback = {
      submissionId: submission._id,
      projectId: submission.projectId._id || submission.projectId,
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
      annotations: (submission.annotations || []).map((ann) => ({
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
      unaddressedCount: (submission.annotations || []).filter((a) => !a.resolved).length,
      plagiarism: {
        score:
          submission.originalityScore ?? submission.plagiarismResult?.originalityScore ?? null,
        status: submission.plagiarismResult?.status || 'not_checked',
      },
    };

    return { feedback };
  }

  /**
   * Get all versions (upload history) for a submission across the owning project/team.
   *
   * @param {string} submissionId
   * @param {string} userId
   * @param {string} _userRole
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<{ versions: Array<Object> }>}
   */
  async getSubmissionVersions(submissionId, userId, _userRole, options = {}) {
    const [submission, user] = await Promise.all([
      Submission.findById(submissionId)
        .populate('submittedBy', 'firstName middleName lastName email')
        .lean({ virtuals: true }),
      User.findById(userId).select('role teamId'),
    ]);

    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const project = await Project.findById(submission.projectId).populate('teamId', 'members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    if (
      options.submissionService &&
      typeof options.submissionService._assertCanViewSubmission === 'function'
    ) {
      options.submissionService._assertCanViewSubmission(user, project, submission);
    }

    const versionFilter = {
      projectId: submission.projectId,
    };
    if (submission.chapter !== null && submission.chapter !== undefined) {
      versionFilter.chapter = submission.chapter;
    } else {
      versionFilter.type = submission.type;
    }

    const allVersions = await Submission.find(versionFilter)
      .select(
        'version createdAt status fileName fileSize submittedBy reviewNote plagiarismResult originalityScore',
      )
      .populate('submittedBy', 'firstName middleName lastName email')
      .sort({ version: -1 })
      .lean({ virtuals: true });

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
   *
   * @param {string} submissionId
   * @param {string} userId
   * @param {string} _userRole
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<{ workspace: Object }>}
   */
  async getSubmissionReviewWorkspace(submissionId, userId, _userRole, options = {}) {
    const { submission } = await options.submissionService.getSubmission(submissionId, userId);

    const [project, user] = await Promise.all([
      Project.findById(submission.projectId)
        .populate('teamId', 'name members googleDocUrl githubLink')
        .lean({ virtuals: true, getters: true }),
      User.findById(userId).lean({ virtuals: true, getters: true }),
    ]);

    if (!project || !user) {
      throw new AppError('Project or user not found.', 404, 'NOT_FOUND');
    }

    options.submissionService._assertCanViewSubmission(user, project, submission);

    const baseFilter = {
      projectId: submission.projectId,
      chapter: submission.chapter,
      type: submission.type,
    };

    const [versionSubmissions, placeholderRounds] = await Promise.all([
      Submission.find(baseFilter)
        .sort({ version: 1 })
        .select(
          '_id chapter type version fileName fileSize fileType status createdAt originalityScore plagiarismResult reviewNote reviewClosed annotations driveWebViewLink syncedGoogleDocId syncedGoogleDocUrl',
        )
        .populate('annotations.userId', 'firstName middleName lastName')
        .populate('annotations.replies.userId', 'firstName middleName lastName')
        .lean(),
      SubmissionRound.find({
        ...baseFilter,
        sourceSubmissionId: null,
        status: SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD,
      })
        .sort({ roundNumber: 1 })
        .lean(),
    ]);

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
      projectStatus: project.projectStatus,
      isArchived: project.isArchived || false,
      chapter: submission.chapter,
      type: submission.type,
      teamName: project.teamId?.name || 'Unknown Team',
      teamResources: {
        googleDocUrl: project.teamId?.googleDocUrl || null,
        githubRepoUrl: project.githubRepoUrl || project.teamId?.githubLink || null,
        prototypes: Array.isArray(project.prototypes) ? project.prototypes : [],
      },
      adviserId: project.adviserId ? String(project.adviserId) : null,
      panelistIds: Array.isArray(project.panelistIds)
        ? project.panelistIds.map((id) => String(id))
        : [],
      secretaryId: project.secretaryId ? String(project.secretaryId) : null,
      rounds,
    };

    return { workspace };
  }
}

export const submissionReviewWorkspaceService = new SubmissionReviewWorkspaceService();
export default submissionReviewWorkspaceService;
