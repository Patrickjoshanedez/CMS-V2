import Project from '../project.model.js';
import User from '../../users/user.model.js';
import Evaluation from '../../evaluations/evaluation.model.js';
import AppError from '../../../utils/AppError.js';
import { findSimilarProjects } from '../../../utils/titleSimilarity.js';
import settingsService from '../../settings/settings.service.js';
import { emitToRoom } from '../../../services/socket.service.js';
import {
  ROLES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  DEFENSE_TYPES,
  EVALUATION_STATUSES,
  DELIVERABLE_TYPES,
  PLAGIARISM_STATUSES,
} from '@cms/shared';
import projectCoreService from './projectCore.service.js';
import projectCommitteeService from './projectCommittee.service.js';

class ProjectTitleService {
  async _getProjectOrFail(projectId) {
    return projectCoreService._getProjectOrFail(projectId);
  }

  async _assertTeamLeader(teamId, userId) {
    return projectCoreService._assertTeamLeader(teamId, userId);
  }

  async _notifyTeamMembers(teamId, notif, options) {
    return projectCoreService._notifyTeamMembers(teamId, notif, options);
  }

  async _notifyInstructors(notif) {
    return projectCoreService._notifyInstructors(notif);
  }

  async _notifyCommittee(project, notif) {
    return projectCommitteeService._notifyCommittee(project, notif);
  }

  _normalizeTitleProposals(titleProposals = []) {
    if (!Array.isArray(titleProposals)) return [];

    const normalizedByTitle = new Map();

    for (const proposal of titleProposals) {
      if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
        continue;
      }

      const title = typeof proposal.title === 'string' ? proposal.title.trim() : '';
      const description =
        typeof proposal.description === 'string' ? proposal.description.trim() : '';
      const capstoneType = Array.isArray(proposal.capstoneType)
        ? [
            ...new Set(
              proposal.capstoneType.map((ct) => (typeof ct === 'string' ? ct.trim() : '')),
            ),
          ].filter(Boolean)
        : typeof proposal.capstoneType === 'string'
          ? [proposal.capstoneType.trim()]
          : [];
      const sdgTags = Array.isArray(proposal.sdgTags)
        ? [
            ...new Set(proposal.sdgTags.map((tag) => (typeof tag === 'string' ? tag.trim() : ''))),
          ].filter(Boolean)
        : [];

      const pitchDeck =
        proposal.pitchDeck &&
        typeof proposal.pitchDeck === 'object' &&
        !Array.isArray(proposal.pitchDeck)
          ? proposal.pitchDeck
          : {};

      if (!title) continue;

      if (!normalizedByTitle.has(title)) {
        normalizedByTitle.set(title, {
          title,
          description,
          capstoneType,
          sdgTags,
          pitchDeck,
          isFlagged: Boolean(proposal.isFlagged),
          flagReason: proposal.flagReason || null,
          similarityScore: Number(proposal.similarityScore) || 0,
        });
      }
    }

