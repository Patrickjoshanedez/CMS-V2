/**
 * SubmissionRevisionDiffService — Modular domain service handling submission text extraction
 * caching, candidate version comparison resolution, and revision diff payloads.
 */
import Submission from '../submission.model.js';
import User from '../../users/user.model.js';
import Project from '../../projects/project.model.js';
import storageService from '../../../services/storage.index.js';
import AppError from '../../../utils/AppError.js';
import { extractText } from '../../../utils/extractText.js';
import { createLogger } from '../../../utils/logger.js';

const baseLogger = createLogger('SubmissionRevisionDiffService');
const logger = {
  info: (msg, meta) => baseLogger.info(String(msg), meta),
  warn: (msg, meta) => baseLogger.warn(String(msg), meta),
  error: (msg, meta) =>
    baseLogger.error(
      String(msg),
      meta instanceof Error ? { error: meta.message, stack: meta.stack } : meta,
    ),
};

export class SubmissionRevisionDiffService {
  /**
   * Helper to extract & cache text if missing on a submission
   *
   * @param {Object} sub
   * @returns {Promise<void>}
   */
  async ensureExtractedText(sub) {
    if (sub && !sub.extractedText && sub.storageKey) {
      try {
        const buffer = await storageService.downloadFile(sub.storageKey);
        const text = await extractText(buffer, sub.fileType || 'application/pdf');
        if (text) {
          sub.extractedText = text;
          await Submission.updateOne({ _id: sub._id }, { $set: { extractedText: text } });
        }
      } catch (err) {
        logger.error(
          `[SubmissionRevisionDiffService] Text extraction failed for submission ${sub._id}:`,
          err,
        );
      }
    }
  }

  /**
   * Get revision diff payload comparing a submission with its previous version (or compareWithId).
   * Extracts and caches text on both submissions if not already populated.
   *
   * @param {string} submissionId
   * @param {string} requesterId
   * @param {string} [compareWithId]
   * @param {Object} [options]
   * @param {Object} [options.submissionService]
   * @returns {Promise<Object>}
   */
  async getSubmissionRevisionDiff(submissionId, requesterId, compareWithId, options = {}) {
    const targetSubmission = await Submission.findById(submissionId).select('+extractedText');
    if (!targetSubmission) {
      throw new AppError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const [user, project] = await Promise.all([
      User.findById(requesterId).select('role teamId'),
      Project.findById(targetSubmission.projectId).populate('teamId', 'members'),
    ]);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    if (
      options.submissionService &&
      typeof options.submissionService._assertCanViewSubmission === 'function'
    ) {
      options.submissionService._assertCanViewSubmission(user, project, targetSubmission, {
        allowArchivedFinalJournalPublicView: true,
      });
    }

    await this.ensureExtractedText(targetSubmission);

    // Populate annotations on target
    await targetSubmission.populate([
      { path: 'annotations.userId', select: 'firstName lastName email role' },
      { path: 'annotations.replies.userId', select: 'firstName lastName email role' },
    ]);

    // Find candidate comparison versions
    const versionFilter = {
      projectId: targetSubmission.projectId,
      _id: { $ne: targetSubmission._id },
    };
    if (targetSubmission.chapter !== null && targetSubmission.chapter !== undefined) {
      versionFilter.chapter = targetSubmission.chapter;
    } else {
      versionFilter.type = targetSubmission.type;
    }

    const availableVersions = await Submission.find(versionFilter)
      .select('_id version chapter type fileName createdAt')
      .sort({ version: -1 });

    let previousSubmission = null;
    if (compareWithId) {
      previousSubmission = await Submission.findById(compareWithId).select('+extractedText');
    } else {
      // Pick immediate previous version (version < target.version)
      const prevFilter = {
        ...versionFilter,
        version: { $lt: targetSubmission.version },
      };
      previousSubmission = await Submission.findOne(prevFilter)
        .sort({ version: -1 })
        .select('+extractedText');
    }

    if (previousSubmission) {
      await this.ensureExtractedText(previousSubmission);
      await previousSubmission.populate([
        { path: 'annotations.userId', select: 'firstName lastName email role' },
        { path: 'annotations.replies.userId', select: 'firstName lastName email role' },
      ]);
    }

    return {
      current: {
        id: targetSubmission._id,
        version: targetSubmission.version,
        chapter: targetSubmission.chapter,
        type: targetSubmission.type,
        fileName: targetSubmission.fileName,
        fileType: targetSubmission.fileType,
        createdAt: targetSubmission.createdAt,
        extractedText: targetSubmission.extractedText || '',
        annotations: targetSubmission.annotations || [],
      },
      previous: previousSubmission
        ? {
            id: previousSubmission._id,
            version: previousSubmission.version,
            chapter: previousSubmission.chapter,
            type: previousSubmission.type,
            fileName: previousSubmission.fileName,
            fileType: previousSubmission.fileType,
            createdAt: previousSubmission.createdAt,
            extractedText: previousSubmission.extractedText || '',
            annotations: previousSubmission.annotations || [],
          }
        : null,
      availableVersions: availableVersions.map((v) => ({
        id: v._id,
        version: v.version,
        chapter: v.chapter,
        type: v.type,
        fileName: v.fileName,
        createdAt: v.createdAt,
      })),
    };
  }
}

export const submissionRevisionDiffService = new SubmissionRevisionDiffService();
export default submissionRevisionDiffService;
