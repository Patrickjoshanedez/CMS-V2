import mongoose from 'mongoose';
import Project from './project.model.js';
import Team from '../teams/team.model.js';
import User from '../users/user.model.js';
import Section from '../academics/section.model.js';
import Notification from '../notifications/notification.model.js';
import Submission from '../submissions/submission.model.js';
import AppError from '../../utils/AppError.js';
import { findSimilarProjects } from '../../utils/titleSimilarity.js';
import storageService from '../../services/storage.index.js';
import { emitToUser } from '../../services/socket.service.js';
import settingsService from '../settings/settings.service.js';
import {
  ROLES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  CAPSTONE_PHASES,
  PROTOTYPE_TYPES,
  PLAGIARISM_STATUSES,
  CAPSTONE_TITLE_MAPPING,
  SDG_TAG_SUGGESTIONS,
} from '@cms/shared';

/**
 * Default plagiarism threshold (fallback if settings cannot be loaded).
 * The actual value is read from SystemSettings at runtime.
 */
const DEFAULT_ORIGINALITY_THRESHOLD = 75;

/**
 * ProjectService — Business logic for capstone project management.
 * Handles creation, title workflow, adviser/panelist assignment, and status transitions.
 */
class ProjectService {
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

      if (!title) continue;

      if (!normalizedByTitle.has(title)) {
        normalizedByTitle.set(title, {
          title,
          description,
          capstoneType,
          sdgTags,
        });
      }
    }

    return [...normalizedByTitle.values()];
  }

  /* ═══════════════════ Creation ═══════════════════ */

  /**
   * Create a new project for the authenticated student's team.
   * The student must be a team leader with no existing active project.
   * Also runs a similarity check against existing titles and returns warnings.
   * @param {string} userId - The requesting student (team leader).
   * @param {Object} data - { title, titleProposals, abstract?, keywords?, academicYear }
   * @returns {Object} { project, similarProjects }
   */
  async createProject(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can create projects.', 403, 'FORBIDDEN');
    }

    // Resolve section ID: explicit payload > team > user
    let effectiveSectionId = data.sectionId;
    if (!effectiveSectionId) {
      // Try to get from team context
      if (user.teamId) {
        const team = await Team.findById(user.teamId).select('sectionId');
        if (team?.sectionId) {
          effectiveSectionId = team.sectionId;
        }
      }
      // Fall back to user section if available
      if (!effectiveSectionId && user.sectionId) {
        effectiveSectionId = user.sectionId;
      }
    }

    if (!effectiveSectionId) {
      throw new AppError(
        'No section found. Please provide a section, ensure your team has a section, or update your profile.',
        400,
        'SECTION_NOT_FOUND',
      );
    }

    const section = await Section.findById(effectiveSectionId).populate('courseId', 'name code');
    if (!section) {
      throw new AppError('Selected section was not found.', 404, 'SECTION_NOT_FOUND');
    }

    if (section.academicYear !== data.academicYear) {
      throw new AppError(
        'Selected section does not belong to the selected academic year.',
        400,
        'SECTION_YEAR_MISMATCH',
      );
    }

    let team = null;
    if (!user.teamId) {
      if (!data.allowSoloCapstone || !data.soloCapstoneConfirmed) {
        throw new AppError(
          'You must have an active team, or explicitly confirm solo capstone mode to continue.',
          400,
          'NO_TEAM',
        );
      }

      team = await this._createSoloTeamForStudent(user, data.academicYear);
    }

    if (!team) {
      team = await Team.findById(user.teamId);
    }

    if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');

    if (!team.isLocked) {
      throw new AppError(
        'Your team must be finalized before creating a project.',
        400,
        'TEAM_NOT_FINALIZED',
      );
    }

    if (team.leaderId.toString() !== userId.toString()) {
      throw new AppError('Only the team leader can create a project.', 403, 'FORBIDDEN');
    }

    const normalizedTitleProposals = this._normalizeTitleProposals(data.titleProposals);
    const normalizedSdgTags = [...new Set((data.sdgTags || []).map((tag) => tag.trim()))];

    if (normalizedSdgTags.length === 0) {
      throw new AppError('At least one SDG tag is required.', 400, 'SDG_TAGS_REQUIRED');
    }

    const hasInvalidSdgTag = normalizedSdgTags.some((tag) => !SDG_TAG_SUGGESTIONS.includes(tag));
    if (hasInvalidSdgTag) {
      throw new AppError('One or more SDG tags are invalid.', 400, 'INVALID_SDG_TAG');
    }

    if (normalizedTitleProposals.length < 5) {
      throw new AppError(
        'At least 5 unique title proposals are required.',
        400,
        'MIN_TITLE_PROPOSALS',
      );
    }

    if (!normalizedTitleProposals[0]?.description) {
      throw new AppError(
        'Proposal 1 must include a description.',
        400,
        'PROPOSAL_DESCRIPTION_REQUIRED',
      );
    }

    const hasIncompleteProposalMetadata = normalizedTitleProposals.some(
      (proposal) =>
        !proposal.description ||
        proposal.capstoneType.length === 0 ||
        proposal.sdgTags.length === 0,
    );
    if (hasIncompleteProposalMetadata) {
      throw new AppError(
        'Each title proposal must include a description, capstone type, and at least one SDG tag.',
        400,
        'INCOMPLETE_TITLE_PROPOSAL_METADATA',
      );
    }

    const proposalTitles = normalizedTitleProposals.map((proposal) => proposal.title);
    if (!proposalTitles.includes(data.title.trim())) {
      throw new AppError(
        'Selected project title must be one of the submitted title proposals.',
        400,
        'TITLE_NOT_IN_PROPOSALS',
      );
    }

    if (!data.memberRoleAssignments || !Array.isArray(data.memberRoleAssignments)) {
      throw new AppError('Member role assignments are required.', 400, 'MISSING_ROLE_ASSIGNMENTS');
    }

    const teamMemberIds = team.members.map((memberId) => memberId.toString()).sort();
    const assignedMemberIds = data.memberRoleAssignments
      .map((assignment) => assignment.userId.toString())
      .sort();

    if (teamMemberIds.length !== assignedMemberIds.length) {
      throw new AppError(
        'Every team member (including the leader) must have one assigned professional capstone title.',
        400,
        'INCOMPLETE_ROLE_ASSIGNMENTS',
      );
    }

    const teamMemberSet = new Set(teamMemberIds);
    for (const assignedId of assignedMemberIds) {
      if (!teamMemberSet.has(assignedId)) {
        throw new AppError(
          'Role assignments can only include members from your current team.',
          403,
          'INVALID_ASSIGNMENT_MEMBER',
        );
      }
    }

    const uniqueAssignedMemberIds = new Set(assignedMemberIds);
    if (uniqueAssignedMemberIds.size !== assignedMemberIds.length) {
      throw new AppError(
        'Each team member can only be assigned one professional capstone title.',
        400,
        'DUPLICATE_MEMBER_ASSIGNMENT',
      );
    }

    const professionalTitles = data.memberRoleAssignments.map(
      (assignment) => assignment.professionalTitle,
    );
    const uniqueProfessionalTitles = new Set(professionalTitles);
    if (uniqueProfessionalTitles.size !== professionalTitles.length) {
      throw new AppError(
        'Each professional capstone title can only be assigned once per project.',
        400,
        'DUPLICATE_PROFESSIONAL_TITLE',
      );
    }

    const memberRoleAssignments = data.memberRoleAssignments.map((assignment) => {
      const mapping = CAPSTONE_TITLE_MAPPING[assignment.professionalTitle];
      return {
        userId: assignment.userId,
        professionalTitle: assignment.professionalTitle,
        traditionalRole: mapping.traditionalRole,
        responsibilities: mapping.responsibilities,
      };
    });

    // Prevent duplicate active projects per team (rejected projects don't block creation)
    const existingProject = await Project.findOne({
      teamId: team._id,
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    });
    if (existingProject) {
      throw new AppError(
        'Your team already has an active project. Only one active project per team is allowed.',
        409,
        'PROJECT_EXISTS',
      );
    }

    // Similarity check against all non-rejected projects
    const allProjects = await Project.find({
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    }).select('title keywords');

    const similarProjects = findSimilarProjects(
      { title: data.title, keywords: data.keywords || [] },
      allProjects,
    );

    const project = await Project.create({
      teamId: team._id,
      title: data.title,
      titleProposals: proposalTitles,
      titleProposalMetadata: normalizedTitleProposals,
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      sdgTags: normalizedSdgTags,
      academicYear: data.academicYear,
      courseId: section.courseId._id,
      sectionId: section._id,
      memberRoleAssignments,
    });

    team.courseId = section.courseId._id;
    team.sectionId = section._id;
    team.academicYear = section.academicYear;
    await team.save();

    // Notify team members (exclude the creator)
    await this._notifyTeamMembers(
      team._id,
      {
        type: 'system',
        title: 'Project Created',
        message: `A new project "${project.title}" has been created for your team.`,
        metadata: { projectId: project._id },
      },
      { excludeUserId: userId },
    );

    return { project, similarProjects };
  }

  /**
   * Create a locked single-member team for an explicitly confirmed solo capstone flow.
   * This keeps downstream project rules consistent by preserving team-based ownership.
   */
  async _createSoloTeamForStudent(user, academicYear) {
    const soloTeamName = `${user.firstName} ${user.lastName} - Solo Capstone`;

    const team = await Team.create({
      name: soloTeamName,
      leaderId: user._id,
      members: [user._id],
      isLocked: true,
      academicYear,
    });

    user.teamId = team._id;
    await user.save();

    return team;
  }

  /* ═══════════════════ Read ═══════════════════ */

  /**
   * Get a single project by ID with populated references.
   * @param {string} projectId
   * @param {Object} requester - Authenticated user context
   * @returns {Object} { project }
   */
  async getProject(projectId, requester) {
    const project = await Project.findById(projectId)
      .populate('teamId', 'name leaderId members academicYear courseId sectionId')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST].includes(requester?.role);
    if (!isFaculty) {
      if (requester?.role !== ROLES.STUDENT) {
        throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
      }

      const isTeamMember = project.teamId?.members?.some(
        (memberId) => memberId.toString() === requester._id.toString(),
      );

      const isArchived = project.isArchived === true || project.projectStatus === 'archived';

      if (!isTeamMember && !isArchived) {
        throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
      }
    }

    return { project };
  }

  /**
   * Get the project belonging to the authenticated student's team.
   * @param {string} userId
   * @returns {Object} { project }
   */
  async getMyProject(userId) {
    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      throw new AppError('You are not in a team or have no project.', 404, 'NO_TEAM');
    }

    const populateOpts = [
      { path: 'teamId', select: 'name leaderId members academicYear courseId sectionId' },
      { path: 'adviserId', select: 'firstName middleName lastName email profilePicture' },
      { path: 'panelistIds', select: 'firstName middleName lastName email profilePicture' },
      { path: 'sectionId', select: 'name academicYear courseId' },
      { path: 'courseId', select: 'name code' },
      {
        path: 'memberRoleAssignments.userId',
        select: 'firstName middleName lastName email',
      },
    ];

    // Prefer the active (non-rejected) project; fall back to most-recent rejected
    let project = await Project.findOne({
      teamId: user.teamId,
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    }).populate(populateOpts);

    if (!project) {
      project = await Project.findOne({ teamId: user.teamId })
        .sort({ createdAt: -1 })
        .populate(populateOpts);
    }

    if (!project) {
      throw new AppError('Your team does not have a project yet.', 404, 'PROJECT_NOT_FOUND');
    }

    return { project };
  }

  /**
   * List projects with filters and pagination (faculty-facing).
   * @param {Object} query - { page, limit, academicYear?, titleStatus?, projectStatus?, search?, adviserId? }
   * @returns {Object} { projects, pagination }
   */
  async listProjects(query) {
    const {
      page = 1,
      limit = 10,
      academicYear,
      titleStatus,
      projectStatus,
      search,
      adviserId,
    } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (titleStatus) filter.titleStatus = titleStatus;
    if (projectStatus) filter.projectStatus = projectStatus;
    if (adviserId) filter.adviserId = adviserId;
    if (search) {
      filter.$text = { $search: search };
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teamId', 'name leaderId members academicYear courseId sectionId')
        .populate('adviserId', 'firstName middleName lastName email')
        .populate('panelistIds', 'firstName middleName lastName email')
        .populate('courseId', 'name code')
        .populate('sectionId', 'name academicYear'),
      Project.countDocuments(filter),
    ]);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /* ═══════════════════ Standalone Title Similarity Check ═══════════════════ */

  /**
   * Two-tier title similarity check for real-time duplicate detection.
   *
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
        .select('title keywords')
        .lean();
    } catch {
      // Fallback if $text search fails (e.g. empty string) — fetch all
      candidates = [];
    }

    // If $text returned nothing, broaden to all non-rejected projects
    // so Levenshtein can still catch close matches (e.g. word reordering)
    if (candidates.length === 0) {
      candidates = await Project.find(filter).select('title keywords').lean();
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

    if (project.titleStatus !== TITLE_STATUSES.DRAFT) {
      throw new AppError('Title can only be edited while in draft status.', 400, 'TITLE_NOT_DRAFT');
    }

    await this._assertTeamLeader(project.teamId, userId);

    // Merge updates
    if (data.title !== undefined) project.title = data.title;
    if (data.abstract !== undefined) project.abstract = data.abstract;
    if (data.keywords !== undefined) project.keywords = data.keywords;
    await project.save();

    // Run similarity check on updated title
    const otherProjects = await Project.find({
      _id: { $ne: project._id },
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    }).select('title keywords');

    const similarProjects = findSimilarProjects(
      { title: project.title, keywords: project.keywords },
      otherProjects,
    );

    return { project, similarProjects };
  }

  /* ═══════════════════ Title workflow ═══════════════════ */

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

    project.titleStatus = TITLE_STATUSES.SUBMITTED;
    await project.save();

    // Notify all instructors
    await this._notifyInstructors({
      type: 'title_submitted',
      title: 'New Title Submission',
      message: `A project title "${project.title}" has been submitted for approval.`,
      metadata: { projectId: project._id },
    });

    return { project };
  }

  /**
   * Approve a submitted project title.
   * Transitions titleStatus: SUBMITTED → APPROVED
   * @param {string} projectId
   * @param {string} instructorId
   * @returns {Object} { project }
   */
  async approveTitle(projectId, instructorId) {
    const project = await this._getProjectOrFail(projectId);

    if (project.titleStatus !== TITLE_STATUSES.SUBMITTED) {
      throw new AppError(
        'Only submitted titles can be approved.',
        400,
        'INVALID_STATUS_TRANSITION',
      );
    }

    project.titleStatus = TITLE_STATUSES.APPROVED;
    project.driveFolderId = null;

    await project.save();

    // Notify team members
    await this._notifyTeamMembers(project.teamId, {
      type: 'title_approved',
      title: 'Title Approved',
      message: `Your project title "${project.title}" has been approved.`,
      metadata: { projectId: project._id, approvedBy: instructorId },
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
  async rejectTitle(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);

    if (project.titleStatus !== TITLE_STATUSES.SUBMITTED) {
      throw new AppError(
        'Only submitted titles can be rejected.',
        400,
        'INVALID_STATUS_TRANSITION',
      );
    }

    project.titleStatus = TITLE_STATUSES.REVISION_REQUIRED;
    project.rejectionReason = data.reason;
    await project.save();

    await this._notifyTeamMembers(project.teamId, {
      type: 'title_rejected',
      title: 'Title Revision Required',
      message: `Your project title "${project.title}" requires revisions. Reason: ${data.reason}`,
      metadata: { projectId: project._id, rejectedBy: instructorId },
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

    let proposalIndex = proposals.findIndex((proposal) => {
      if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) return false;
      return proposal._id?.toString?.() === proposalId;
    });

    if (proposalIndex === -1 && /^\d+$/.test(proposalId)) {
      const parsedIndex = Number.parseInt(proposalId, 10);
      if (parsedIndex >= 0 && parsedIndex < proposals.length) {
        proposalIndex = parsedIndex;
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
    project.titleStatus = TITLE_STATUSES.SUBMITTED;
    project.rejectionReason = null;
    await project.save();

    // Similarity check
    const otherProjects = await Project.find({
      _id: { $ne: project._id },
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    }).select('title keywords');

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

    if (project.titleStatus !== TITLE_STATUSES.APPROVED) {
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

    project.titleStatus = TITLE_STATUSES.PENDING_MODIFICATION;
    project.titleModificationRequest = {
      proposedTitle: data.proposedTitle,
      justification: data.justification,
      status: 'pending',
      requestedAt: new Date(),
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
  async resolveTitleModification(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);

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
    project.titleModificationRequest.reviewedBy = instructorId;
    project.titleModificationRequest.reviewNote = data.reviewNote || '';
    project.titleModificationRequest.reviewedAt = new Date();

    if (data.action === 'approved') {
      project.title = project.titleModificationRequest.proposedTitle;
    }

    // Return to approved status regardless of decision
    project.titleStatus = TITLE_STATUSES.APPROVED;
    await project.save();

    const verb = data.action === 'approved' ? 'approved' : 'denied';
    await this._notifyTeamMembers(project.teamId, {
      type: 'title_modification_resolved',
      title: `Title Modification ${verb.charAt(0).toUpperCase() + verb.slice(1)}`,
      message: `Your title modification request has been ${verb}.${data.reviewNote ? ` Note: ${data.reviewNote}` : ''}`,
      metadata: { projectId: project._id, resolvedBy: instructorId, action: data.action },
    });

    return { project };
  }

  /* ═══════════════ Adviser & Panelist Assignment ═══════════════ */

  /**
   * Assign an adviser to a project (instructor action).
   * @param {string} projectId
   * @param {string} instructorId - Requesting instructor.
   * @param {Object} data - { adviserId }
   * @returns {Object} { project }
   */
  async assignAdviser(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);

    const adviser = await User.findById(data.adviserId);
    if (!adviser || adviser.role !== ROLES.ADVISER) {
      throw new AppError('The specified user is not a valid adviser.', 400, 'INVALID_ADVISER');
    }

    project.adviserId = data.adviserId;
    await project.save();

    // Notify the adviser
    const adviserNotif = await Notification.create({
      userId: data.adviserId,
      type: 'adviser_assigned',
      title: 'Adviser Assignment',
      message: `You have been assigned as adviser for the project "${project.title}".`,
      metadata: { projectId: project._id, assignedBy: instructorId },
    });
    emitToUser(data.adviserId, 'notification:new', adviserNotif);

    // Notify team members
    await this._notifyTeamMembers(project.teamId, {
      type: 'adviser_assigned',
      title: 'Adviser Assigned',
      message: `${adviser.fullName} has been assigned as your project adviser.`,
      metadata: { projectId: project._id, adviserId: data.adviserId },
    });

    return { project };
  }

  /**
   * Assign a panelist to a project (instructor action).
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { panelistId }
   * @returns {Object} { project }
   */
  async assignPanelist(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);

    const panelist = await User.findById(data.panelistId);
    if (!panelist || panelist.role !== ROLES.PANELIST) {
      throw new AppError('The specified user is not a valid panelist.', 400, 'INVALID_PANELIST');
    }

    if (project.panelistIds.length >= 3) {
      throw new AppError('A project can have at most 3 panelists.', 400, 'MAX_PANELISTS_REACHED');
    }

    if (project.panelistIds.some((id) => id.toString() === data.panelistId)) {
      throw new AppError(
        'This panelist is already assigned to this project.',
        409,
        'PANELIST_ALREADY_ASSIGNED',
      );
    }

    project.panelistIds.push(data.panelistId);
    await project.save();

    // Notify the panelist
    const panelistNotif = await Notification.create({
      userId: data.panelistId,
      type: 'panelist_assigned',
      title: 'Panelist Assignment',
      message: `You have been assigned as a panelist for the project "${project.title}".`,
      metadata: { projectId: project._id, assignedBy: instructorId },
    });
    emitToUser(data.panelistId, 'notification:new', panelistNotif);

    // Notify team
    await this._notifyTeamMembers(project.teamId, {
      type: 'panelist_assigned',
      title: 'Panelist Assigned',
      message: `${panelist.fullName} has been assigned as a panelist for your project.`,
      metadata: { projectId: project._id, panelistId: data.panelistId },
    });

    return { project };
  }

  /**
   * Remove a panelist from a project (instructor action).
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { panelistId }
   * @returns {Object} { project }
   */
  async removePanelist(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);
    const panelist = await User.findById(data.panelistId);

    const idx = project.panelistIds.findIndex((id) => id.toString() === data.panelistId);
    if (idx === -1) {
      throw new AppError(
        'This panelist is not assigned to this project.',
        404,
        'PANELIST_NOT_FOUND',
      );
    }

    project.panelistIds.splice(idx, 1);
    await project.save();

    if (panelist) {
      const removedPanelistNotif = await Notification.create({
        userId: data.panelistId,
        type: 'panelist_removed',
        title: 'Panelist Removed',
        message: `You have been removed as a panelist for the project "${project.title}".`,
        metadata: { projectId: project._id, removedBy: instructorId },
      });
      emitToUser(data.panelistId, 'notification:new', removedPanelistNotif);
    }

    return { project };
  }

  /**
   * Allow a panelist to self-select into a project (panelist action).
   * Used in the "Panelist Topic Selection" workflow where panelists
   * choose the groups they will handle.
   * @param {string} projectId
   * @param {string} panelistId
   * @returns {Object} { project }
   */
  async selectAsPanelist(projectId, panelistId) {
    const project = await this._getProjectOrFail(projectId);

    if (project.panelistIds.length >= 3) {
      throw new AppError(
        'This project already has the maximum number of panelists.',
        400,
        'MAX_PANELISTS_REACHED',
      );
    }

    if (project.panelistIds.some((id) => id.toString() === panelistId)) {
      throw new AppError(
        'You are already a panelist for this project.',
        409,
        'PANELIST_ALREADY_ASSIGNED',
      );
    }

    const panelist = await User.findById(panelistId);
    if (!panelist || panelist.role !== ROLES.PANELIST) {
      throw new AppError('Invalid panelist.', 400, 'INVALID_PANELIST');
    }

    project.panelistIds.push(panelistId);
    await project.save();

    // Notify team
    await this._notifyTeamMembers(project.teamId, {
      type: 'panelist_assigned',
      title: 'Panelist Joined',
      message: `${panelist.fullName} has selected your project for panel review.`,
      metadata: { projectId: project._id, panelistId },
    });

    return { project };
  }

  /* ═══════════════ Deadlines ═══════════════ */

  /**
   * Set or update chapter/proposal deadlines for a project.
   * @param {string} projectId
   * @param {Object} data - { chapter1?, chapter2?, chapter3?, proposal? }
   * @param {Object} requester - Authenticated requester context.
   * @returns {Object} { project }
   */
  async setDeadlines(projectId, data, requester) {
    const project = await this._getProjectOrFail(projectId);
    const applyToSection = data.applyToSection === true;
    const requesterId = requester?._id?.toString?.();

    if (applyToSection && requester?.role !== ROLES.INSTRUCTOR) {
      throw new AppError(
        'Only instructors can apply deadlines to an entire section.',
        403,
        'FORBIDDEN',
      );
    }

    if (
      !applyToSection &&
      requester?.role === ROLES.ADVISER &&
      (!project.adviserId || project.adviserId.toString() !== requesterId)
    ) {
      throw new AppError(
        'You can only update deadlines for projects assigned to you.',
        403,
        'FORBIDDEN',
      );
    }

    const targetProjects = applyToSection
      ? await Project.find({ sectionId: project.sectionId })
      : [project];

    const dateFields = [
      'chapter1',
      'chapter2',
      'chapter3',
      'proposal',
      'chapter4',
      'chapter5',
      'defense',
    ];

    let updatedProject = project;

    for (const targetProject of targetProjects) {
      dateFields.forEach((key) => {
        if (data[key] !== undefined) targetProject.deadlines[key] = data[key];
      });

      // Sync TBA flags — fields marked TBA have their date cleared.
      if (data.tba !== undefined) {
        targetProject.deadlines.tba = data.tba;
        data.tba.forEach((key) => {
          targetProject.deadlines[key] = null;
        });
      }

      await targetProject.save();

      await this._notifyTeamMembers(targetProject.teamId, {
        type: 'system',
        title: 'Deadlines Updated',
        message: 'Your project deadlines have been updated. Please check the new schedule.',
        metadata: { projectId: targetProject._id },
      });

      if (targetProject._id.toString() === projectId.toString()) {
        updatedProject = targetProject;
      }
    }

    return { project: updatedProject };
  }

  /* ═══════════════ Project-Level Status ═══════════════ */

  /**
   * Reject a project entirely (instructor action).
   * Sets projectStatus to REJECTED — "Create Another Project" pathway.
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { reason }
   * @returns {Object} { project }
   */
  async rejectProject(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);

    project.projectStatus = PROJECT_STATUSES.REJECTED;
    project.rejectionReason = data.reason;
    await project.save();

    await this._notifyTeamMembers(project.teamId, {
      type: 'project_rejected',
      title: 'Project Rejected',
      message: `Your project "${project.title}" has been rejected. Reason: ${data.reason}. You may create a new project.`,
      metadata: { projectId: project._id, rejectedBy: instructorId },
    });

    return { project };
  }

  /* ═══════════════ Capstone Phase Progression ═══════════════ */

  /**
   * Advance a project to the next capstone phase (instructor action).
   *
   * Phase transitions:
   * - 1 → 2: Requires chapter 1 upload signal OR proposal approved status
   * - 2 → 3: Allowed once the instructor decides the team is ready
   * - 3 → 4: Allowed once the instructor decides the team is ready
   * - 4 → (none): Phase 4 is the final phase — cannot advance further.
   *
   * @param {string} projectId
   * @param {string} instructorId - Requesting instructor
   * @returns {Object} { project, previousPhase, newPhase }
   */
  async advancePhase(projectId, instructorId) {
    const project = await this._getProjectOrFail(projectId);

    const { capstonePhase } = project;

    if (capstonePhase >= CAPSTONE_PHASES.PHASE_4) {
      throw new AppError(
        'This project is already at the final capstone phase.',
        400,
        'ALREADY_FINAL_PHASE',
      );
    }

    // Phase 1 → 2 requires chapter 1 evidence (upload exists) or a proposal-approved status.
    if (capstonePhase === CAPSTONE_PHASES.PHASE_1) {
      const hasChapterOneSubmission = await Submission.exists({
        projectId: project._id,
        type: 'chapter',
        chapter: 1,
      });

      if (
        project.projectStatus !== PROJECT_STATUSES.PROPOSAL_APPROVED &&
        !hasChapterOneSubmission
      ) {
        throw new AppError(
          'Upload Chapter 1 before advancing to Capstone 2.',
          400,
          'CHAPTER1_REQUIRED_FOR_PHASE_ADVANCE',
        );
      }
    }

    const previousPhase = project.capstonePhase;
    project.capstonePhase = capstonePhase + 1;
    await project.save();

    await this._notifyTeamMembers(project.teamId, {
      type: 'phase_advanced',
      title: 'Capstone Phase Advanced',
      message: `Your project "${project.title}" has advanced from Capstone ${previousPhase} to Capstone ${project.capstonePhase}.`,
      metadata: {
        projectId: project._id,
        previousPhase,
        newPhase: project.capstonePhase,
        advancedBy: instructorId,
      },
    });

    return { project, previousPhase, newPhase: project.capstonePhase };
  }

  /* ═══════════════ Prototype Showcasing ═══════════════ */

  /**
   * Add a prototype to a project (student/team leader action).
   * Capstone phase must be 2 or 3 for prototypes to be added.
   *
   * For media (image/video): pass file buffer, filename, etc.
   * For link: pass url in the data object.
   *
   * @param {string} projectId
   * @param {string} userId - Requesting student
   * @param {Object} data - { title, description?, type, url? }
   * @param {Object|null} file - multer file object (for media types)
   * @returns {Object} { project, prototype }
   */
  async addPrototype(projectId, userId, data, file = null) {
    const project = await this._getProjectOrFail(projectId);

    await this._assertTeamMember(project.teamId, userId);

    // Prototypes are only allowed during Capstone 2 & 3
    if (
      project.capstonePhase < CAPSTONE_PHASES.PHASE_2 ||
      project.capstonePhase > CAPSTONE_PHASES.PHASE_3
    ) {
      throw new AppError(
        'Prototypes can only be added during Capstone 2 or Capstone 3.',
        400,
        'INVALID_PHASE_FOR_PROTOTYPE',
      );
    }

    if (project.prototypes.length >= 20) {
      throw new AppError(
        'A project can have at most 20 prototypes.',
        400,
        'MAX_PROTOTYPES_REACHED',
      );
    }

    const prototypeData = {
      title: data.title,
      description: data.description || '',
      uploadedBy: userId,
    };

    // Determine prototype type and validate input
    if (data.type === PROTOTYPE_TYPES.LINK) {
      if (!data.url) {
        throw new AppError('A URL is required for link-type prototypes.', 400, 'URL_REQUIRED');
      }
      prototypeData.type = PROTOTYPE_TYPES.LINK;
      prototypeData.url = data.url;
    } else {
      if (!file) {
        throw new AppError('A file is required for media-type prototypes.', 400, 'FILE_REQUIRED');
      }
      const mime = file.validatedMime || file.mimetype;
      if (mime.startsWith('image/')) {
        prototypeData.type = PROTOTYPE_TYPES.IMAGE;
      } else if (mime.startsWith('video/')) {
        prototypeData.type = PROTOTYPE_TYPES.VIDEO;
      } else {
        throw new AppError(
          'Unsupported media type. Upload an image or video.',
          400,
          'UNSUPPORTED_MEDIA_TYPE',
        );
      }
    }

    // Push prototype to get its Mongoose subdocument _id
    project.prototypes.push(prototypeData);
    const proto = project.prototypes[project.prototypes.length - 1];

    // Upload media file to S3 if present
    if (file && proto.type !== PROTOTYPE_TYPES.LINK) {
      const mime = file.validatedMime || file.mimetype;
      const key = storageService.buildPrototypeKey(
        project._id.toString(),
        proto._id.toString(),
        file.originalname,
      );

      try {
        await storageService.uploadFile(file.buffer, key, mime, {
          projectId: project._id.toString(),
          prototypeId: proto._id.toString(),
          uploadedBy: userId.toString(),
        });
      } catch (error) {
        // Remove the prototype from array since upload failed
        project.prototypes.pull(proto._id);
        if (error.isOperational) {
          console.error('[ProjectService] Prototype upload failed:', error.code, error.message);
          throw error;
        }
        console.error('[ProjectService] Unexpected prototype upload error:', error);
        throw new AppError(
          'Failed to upload prototype file. Please try again later.',
          500,
          'PROTOTYPE_UPLOAD_ERROR',
        );
      }

      proto.storageKey = key;
      proto.fileName = file.originalname;
      proto.fileSize = file.size;
      proto.mimeType = mime;
    }

    await project.save();

    await this._notifyAdviser(project, {
      type: 'prototype_added',
      title: 'New Prototype Added',
      message: `A prototype "${data.title}" has been added to the project "${project.title}".`,
      metadata: { projectId: project._id, prototypeId: proto._id },
    });

    return { project, prototype: proto };
  }

  /**
   * Remove a prototype from a project (student/team member action).
   * Also deletes the associated file from S3 if it is a media-type prototype.
   *
   * @param {string} projectId
   * @param {string} prototypeId
   * @param {string} userId - Requesting student
   * @returns {Object} { project }
   */
  async removePrototype(projectId, prototypeId, userId) {
    const project = await this._getProjectOrFail(projectId);

    await this._assertTeamMember(project.teamId, userId);

    const proto = project.prototypes.id(prototypeId);
    if (!proto) {
      throw new AppError('Prototype not found.', 404, 'PROTOTYPE_NOT_FOUND');
    }

    // Delete S3 file if media-type
    if (proto.storageKey) {
      try {
        await storageService.deleteFile(proto.storageKey);
      } catch (err) {
        // Log but don't block removal — orphaned S3 objects can be cleaned up later
        console.warn(`[Prototype] Failed to delete S3 object: ${proto.storageKey}`, err.message);
      }
    }

    project.prototypes.pull({ _id: prototypeId });
    await project.save();

    return { project };
  }

  /**
   * Get all prototypes for a project, with signed URLs for media types.
   *
   * @param {string} projectId
   * @param {string} userId - Requesting user
   * @returns {Object} { prototypes }
   */
  async getPrototypes(projectId, _userId) {
    const project = await this._getProjectOrFail(projectId);

    // Any team member, adviser, panelist, or instructor can view prototypes
    // (authorization is handled at the route level — we just return the data)

    const prototypes = [];
    for (const proto of project.prototypes) {
      const item = proto.toObject();

      // Generate signed URL for media types
      if (item.storageKey) {
        try {
          item.signedUrl = await storageService.getSignedUrl(item.storageKey, 900);
        } catch {
          item.signedUrl = null;
        }
      }

      prototypes.push(item);
    }

    return { prototypes };
  }

  /* ═══════════════════ Archive & Completion ═══════════════════ */

  /**
   * Archive a project after final defense — sets status to ARCHIVED.
   * Only an instructor can archive. Both final_academic and final_journal
   * submissions must exist and be approved.
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { completionNotes? }
   * @returns {Object} { project }
   */
  async archiveProject(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);

    if (project.projectStatus === PROJECT_STATUSES.ARCHIVED) {
      throw new AppError('Project is already archived.', 400, 'ALREADY_ARCHIVED');
    }

    // Verify both final versions are submitted
    const [academic, journal] = await Promise.all([
      Submission.findOne({ projectId, type: 'final_academic' }).sort({ version: -1 }),
      Submission.findOne({ projectId, type: 'final_journal' }).sort({ version: -1 }),
    ]);

    if (!academic) {
      throw new AppError('Final academic version has not been submitted.', 400, 'MISSING_ACADEMIC');
    }
    if (!journal) {
      throw new AppError('Final journal version has not been submitted.', 400, 'MISSING_JOURNAL');
    }

    // --- Plagiarism clearance gate ---
    // Both final papers must have a completed plagiarism check with a passing score.
    // Fetch the configurable threshold from system settings
    let plagiarismThreshold;
    try {
      plagiarismThreshold = await settingsService.getPlagiarismThreshold();
    } catch {
      plagiarismThreshold = DEFAULT_ORIGINALITY_THRESHOLD;
    }

    this._assertPlagiarismCleared(academic, 'academic', plagiarismThreshold);
    this._assertPlagiarismCleared(journal, 'journal', plagiarismThreshold);

    project.projectStatus = PROJECT_STATUSES.ARCHIVED;
    project.isArchived = true;
    project.archivedAt = new Date();
    if (data.completionNotes) {
      project.completionNotes = data.completionNotes;
    }
    await project.save();

    // Notify team members
    await this._notifyTeamMembers(project.teamId, {
      type: 'project_archived',
      title: 'Project Archived',
      message: `Your project "${project.title}" has been archived. Congratulations!`,
      metadata: { projectId: project._id },
    });

    return { project };
  }

  /**
   * Search the archive for past capstone projects.
   * Students can only see journal versions; faculty can see both.
   * Supports text search by title/keywords, filtered by year, keyword, and topic.
   * @param {Object} query - { page, limit, search?, academicYear?, courseId?, keyword? }
   * @param {Object} user - The requesting user (for role-based visibility)
   * @returns {Object} { projects, pagination }
   */
  async searchArchive(query, user) {
    const { page = 1, limit = 10, search, academicYear, courseId, keyword } = query;
    const skip = (page - 1) * limit;

    const filter = { isArchived: true };
    if (academicYear) filter.academicYear = academicYear;
    if (courseId) filter.courseId = courseId;
    if (keyword) filter.keywords = { $in: [keyword] };
    if (search) filter.$text = { $search: search };

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teamId', 'name members')
        .populate('adviserId', 'firstName middleName lastName')
        .select(
          'title abstract keywords academicYear capstonePhase archivedAt adviserId teamId completionNotes isArchived',
        ),
      Project.countDocuments(filter),
    ]);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      // Role information for frontend to know what to show
      canViewAcademic: user.role !== ROLES.STUDENT,
    };
  }

  /**
   * Upload a completion certificate for a project (instructor-only).
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} file - Multer file object
   * @returns {Object} { project }
   */
  async uploadCertificate(projectId, instructorId, file) {
    const project = await this._getProjectOrFail(projectId);

    if (!project.isArchived && project.projectStatus !== PROJECT_STATUSES.ARCHIVED) {
      throw new AppError(
        'Project must be archived before uploading a certificate.',
        400,
        'NOT_ARCHIVED',
      );
    }

    const storageKey = storageService.buildCertificateKey(projectId, file.originalname);
    try {
      await storageService.uploadFile(file.buffer, storageKey, file.mimetype);
    } catch (error) {
      if (error.isOperational) {
        console.error('[ProjectService] Certificate upload failed:', error.code, error.message);
        throw error;
      }
      console.error('[ProjectService] Unexpected certificate upload error:', error);
      throw new AppError(
        'Failed to upload certificate. Please try again later.',
        500,
        'CERTIFICATE_UPLOAD_ERROR',
      );
    }

    project.certificateStorageKey = storageKey;
    await project.save();

    // Notify team
    await this._notifyTeamMembers(project.teamId, {
      type: 'certificate_uploaded',
      title: 'Certificate Uploaded',
      message: `A completion certificate has been uploaded for your project "${project.title}".`,
      metadata: { projectId: project._id },
    });

    return { project };
  }

  /**
   * Get the signed download URL for the completion certificate.
   * @param {string} projectId
   * @returns {Object} { url }
   */
  async getCertificateUrl(projectId) {
    const project = await this._getProjectOrFail(projectId);

    if (!project.certificateStorageKey) {
      throw new AppError(
        'No certificate has been uploaded for this project.',
        404,
        'NO_CERTIFICATE',
      );
    }

    try {
      const url = await storageService.getSignedUrl(project.certificateStorageKey, 3600);
      return { url };
    } catch (error) {
      if (error.isOperational) {
        console.error(
          '[ProjectService] Certificate URL generation failed:',
          error.code,
          error.message,
        );
        throw error;
      }
      console.error('[ProjectService] Unexpected certificate URL error:', error);
      throw new AppError(
        'Failed to retrieve certificate. Please try again later.',
        500,
        'CERTIFICATE_URL_ERROR',
      );
    }
  }

  /**
   * Generate a report of archived projects by academic year.
   * Instructor only. Returns counts and metadata.
   * @param {Object} query - { academicYear?, adviserId? }
   * @returns {Object} { report }
   */
  async generateReport(query) {
    const { academicYear, adviserId } = query;

    const matchStage = { isArchived: true };
    if (academicYear) matchStage.academicYear = academicYear;
    if (adviserId) matchStage.adviserId = new mongoose.Types.ObjectId(adviserId);

    const report = await Project.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$academicYear',
          count: { $sum: 1 },
          projects: {
            $push: {
              _id: '$_id',
              title: '$title',
              keywords: '$keywords',
              archivedAt: '$archivedAt',
            },
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const totalCount = report.reduce((sum, yr) => sum + yr.count, 0);

    return {
      report: {
        totalProjects: totalCount,
        byYear: report.map((yr) => ({
          academicYear: yr._id,
          count: yr.count,
          projects: yr.projects,
        })),
      },
    };
  }

  /* ═══════════════════ Bulk Upload (Instructor) ═══════════════════ */

  /**
   * Bulk-upload an archived capstone bundle in one request.
   * Creates one archived project record linked to exactly two final submissions:
   * - final_academic (academic paper)
   * - final_journal (journal paper)
   *
   * @param {string} instructorId - The instructor performing the bulk upload
   * @param {Object} data - { title, abstract?, keywords?, academicYear }
   * @param {Object} files - { academicPaperFile, academicJournalFile }
   * @returns {Object} { project, submissions }
   */
  async bulkUploadArchive(instructorId, data, files) {
    const academicPaperFile = files?.academicPaperFile;
    const academicJournalFile = files?.academicJournalFile;

    if (!academicPaperFile || !academicJournalFile) {
      throw new AppError(
        'Exactly one Academic Paper file and one Academic Journal file are required.',
        400,
        'DUAL_ARCHIVE_FILES_REQUIRED',
      );
    }

    const [defaultProfessionalTitle] = Object.keys(CAPSTONE_TITLE_MAPPING);
    const defaultRoleMapping = CAPSTONE_TITLE_MAPPING[defaultProfessionalTitle];

    if (!defaultProfessionalTitle || !defaultRoleMapping) {
      throw new AppError(
        'Unable to initialize bulk archive role mappings.',
        500,
        'BULK_ARCHIVE_MAPPING_MISSING',
      );
    }

    const normalizedTitle = data.title.trim();
    const normalizedKeywords = Array.isArray(data.keywords) ? data.keywords : [];

    let archiveTeam;
    let project;
    const uploadedKeys = [];

    try {
      const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

      // Create an internal placeholder team to satisfy project schema invariants.
      archiveTeam = await Team.create({
        name: `Archive ${Date.now()}`,
        leaderId: instructorObjectId,
        members: [instructorObjectId],
        isLocked: true,
        academicYear: data.academicYear,
      });

      project = await Project.create({
        teamId: archiveTeam._id,
        title: normalizedTitle,
        titleProposals: [
          normalizedTitle,
          normalizedTitle,
          normalizedTitle,
          normalizedTitle,
          normalizedTitle,
        ],
        abstract: data.abstract || '',
        keywords: normalizedKeywords,
        academicYear: data.academicYear,
        courseId: new mongoose.Types.ObjectId(),
        sectionId: new mongoose.Types.ObjectId(),
        memberRoleAssignments: [
          {
            userId: instructorObjectId,
            professionalTitle: defaultProfessionalTitle,
            traditionalRole: defaultRoleMapping.traditionalRole,
            responsibilities: defaultRoleMapping.responsibilities,
          },
        ],
        capstonePhase: 4,
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.ARCHIVED,
        isArchived: true,
        archivedAt: new Date(),
        completionNotes: 'Bulk-uploaded archived capstone bundle.',
      });

      const finalAcademicStorageKey = storageService.buildFinalAcademicKey(
        project._id,
        1,
        academicPaperFile.originalname,
      );
      const finalJournalStorageKey = storageService.buildFinalJournalKey(
        project._id,
        1,
        academicJournalFile.originalname,
      );

      try {
        await storageService.uploadFile(
          academicPaperFile.buffer,
          finalAcademicStorageKey,
          academicPaperFile.validatedMime || academicPaperFile.mimetype,
        );
        uploadedKeys.push(finalAcademicStorageKey);

        await storageService.uploadFile(
          academicJournalFile.buffer,
          finalJournalStorageKey,
          academicJournalFile.validatedMime || academicJournalFile.mimetype,
        );
        uploadedKeys.push(finalJournalStorageKey);
      } catch (error) {
        // Clean up the project record if upload failed
        await Project.findByIdAndDelete(project._id);
        if (error.isOperational) {
          console.error('[ProjectService] Bulk archive upload failed:', error.code, error.message);
          throw error;
        }
        console.error('[ProjectService] Unexpected bulk archive upload error:', error);
        throw new AppError(
          'Failed to upload archive documents. Please try again later.',
          500,
          'BULK_ARCHIVE_UPLOAD_ERROR',
        );
      }

      const [finalAcademicSubmission, finalJournalSubmission] = await Submission.create([
        {
          projectId: project._id,
          submittedBy: instructorObjectId,
          type: 'final_academic',
          chapter: null,
          version: 1,
          fileName: academicPaperFile.originalname,
          fileType: academicPaperFile.validatedMime || academicPaperFile.mimetype,
          fileSize: academicPaperFile.size,
          storageKey: finalAcademicStorageKey,
          status: 'approved',
        },
        {
          projectId: project._id,
          submittedBy: instructorObjectId,
          type: 'final_journal',
          chapter: null,
          version: 1,
          fileName: academicJournalFile.originalname,
          fileType: academicJournalFile.validatedMime || academicJournalFile.mimetype,
          fileSize: academicJournalFile.size,
          storageKey: finalJournalStorageKey,
          status: 'approved',
        },
      ]);

      return {
        project,
        submissions: {
          finalAcademic: finalAcademicSubmission,
          finalJournal: finalJournalSubmission,
        },
      };
    } catch (error) {
      await Promise.all(
        uploadedKeys.map((key) => storageService.deleteFile(key).catch(() => null)),
      );

      if (project?._id) {
        await Submission.deleteMany({ projectId: project._id });
        await Project.deleteOne({ _id: project._id });
      }

      if (archiveTeam?._id) {
        await Team.deleteOne({ _id: archiveTeam._id });
      }

      throw error;
    }
  }

  /* ═══════════════════ Helpers ═══════════════════ */

  /**
   * Fetch a project by ID or throw 404.
   * Used by nearly every public method to avoid repeating the same
   * two-line fetch-and-guard pattern.
   *
   * @param {string} projectId
   * @returns {Promise<Object>} Hydrated project document
   * @private
   */
  async _getProjectOrFail(projectId) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    return project;
  }

  /**
   * Assert that the given userId is the leader of the team.
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {string} userId
   * @private
   */
  async _assertTeamLeader(teamId, userId) {
    const team = await Team.findById(teamId);
    if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    if (team.leaderId.toString() !== userId.toString()) {
      throw new AppError('Only the team leader can perform this action.', 403, 'FORBIDDEN');
    }
  }

  /**
   * Assert that the given userId is a member of the team.
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {string} userId
   * @private
   */
  async _assertTeamMember(teamId, userId) {
    const team = await Team.findById(teamId);
    if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    const isMember = team.members.some((id) => id.toString() === userId.toString());
    if (!isMember) {
      throw new AppError('You are not a member of this project team.', 403, 'FORBIDDEN');
    }
  }

  /**
   * Notify the project's assigned adviser (if one exists).
   * @param {Object} project - Project document (must have adviserId)
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @private
   */
  async _notifyAdviser(project, notif) {
    if (!project.adviserId) return;
    const advNotif = await Notification.create({
      userId: project.adviserId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      metadata: notif.metadata,
    });
    emitToUser(project.adviserId, 'notification:new', advNotif);
  }

  /**
   * Send identical notifications to every member of a team.
   * Optionally exclude a specific user (e.g. the action initiator).
   *
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @param {{ excludeUserId?: string }} [options={}]
   * @private
   */
  async _notifyTeamMembers(teamId, notif, { excludeUserId } = {}) {
    const team = await Team.findById(teamId);
    if (!team) return;

    let recipients = team.members;
    if (excludeUserId) {
      recipients = recipients.filter((id) => id.toString() !== excludeUserId.toString());
    }
    if (recipients.length === 0) return;

    const notifs = await Notification.insertMany(
      recipients.map((memberId) => ({
        userId: memberId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
      })),
    );
    notifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
  }

  /**
   * Notify all active instructors about a project event.
   * Used for title submissions, revisions, and modification requests.
   *
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @private
   */
  async _notifyInstructors(notif) {
    const instructors = await User.find({ role: ROLES.INSTRUCTOR, isActive: true });
    if (instructors.length === 0) return;

    const notifs = await Notification.insertMany(
      instructors.map((instr) => ({
        userId: instr._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
      })),
    );
    notifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
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

    // plagResult.status === COMPLETED — verify score meets threshold
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
}

export default new ProjectService();