    return [...normalizedByTitle.values()];
  }

  /* ═══════════════════ Creation ═══════════════════ */

  async _assertCanReviewTitle(user, project) {
    let resolvedUser = user;
    if (!user || typeof user !== 'object' || !user.role) {
      const userId = user?._id || user;
      resolvedUser = await User.findById(userId);
      if (!resolvedUser) {
        throw new AppError('User session invalid.', 401, 'UNAUTHORIZED');
      }
    }

    if (resolvedUser.role === ROLES.INSTRUCTOR) {
      return;
    }

    const userId = (resolvedUser._id || resolvedUser).toString();
    const projectAdviserId = project.adviserId?._id || project.adviserId;
    const isAdviser = projectAdviserId && projectAdviserId.toString() === userId;

    const isPanelist =
      Array.isArray(project.panelistIds) &&
      project.panelistIds.some((p) => {
        const pId = p?._id || p;
        return pId && pId.toString() === userId;
      });

    if (!isAdviser && !isPanelist) {
      console.warn(
        `[ProjectService] Permission denied for user ${userId} on project ${project._id}. Role: ${resolvedUser.role}`,
      );
      throw new AppError(
        'Only the assigned instructor, adviser, or panelists can review the title proposal.',
        403,
        'FORBIDDEN',
      );
    }
  }

  /**
   * Assert that a submission's plagiarism check has completed and meets
   * the required originality threshold. Throws descriptive errors for
   * each failure mode (not run, in progress, failed, below threshold).
   *
   * @param {Object} submission - Submission document with plagiarismResult
   * @param {string} label - Human-readable label ('academic' | 'journal')
   * @param {number} threshold - Minimum originality percentage required
   * @private
   */
  _assertPlagiarismCleared(submission, label, threshold) {
    const plagResult = submission.plagiarismResult;

    if (!plagResult || !plagResult.status) {
      throw new AppError(
        `Plagiarism check has not been run on the final ${label} version.`,
        400,
        'PLAGIARISM_CHECK_PENDING',
      );
    }

    if (
      plagResult.status === PLAGIARISM_STATUSES.QUEUED ||
      plagResult.status === PLAGIARISM_STATUSES.PROCESSING
    ) {
      throw new AppError(
        `Plagiarism check is still in progress for the final ${label} version.`,
        400,
        'PLAGIARISM_CHECK_PENDING',
      );
    }

    if (plagResult.status === PLAGIARISM_STATUSES.FAILED) {
      throw new AppError(
        `Plagiarism check failed for the final ${label} version. Please re-submit the paper.`,
        400,
        'PLAGIARISM_CHECK_FAILED',
      );
    }

    // plagResult.status === COMPLETED — verify non-degraded coverage and score threshold
    const fullReport = plagResult.fullReport || plagResult.rawData || null;
    const isDegraded =
      plagResult.scanCoverage === 'degraded' ||
      fullReport?.scanCoverage === 'degraded' ||
      fullReport?.scanType === 'syntactic_fallback' ||
      fullReport?.semanticPending === true;

    if (isDegraded) {
      throw new AppError(
        `Final ${label} version was evaluated under degraded syntactic mode (neural vector analysis failed). Full semantic clearance is required for archival. Please re-run the plagiarism check.`,
        400,
        'PLAGIARISM_SCAN_DEGRADED',
      );
    }

    const score = plagResult.originalityScore ?? submission.originalityScore;
    if (score === null || score === undefined) {
      throw new AppError(
        `Originality score is missing for the final ${label} version.`,
        400,
        'PLAGIARISM_CHECK_PENDING',
      );
    }

    if (score < threshold) {
      throw new AppError(
        `Final ${label} version has an originality score of ${score}%, which is below the required ${threshold}%. Please revise and re-submit.`,
        400,
        'ORIGINALITY_BELOW_THRESHOLD',
      );
    }
  }

  /**
   * Tier 1 — MongoDB $text search narrows candidates to titles that share
   *          significant keywords with the candidate string.
   * Tier 2 — Levenshtein-based scoring (via findSimilarProjects) ranks the
   *          narrowed set and filters by the system-configured threshold.
   *
   * @param {string} title - The proposed title to check.
   * @param {string[]} [keywords=[]] - Optional keyword array for overlap scoring.
   * @param {string|null} [excludeProjectId=null] - Exclude this project from results (e.g. when editing own title).
   * @returns {Promise<{ similarProjects: Array, threshold: number }>}
   */
  async checkTitleSimilarity(title, keywords = [], excludeProjectId = null) {
    // Read the configurable threshold from system settings (fallback 0.70)
    let threshold = 0.7;
    try {
      const settings = await settingsService.getSettings();
      if (settings.titleSimilarityThreshold) {
        threshold = settings.titleSimilarityThreshold;
      }
    } catch {
      // Use default on settings read failure
    }

    // Normalise the candidate title for text search
    const normalised = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Build the base filter — exclude rejected projects
    const filter = { projectStatus: { $ne: PROJECT_STATUSES.REJECTED } };
    if (excludeProjectId) {
      filter._id = { $ne: excludeProjectId };
    }

    // Tier 1: $text search to narrow candidates (fast index scan)
    let candidates;
    try {
      candidates = await Project.find(
        { ...filter, $text: { $search: normalised } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(50)
        .select(
          'title abstract keywords academicYear targetBeneficiary targetUsers techStack titleProposalMetadata capstoneType projectStatus capstonePhase titleStatus sdgTags problemStatement proposedSolution uniqueContribution expectedImpact isArchived',
        )
        .lean();
    } catch {
      // Fallback if $text search fails (e.g. empty string) — fetch all
      candidates = [];
    }

    // If $text returned nothing, broaden to all non-rejected projects (bounded to recent 100)
    // so Levenshtein can still catch close matches (e.g. word reordering)
    if (candidates.length === 0) {
      candidates = await Project.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .select(
          'title abstract keywords academicYear targetBeneficiary targetUsers techStack titleProposalMetadata capstoneType projectStatus capstonePhase titleStatus sdgTags problemStatement proposedSolution uniqueContribution expectedImpact isArchived',
        )
        .lean();
    }

    // Tier 2: Levenshtein + keyword overlap scoring
    const similarProjects = findSimilarProjects({ title, keywords: keywords || [] }, candidates, {
      threshold,
    });

    return { similarProjects, threshold };
  }

  /* ═══════════════════ Title editing (draft stage) ═══════════════════ */

  /**
   * Update a project's title, abstract, or keywords while still in DRAFT status.
   * Only the team leader can perform this action.
   * @param {string} projectId
   * @param {string} userId - Requesting student (must be team leader).
   * @param {Object} data - { title?, abstract?, keywords? }
   * @returns {Object} { project, similarProjects }
   */
  async updateTitle(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);

    if (project.titleStatus === TITLE_STATUSES.APPROVED) {
      throw new AppError(
        'This title has been approved and is locked. Submit a modification request to make changes.',
        403,
        'TITLE_LOCKED',
      );
    }

    await this._assertTeamLeader(project.teamId, userId);

    // Merge updates
    if (Array.isArray(data.titleProposals) && data.titleProposals.length > 0) {
      const normalizedTitleProposals = this._normalizeTitleProposals(data.titleProposals);
      const proposalTitles = normalizedTitleProposals.map((p) => p.title);
      project.titleProposals = proposalTitles;
      project.titleProposalMetadata = normalizedTitleProposals;
      project.title = data.title || proposalTitles[0];
    } else if (data.title !== undefined) {
      project.title = data.title;
    }

    if (data.abstract !== undefined) project.abstract = data.abstract;
    if (data.keywords !== undefined) project.keywords = data.keywords;
    if (Array.isArray(data.sdgTags) && data.sdgTags.length > 0) {
      project.sdgTags = [...new Set(data.sdgTags)];
    }

    // Support single-proposal pitch deck updates if proposalId is provided
    if (data.proposalId !== undefined && Array.isArray(project.titleProposalMetadata)) {
      const targetIndex = project.titleProposalMetadata.findIndex(
        (m, idx) => String(m._id) === String(data.proposalId) || idx === Number(data.proposalId),
      );
      if (targetIndex !== -1) {
        if (data.title) {
          project.titleProposalMetadata[targetIndex].title = data.title;
          if (
            Array.isArray(project.titleProposals) &&
            project.titleProposals[targetIndex] !== undefined
          ) {
            project.titleProposals[targetIndex] = data.title;
          }
        }
        if (data.description) {
          project.titleProposalMetadata[targetIndex].description = data.description;
        }
        if (data.pitchDeck && typeof data.pitchDeck === 'object') {
          project.titleProposalMetadata[targetIndex].pitchDeck = data.pitchDeck;
        }
      }
    }

    // Submit / Resubmit transitions
    if (data.submit || data.resubmit || project.titleStatus === TITLE_STATUSES.REVISION_REQUIRED) {
      project.titleStatus = TITLE_STATUSES.SUBMITTED;
      project.rejectionReason = null;
    }

    await project.save();

    // Run similarity check on updated title
    const otherProjects = await Project.find({
      _id: { $ne: project._id },
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    }).select(
      'title abstract keywords academicYear targetBeneficiary techStack titleProposalMetadata capstoneType',
    );

    const similarProjects = findSimilarProjects(
      { title: project.title, keywords: project.keywords },
      otherProjects,
    );

    return { project, similarProjects };
  }

  /**
   * Submit the project title for instructor approval.
   * Transitions titleStatus: DRAFT → SUBMITTED
   * @param {string} projectId
   * @param {string} userId - Team leader.
   * @returns {Object} { project }
   */
  async submitTitle(projectId, userId) {
    const project = await this._getProjectOrFail(projectId);

    if (project.titleStatus !== TITLE_STATUSES.DRAFT) {
      throw new AppError(
        'Only projects in draft status can be submitted for approval.',
        400,
        'INVALID_STATUS_TRANSITION',
      );
    }

    await this._assertTeamLeader(project.teamId, userId);

    // Server-side Title Similarity Clearance Gate:
    // Reject title submission if candidate title has a conflict (similarity >= threshold) against existing non-rejected projects
    const { similarProjects, threshold } = await this.checkTitleSimilarity(
      project.title,
      project.keywords || [],
      String(project._id),
    );
    const thr = threshold <= 1 ? Math.round(threshold * 100) : threshold;
    const hasConflict = similarProjects.some((p) => {
      const score = p.similarityScore ?? Math.round((p.score || 0) * 100);
      return score >= thr;
    });

    if (hasConflict) {
      const topConflict = similarProjects.reduce((prev, curr) => {
        const prevScore = prev.similarityScore ?? Math.round((prev.score || 0) * 100);
        const currScore = curr.similarityScore ?? Math.round((curr.score || 0) * 100);
        return currScore > prevScore ? curr : prev;
      }, similarProjects[0]);
      const topScore = topConflict.similarityScore ?? Math.round((topConflict.score || 0) * 100);
      project.isFlagged = true;
      project.flagReason = `Similar title detected (${topScore}%) against "${topConflict.title}". Flagged for committee defense scrutiny.`;
      project.similarityScore = topScore;
    } else {
      project.isFlagged = false;
      project.flagReason = null;
    }

    project.titleStatus = TITLE_STATUSES.SUBMITTED;
    await project.save();

    // Notify all instructors
    await this._notifyInstructors({
      type: 'title_submitted',
      title: project.isFlagged
        ? 'New Title Submission (Similarity Flagged)'
        : 'New Title Submission',
      message: project.isFlagged
        ? `A project title "${project.title}" has been submitted for approval and is FLAGGED for high similarity (${project.similarityScore}%).`
        : `A project title "${project.title}" has been submitted for approval.`,
      metadata: { projectId: project._id, isFlagged: project.isFlagged },
    });

    return { project };
  }

  /**
   * Approve a submitted project title.
   * Transitions titleStatus: SUBMITTED → APPROVED
   *                   or  SUBMITTED → APPROVED_WITH_REVISION (when approveWithRevision is true)
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { proposalId?, approveWithRevision? }
   * @returns {Object} { project }
   */
  async approveTitle(projectId, user, data = {}) {
    const project = await this._getProjectOrFail(projectId);

    await this._assertCanReviewTitle(user, project);

    if (project.titleStatus !== TITLE_STATUSES.SUBMITTED) {
      if (
        project.titleStatus === TITLE_STATUSES.DRAFT ||
        project.titleStatus === TITLE_STATUSES.REVISION_REQUIRED
      ) {
        project.titleStatus = TITLE_STATUSES.SUBMITTED;
      } else {
        throw new AppError(
          'Only submitted titles can be approved.',
          400,
          'INVALID_STATUS_TRANSITION',
        );
      }
    }

    // Enforce scheduled defense hearing prerequisite before title approval
    const scheduleStatus = project.defenseSchedule?.status;
    const hasScheduleDate = Boolean(project.defenseSchedule?.date);
    const isScheduledOrDone =
      (scheduleStatus === 'scheduled' && hasScheduleDate) || scheduleStatus === 'completed';

    if (!isScheduledOrDone) {
      throw new AppError(
        'The proponent team must have a scheduled defense hearing before their title proposal can be approved.',
        400,
        'DEFENSE_SCHEDULE_REQUIRED',
      );
    }

    const proposals = Array.isArray(project.titleProposals) ? project.titleProposals : [];
    const metadataEntries = Array.isArray(project.titleProposalMetadata)
      ? project.titleProposalMetadata
      : [];

    let selectedProposalIndex = -1;

    if (data?.proposalId !== undefined && data?.proposalId !== null && data?.proposalId !== '') {
      const rawProposalId = data.proposalId;

      // 1. Try matching by subdocument _id in titleProposalMetadata or titleProposals
      const idMatchIndex = metadataEntries.findIndex(
        (m) => m?._id && String(m._id) === String(rawProposalId),
      );
      if (idMatchIndex !== -1) {
        selectedProposalIndex = idMatchIndex;
      } else {
        const propIdMatchIndex = proposals.findIndex(
          (p) => p && typeof p === 'object' && p._id && String(p._id) === String(rawProposalId),
        );
        if (propIdMatchIndex !== -1) {
          selectedProposalIndex = propIdMatchIndex;
        }
      }

      // 2. Try matching by exact title string
      if (selectedProposalIndex === -1 && typeof rawProposalId === 'string') {
        const titleMatchIndex = proposals.findIndex((p) => {
          const t = typeof p === 'string' ? p : p?.title;
          return t && t.trim().toLowerCase() === rawProposalId.trim().toLowerCase();
        });
        if (titleMatchIndex !== -1) {
          selectedProposalIndex = titleMatchIndex;
        }
      }

      // 3. Try integer index (supports 0-based or 1-based index)
      if (selectedProposalIndex === -1) {
        let numIndex = -1;
        if (typeof rawProposalId === 'number' && Number.isInteger(rawProposalId)) {
          numIndex = rawProposalId;
        } else if (/^\d+$/.test(String(rawProposalId))) {
          numIndex = Number.parseInt(String(rawProposalId), 10);
        }

        if (numIndex >= 0) {
          // If valid 0-based index
          if (numIndex < proposals.length) {
            selectedProposalIndex = numIndex;
          }
          // If 1-based index (e.g. 1..N)
          else if (numIndex === proposals.length && proposals.length > 0) {
            selectedProposalIndex = numIndex - 1;
          }
        }
      }

      if (selectedProposalIndex < 0 || selectedProposalIndex >= proposals.length) {
        throw new AppError('Title proposal not found.', 404, 'TITLE_PROPOSAL_NOT_FOUND');
      }

      const selectedProposal = proposals[selectedProposalIndex];
      const selectedTitle =
        typeof selectedProposal === 'string'
          ? selectedProposal.trim()
          : typeof selectedProposal?.title === 'string'
            ? selectedProposal.title.trim()
            : '';

      if (!selectedTitle) {
        throw new AppError('Title proposal not found.', 404, 'TITLE_PROPOSAL_NOT_FOUND');
      }

      project.title = selectedTitle;
    }

    const approvedTitle = typeof project.title === 'string' ? project.title.trim() : '';
    if (approvedTitle) {
      if (selectedProposalIndex === -1 && proposals.length > 0) {
        selectedProposalIndex = proposals.findIndex((proposal) => {
          const proposalTitle =
            typeof proposal === 'string'
              ? proposal.trim()
              : typeof proposal?.title === 'string'
                ? proposal.title.trim()
                : '';
          return proposalTitle === approvedTitle;
        });
      }

      project.titleProposals = proposals;
      project.titleProposalMetadata = metadataEntries.map((entry, index) => ({
        ...entry,
        status: index === selectedProposalIndex ? 'approved' : 'rejected',
        reviewedBy: user._id,
        reviewedAt: new Date(),
      }));
    }

    // When approveWithRevision is true, Capstone 1 stays locked until the team submits
    // and the instructor accepts the revised title (APPROVED_WITH_REVISION → PENDING_MODIFICATION → APPROVED).
    const approveWithRevision = Boolean(data?.approveWithRevision);
    project.titleStatus = approveWithRevision
      ? TITLE_STATUSES.APPROVED_WITH_REVISION
      : TITLE_STATUSES.APPROVED;
    project.driveFolderId = null;
    project.projectStatus = PROJECT_STATUSES.PENDING_FOR_SUBMISSION;
    project.capstonePhase = 1;

    // Automatically transition defense schedule to completed once title proposal is selected/approved
    if (!project.defenseSchedule) {
      project.defenseSchedule = {};
    }
    project.defenseSchedule.status = 'completed';
    project.defenseSchedule.verdict = project.defenseSchedule.verdict || 'Passed';
    project.defenseSchedule.completedAt = new Date();

    await project.save();

    // Notify team members
    const notifMessage = approveWithRevision
      ? `Your project title "${project.title}" has been approved with revision. Please submit a revised title before proceeding to Capstone 1.`
      : `Your project title "${project.title}" has been approved.`;
    await this._notifyTeamMembers(project.teamId, {
      type: 'title_approved',
      title: approveWithRevision ? 'Title Approved With Revision' : 'Title Approved',
      message: notifMessage,
      metadata: { projectId: project._id, approvedBy: user._id, approveWithRevision },
    });

    return { project };
  }

  /**
   * Reject a submitted project title.
   * Transitions titleStatus: SUBMITTED → REVISION_REQUIRED
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { reason }
   * @returns {Object} { project }
   */
  async rejectTitle(projectId, user, data = {}) {
    const project = await this._getProjectOrFail(projectId);

    await this._assertCanReviewTitle(user, project);

    const allowedStatuses = [
      TITLE_STATUSES.SUBMITTED,
      TITLE_STATUSES.DRAFT,
      TITLE_STATUSES.APPROVED,
      TITLE_STATUSES.APPROVED_WITH_REVISION,
      TITLE_STATUSES.REVISION_REQUIRED,
      TITLE_STATUSES.PENDING_MODIFICATION,
    ];

    if (!allowedStatuses.includes(project.titleStatus)) {
      throw new AppError(
        'Title proposals cannot be rejected or sent for revision in the current project status.',
        400,
        'INVALID_STATUS_TRANSITION',
      );
    }

    project.titleStatus = TITLE_STATUSES.REVISION_REQUIRED;
    project.rejectionReason = data.reason;

    // Resiliently resolve and update proposal status in metadata if proposalId is provided
    const proposals = Array.isArray(project.titleProposals) ? project.titleProposals : [];
    const metadataEntries = Array.isArray(project.titleProposalMetadata)
      ? project.titleProposalMetadata
      : [];

    let selectedProposalIndex = -1;
    if (data?.proposalId !== undefined && data?.proposalId !== null && data?.proposalId !== '') {
      const rawProposalId = data.proposalId;

      // 1. Try matching by subdocument _id in titleProposalMetadata or titleProposals
      const idMatchIndex = metadataEntries.findIndex(
        (m) => m?._id && String(m._id) === String(rawProposalId),
      );
      if (idMatchIndex !== -1) {
        selectedProposalIndex = idMatchIndex;
      } else {
        const propIdMatchIndex = proposals.findIndex(
          (p) => p && typeof p === 'object' && p._id && String(p._id) === String(rawProposalId),
        );
        if (propIdMatchIndex !== -1) {
          selectedProposalIndex = propIdMatchIndex;
        }
      }

      // 2. Try matching by exact title string
      if (selectedProposalIndex === -1 && typeof rawProposalId === 'string') {
        const titleMatchIndex = proposals.findIndex((p) => {
          const t = typeof p === 'string' ? p : p?.title;
          return t && t.trim().toLowerCase() === rawProposalId.trim().toLowerCase();
        });
        if (titleMatchIndex !== -1) {
          selectedProposalIndex = titleMatchIndex;
        }
      }

      // 3. Try integer index (supports 0-based or 1-based index fallback)
      if (selectedProposalIndex === -1) {
        let numIndex = -1;
        if (typeof rawProposalId === 'number' && Number.isInteger(rawProposalId)) {
          numIndex = rawProposalId;
        } else if (/^\d+$/.test(String(rawProposalId))) {
          numIndex = Number.parseInt(String(rawProposalId), 10);
        }

        if (numIndex >= 0) {
          if (numIndex < proposals.length) {
            selectedProposalIndex = numIndex;
          } else if (numIndex === proposals.length && proposals.length > 0) {
            selectedProposalIndex = numIndex - 1;
          }
        }
      }
    }

    if (metadataEntries.length > 0) {
      project.titleProposalMetadata = metadataEntries.map((entry, index) => {
        if (selectedProposalIndex === -1 || index === selectedProposalIndex) {
          return {
            ...entry,
            status: 'rejected',
            reviewedBy: user._id,
            reviewedAt: new Date(),
          };
        }
        return entry;
      });
    }

    await project.save();

    const displayTitle =
      project.title ||
      (selectedProposalIndex >= 0 && proposals[selectedProposalIndex]
        ? typeof proposals[selectedProposalIndex] === 'string'
          ? proposals[selectedProposalIndex]
          : proposals[selectedProposalIndex]?.title
        : null) ||
      'Title Proposal';

    await this._notifyTeamMembers(project.teamId, {
      type: 'title_rejected',
      title: 'Title Revision Required',
      message: `Your project title "${displayTitle}" requires revisions. Reason: ${data.reason}`,
      metadata: { projectId: project._id, rejectedBy: user._id },
    });

    return { project };
  }

  /**
   * Add a comment to a specific title proposal.
   * Supports proposal lookup by proposal subdocument ID (legacy shape)
   * and by numeric array index (current string-array shape).
   *
   * @param {Object} payload
   * @param {string} payload.projectId
   * @param {string} payload.proposalId
   * @param {Object} payload.user
   * @param {string} payload.text
   * @returns {Object} { project }
   */
  async addTitleComment({ projectId, proposalId, user, text }) {
    const project = await this._getProjectOrFail(projectId);

    const proposals = Array.isArray(project.titleProposals) ? project.titleProposals : [];
    if (proposals.length === 0) {
      throw new AppError(
        'No title proposals found for this project.',
        404,
        'TITLE_PROPOSAL_NOT_FOUND',
      );
    }

    const metadataEntries = Array.isArray(project.titleProposalMetadata)
      ? project.titleProposalMetadata
      : [];

    let proposalIndex = metadataEntries.findIndex(
      (m) => m?._id && String(m._id) === String(proposalId),
    );

    if (proposalIndex === -1) {
      proposalIndex = proposals.findIndex((proposal) => {
        if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) return false;
        return proposal._id?.toString?.() === proposalId;
      });
    }

    if (proposalIndex === -1 && /^\d+$/.test(proposalId)) {
      const parsedIndex = Number.parseInt(proposalId, 10);
      if (parsedIndex >= 0 && parsedIndex < proposals.length) {
        proposalIndex = parsedIndex;
      } else if (parsedIndex === proposals.length && proposals.length > 0) {
        proposalIndex = parsedIndex - 1;
      }
    }

    if (proposalIndex === -1) {
      throw new AppError('Title proposal not found.', 404, 'TITLE_PROPOSAL_NOT_FOUND');
    }

    const proposal = proposals[proposalIndex];
    const proposalTitle =
      typeof proposal === 'string'
        ? proposal.trim()
        : typeof proposal?.title === 'string'
          ? proposal.title.trim()
          : '';

    if (!proposalTitle) {
      throw new AppError('Title proposal not found.', 404, 'TITLE_PROPOSAL_NOT_FOUND');
    }

    const normalizedText = typeof text === 'string' ? text.trim() : '';
    if (!normalizedText) {
      throw new AppError('Comment must not be empty.', 400, 'INVALID_COMMENT_TEXT');
    }

    if (!Array.isArray(project.titleProposalComments)) {
      project.titleProposalComments = [];
    }

    let thread = project.titleProposalComments.find(
      (entry) => Number(entry.proposalIndex) === proposalIndex,
    );

    if (!thread) {
      project.titleProposalComments.push({
        proposalIndex,
        proposalTitle,
        comments: [],
      });
      thread = project.titleProposalComments[project.titleProposalComments.length - 1];
    }

    const displayName =
      user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown user';

    thread.proposalTitle = proposalTitle;
    thread.comments.push({
      user: user?.id || user?._id,
      name: displayName,
      text: normalizedText,
      createdAt: new Date(),
    });

    if (typeof project.markModified === 'function') {
      project.markModified('titleProposalComments');
    }

    await project.save();

    return { project };
  }

  /**
   * Resubmit a project whose title was sent back for revision.
   * The team leader can edit and re-submit. Alias for updateTitle + submitTitle
   * when status is REVISION_REQUIRED.
   * Transitions titleStatus: REVISION_REQUIRED → DRAFT (via update), then → SUBMITTED.
   * @param {string} projectId
   * @param {string} userId
   * @param {Object} data - { title?, abstract?, keywords? }
   * @returns {Object} { project, similarProjects }
   */
  async reviseAndResubmit(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);

    if (project.titleStatus !== TITLE_STATUSES.REVISION_REQUIRED) {
      throw new AppError(
        'This project is not currently marked for revision.',
        400,
        'INVALID_STATUS_TRANSITION',
      );
    }

    await this._assertTeamLeader(project.teamId, userId);

    // Apply edits
    if (data.title !== undefined) project.title = data.title;
    if (data.abstract !== undefined) project.abstract = data.abstract;
    if (data.keywords !== undefined) project.keywords = data.keywords;

    // Sync proposal metadata & pitch deck
    if (Array.isArray(project.titleProposalMetadata) && project.titleProposalMetadata.length > 0) {
      let targetIndex = -1;
      if (data.proposalId !== undefined && data.proposalId !== null) {
        targetIndex = project.titleProposalMetadata.findIndex(
          (m, idx) => String(m._id) === String(data.proposalId) || idx === Number(data.proposalId),
        );
      }
      if (targetIndex === -1 && project.title) {
        targetIndex = project.titleProposalMetadata.findIndex((m) => m.title === project.title);
      }
      if (targetIndex === -1) {
        targetIndex = 0;
      }

      if (targetIndex !== -1 && project.titleProposalMetadata[targetIndex]) {
        if (data.title) {
          project.titleProposalMetadata[targetIndex].title = data.title;
          if (
            Array.isArray(project.titleProposals) &&
            project.titleProposals[targetIndex] !== undefined
          ) {
            project.titleProposals[targetIndex] = data.title;
          }
        }
        if (data.description) {
          project.titleProposalMetadata[targetIndex].description = data.description;
        }
        if (data.pitchDeck && typeof data.pitchDeck === 'object') {
          project.titleProposalMetadata[targetIndex].pitchDeck = data.pitchDeck;
        }
        project.titleProposalMetadata[targetIndex].status = 'pending';
      }
    }

    project.titleStatus = TITLE_STATUSES.SUBMITTED;
    project.rejectionReason = null;
    await project.save();

    // Similarity check
    const otherProjects = await Project.find({
      _id: { $ne: project._id },
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    }).select(
      'title abstract keywords academicYear targetBeneficiary techStack titleProposalMetadata capstoneType',
    );

    const similarProjects = findSimilarProjects(
      { title: project.title, keywords: project.keywords },
      otherProjects,
    );

    // Notify instructors
    await this._notifyInstructors({
      type: 'title_submitted',
      title: 'Revised Title Submission',
      message: `A revised project title "${project.title}" has been resubmitted for approval.`,
      metadata: { projectId: project._id },
    });

    // Notify defense committee (adviser, secretary, panelists)
    await this._notifyCommittee(project, {
      type: 'title_submitted',
      title: 'Revised Proposal Resubmitted for Defense Review',
      message: `Team has resubmitted their revised proposal "${project.title}" for committee evaluation.`,
      metadata: { projectId: project._id },
    });

    return { project, similarProjects };
  }

  /* ═══════════════ Title Modification (post-approval) ═══════════════ */

  /**
   * Request a title modification after the title has been approved.
   * Transitions titleStatus: APPROVED → PENDING_MODIFICATION
   * @param {string} projectId
   * @param {string} userId - Team leader.
   * @param {Object} data - { proposedTitle, justification }
   * @returns {Object} { project }
   */
  async requestTitleModification(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);

    const allowedStatuses = [TITLE_STATUSES.APPROVED, TITLE_STATUSES.APPROVED_WITH_REVISION];
    if (!allowedStatuses.includes(project.titleStatus)) {
      throw new AppError(
        'Title modification can only be requested for approved titles.',
        400,
        'INVALID_STATUS_TRANSITION',
      );
    }

    if (project.titleModificationRequest?.status === 'pending') {
      throw new AppError(
        'A title modification request is already pending.',
        409,
        'MODIFICATION_PENDING',
      );
    }

    await this._assertTeamLeader(project.teamId, userId);

    // Capture the current status before transitioning, so we can restore it on denial
    const previousTitleStatus = project.titleStatus;

    project.titleStatus = TITLE_STATUSES.PENDING_MODIFICATION;
    project.titleModificationRequest = {
      proposedTitle: data.proposedTitle,
      justification: data.justification,
      status: 'pending',
      requestedAt: new Date(),
      // Remember the status we came from so a denial can restore it correctly
      fromStatus: previousTitleStatus,
    };
    await project.save();

    // Notify instructors
    await this._notifyInstructors({
      type: 'title_modification_requested',
      title: 'Title Modification Request',
      message: `Team requests to change title from "${project.title}" to "${data.proposedTitle}".`,
      metadata: { projectId: project._id },
    });

    return { project };
  }

  /**
   * Approve or deny a pending title modification (instructor action).
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { action: 'approved'|'denied', reviewNote? }
   * @returns {Object} { project }
   */
  async resolveTitleModification(projectId, user, data) {
    const project = await this._getProjectOrFail(projectId);

    await this._assertCanReviewTitle(user, project);

    if (
      project.titleStatus !== TITLE_STATUSES.PENDING_MODIFICATION ||
      project.titleModificationRequest?.status !== 'pending'
    ) {
      throw new AppError(
        'No pending title modification request to resolve.',
        400,
        'NO_PENDING_MODIFICATION',
      );
    }

    project.titleModificationRequest.status = data.action;
    project.titleModificationRequest.reviewedBy = user._id;
    project.titleModificationRequest.reviewNote = data.reviewNote || '';
    project.titleModificationRequest.reviewedAt = new Date();

    if (data.action === 'approved') {
      project.title = project.titleModificationRequest.proposedTitle;
      // Fully approved — unlock Capstone 1
      project.titleStatus = TITLE_STATUSES.APPROVED;
    } else {
      // Denied — restore to the status the student started from so they can try again
      const restoredStatus =
        project.titleModificationRequest.fromStatus === TITLE_STATUSES.APPROVED_WITH_REVISION
          ? TITLE_STATUSES.APPROVED_WITH_REVISION
          : TITLE_STATUSES.APPROVED;
      project.titleStatus = restoredStatus;
    }
    await project.save();

    const verb = data.action === 'approved' ? 'approved' : 'denied';
    await this._notifyTeamMembers(project.teamId, {
      type: 'title_modification_resolved',
      title: `Title Modification ${verb.charAt(0).toUpperCase() + verb.slice(1)}`,
      message: `Your title modification request has been ${verb}.${data.reviewNote ? ` Note: ${data.reviewNote}` : ''}`,
      metadata: { projectId: project._id, resolvedBy: user._id, action: data.action },
    });

    return { project };
  }

  /* ═══════════════ Adviser & Panelist Assignment ═══════════════ */

  /**
   * Post-Approval Hard Gate Evaluator:
   * Checks whether the project satisfies the two institutional prerequisites:
   * 1. Final defense verdict is 'Passed' or 'Passed with Revisions'
   * 2. All items on the final Action Done Matrix (ADM) have been signed by the Adviser and Panel Chair
   *
   * If both are satisfied:
   * - Sets projectStatus to 'final_approved'
   * - Unlocks 'full_academic_paper' and 'condensed_journal_paper' in unlockedDeliverables
   * - Emits socket notification
   * @param {string} projectId
   * @returns {Promise<{ isUnlocked: boolean, project: Object }>}
   */
  async evaluatePostApprovalUnlocks(projectId) {
    const project = await Project.findById(projectId);
    if (!project) return { isUnlocked: false, project: null };

    // 1. Check final defense verdict
    const finalEvaluations = await Evaluation.find({
      projectId,
      defenseType: DEFENSE_TYPES.FINAL,
      status: EVALUATION_STATUSES.RELEASED,
    });

    const isPassedVerdict =
      finalEvaluations.length > 0 &&
      finalEvaluations.every(
        (e) =>
          e.decision &&
          ['passed', 'passed_with_revision', 'approved'].includes(String(e.decision).toLowerCase()),
      );

    const scheduleVerdict = String(project.defenseSchedule?.verdict || '').toLowerCase();
    const isSchedulePassed =
      scheduleVerdict.includes('pass') || scheduleVerdict.includes('approved');

    const hasPassedFinalDefense = isPassedVerdict || isSchedulePassed;

    // 2. Check Action Done Matrix signatures
    const isSecretaryDone = Boolean(project.admSignatures?.secretary?.endorsed);
    const isAdviserDone = Boolean(project.admSignatures?.adviser?.signed);
    const isChairDone = Boolean(project.admSignatures?.chair?.signed);

    const allRowsSigned =
      Array.isArray(project.actionDoneMatrix) &&
      project.actionDoneMatrix.length > 0 &&
      project.actionDoneMatrix.every(
        (row) => row.isLocked || (Array.isArray(row.signatures) && row.signatures.length > 0),
      );

    const isADMApproved =
      project.admStatus === 'approved' ||
      (isSecretaryDone &&
        isAdviserDone &&
        isChairDone &&
        (project.actionDoneMatrix.length === 0 || allRowsSigned));

    if (hasPassedFinalDefense && isADMApproved) {
      project.projectStatus = PROJECT_STATUSES.FINAL_APPROVED;
      project.stage = 'final';

      const currentUnlocked = new Set(project.unlockedDeliverables || []);
      currentUnlocked.add(DELIVERABLE_TYPES.FULL_ACADEMIC_PAPER);
      currentUnlocked.add(DELIVERABLE_TYPES.CONDENSED_JOURNAL_PAPER);
      currentUnlocked.add(DELIVERABLE_TYPES.FINAL_APPROVED_PAPER);
      project.unlockedDeliverables = Array.from(currentUnlocked);

      await project.save();

      try {
        emitToRoom(`project:${project._id}`, 'project:postApprovalUnlocked', {
          projectId: project._id,
          projectStatus: project.projectStatus,
          unlockedDeliverables: project.unlockedDeliverables,
        });
      } catch (_err) {
        // non-fatal
      }

      return { isUnlocked: true, project };
    }

    return { isUnlocked: false, project };
  }
}

export default new ProjectTitleService();
