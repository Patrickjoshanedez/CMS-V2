/**
 * SubmissionAnnotationService — Modular domain service handling document annotations,
 * inline comments, threaded replies, resolution states, and reviewer notification dispatches.
 */
import Submission from '../submission.model.js';
import Notification from '../../notifications/notification.model.js';
import AppError from '../../../utils/AppError.js';
import { emitToUser } from '../../../services/socket.service.js';
import { ROLES } from '@cms/shared';
import { assertProjectWritable } from '../../projects/services/projectCore.service.js';

export class SubmissionAnnotationService {
  /**
   * Add an inline annotation to a submission (only faculty/instructors).
   *
   * @param {string} submissionId
   * @param {string} userId - The annotating faculty member
   * @param {Object} data - { page, lineStart, lineEnd, content, selectedText, highlightCoords }
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<{ submission: Object }>}
   */
  async addAnnotation(submissionId, userId, data, options = {}) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    if (
      options.submissionService &&
      typeof options.submissionService._getModerationContext === 'function'
    ) {
      await options.submissionService._getModerationContext(submission, userId);
    }

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
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<{ submission: Object }>}
   */
  async addAnnotationReply(submissionId, annotationId, userId, data, options = {}) {
    let submission;
    let project;

    if (
      options.submissionService &&
      typeof options.submissionService.getSubmissionViewContext === 'function'
    ) {
      const ctx = await options.submissionService.getSubmissionViewContext(submissionId, userId, {
        submissionSelect: 'projectId type annotations',
      });
      submission = ctx.submission;
      project = ctx.project;
    } else {
      submission = await Submission.findById(submissionId).select('projectId type annotations');
      if (!submission) {
        throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
      }
    }

    if (project) {
      assertProjectWritable(project);
    }

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
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<{ submission: Object }>}
   */
  async removeAnnotation(submissionId, annotationId, userId, userRole, options = {}) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    if (
      options.submissionService &&
      typeof options.submissionService._getModerationContext === 'function'
    ) {
      await options.submissionService._getModerationContext(submission, userId);
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

  /**
   * Mark an annotation as resolved (adviser/instructor marks it as addressed).
   *
   * @param {string} submissionId
   * @param {string} annotationId
   * @param {string} userId - The faculty member marking as resolved
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<{ submission: Object }>}
   */
  async markAnnotationResolved(submissionId, annotationId, userId, options = {}) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    if (
      options.submissionService &&
      typeof options.submissionService._getModerationContext === 'function'
    ) {
      await options.submissionService._getModerationContext(submission, userId);
    }

    const annotation = submission.annotations.id(annotationId);
    if (!annotation) {
      throw new AppError('Annotation not running or not found.', 404, 'ANNOTATION_NOT_FOUND');
    }

    annotation.resolved = true;
    annotation.resolvedAt = new Date();
    await submission.save();

    return { submission };
  }
}

export const submissionAnnotationService = new SubmissionAnnotationService();
export default submissionAnnotationService;
