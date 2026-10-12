import Project from '../project.model.js';
import Team from '../../teams/team.model.js';
import User from '../../users/user.model.js';
import Section from '../../academics/section.model.js';
import Notification from '../../notifications/notification.model.js';
import Submission from '../../submissions/submission.model.js';
import Evaluation from '../../evaluations/evaluation.model.js';
import AppError from '../../../utils/AppError.js';
import { findSimilarProjects } from '../../../utils/titleSimilarity.js';
import storageService from '../../../services/storage.index.js';
import cacheService from '../../../services/cache.service.js';
import { emitToUser } from '../../../services/socket.service.js';
import {
  ROLES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  CAPSTONE_PHASES,
  PROTOTYPE_TYPES,
  CAPSTONE_TITLE_MAPPING,
  SDG_TAG_SUGGESTIONS,
} from '@cms/shared';

function normalizeAcademicYearValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u2012\u2013\u2014\u2015]/g, '-');
}

class ProjectCoreService {
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

  async getCreateProjectDraft(userId) {
    const user = await User.findById(userId).select(
      '+createProjectDraft +createProjectDraftUpdatedAt',
    );
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    return {
      draft: user.createProjectDraft || null,
      updatedAt: user.createProjectDraftUpdatedAt || null,
    };
  }

  async saveCreateProjectDraft(userId, draft) {
    const user = await User.findById(userId).select(
      '+createProjectDraft +createProjectDraftUpdatedAt',
    );
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    // Prevent clobbering existing substantive draft if incoming autosave is completely blank/unhydrated
    const hasIncomingContent =
      Boolean(draft) &&
      (Array.isArray(draft.titleProposals)
        ? draft.titleProposals.some(
            (p) =>
              p?.title?.trim() ||
              p?.pitchDeck?.problemStatement?.trim() ||
              p?.pitchDeck?.proposedSolution?.trim(),
          )
        : false);

    const hasExistingContent =
      Boolean(user.createProjectDraft) &&
      (Array.isArray(user.createProjectDraft.titleProposals)
        ? user.createProjectDraft.titleProposals.some(
            (p) =>
              p?.title?.trim() ||
              p?.pitchDeck?.problemStatement?.trim() ||
              p?.pitchDeck?.proposedSolution?.trim(),
          )
        : false);

    if (!hasIncomingContent && hasExistingContent) {
      // Retain existing saved draft rather than overwriting with empty initial state
      return {
        draft: user.createProjectDraft,
        updatedAt: user.createProjectDraftUpdatedAt,
      };
    }

    user.createProjectDraft = draft;
    user.createProjectDraftUpdatedAt = draft ? new Date() : null;
    user.markModified('createProjectDraft');
    await user.save();

    return {
      draft: user.createProjectDraft || null,
      updatedAt: user.createProjectDraftUpdatedAt || null,
    };
  }

  async clearCreateProjectDraft(userId) {
    const user = await User.findById(userId).select(
      '+createProjectDraft +createProjectDraftUpdatedAt',
    );
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    user.createProjectDraft = null;
    user.createProjectDraftUpdatedAt = null;
    user.markModified('createProjectDraft');
    await user.save();

    return { draft: null, updatedAt: null };
  }

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

    let team = null;
    if (user.teamId) {
      team = await Team.findById(user.teamId).select(
        'leaderId members isLocked sectionId academicYear courseId adviserId secretaryId panelistIds',
      );
    }

    const payloadAcademicYear = normalizeAcademicYearValue(data.academicYear);
    const teamAcademicYear = normalizeAcademicYearValue(team?.academicYear);
    let effectiveAcademicYear = teamAcademicYear || payloadAcademicYear;

    // Resolve section ID: canonical team > explicit payload > user profile
    let effectiveSectionId = data.sectionId;
    if (team?.sectionId) {
      effectiveSectionId = team.sectionId;
    } else if (!effectiveSectionId && user.sectionId) {
      // Fall back to user section if available
      effectiveSectionId = user.sectionId;
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

    const sectionAcademicYear = normalizeAcademicYearValue(section.academicYear);

    if (!effectiveAcademicYear && sectionAcademicYear) {
      effectiveAcademicYear = sectionAcademicYear;
    }

    if (!effectiveAcademicYear) {
      throw new AppError('Academic year is required.', 400, 'ACADEMIC_YEAR_REQUIRED');
    }

    const hasCanonicalTeamSection = Boolean(team?.sectionId);

    if (
      !hasCanonicalTeamSection &&
      sectionAcademicYear &&
      sectionAcademicYear !== effectiveAcademicYear
    ) {
      throw new AppError(
        'Selected section does not belong to the selected academic year.',
        400,
        'SECTION_YEAR_MISMATCH',
      );
    }

    if (sectionAcademicYear) {
      effectiveAcademicYear = sectionAcademicYear;
    }

    if (!user.teamId) {
      if (!data.allowSoloCapstone || !data.soloCapstoneConfirmed) {
        throw new AppError(
          'You must have an active team, or explicitly confirm solo capstone mode to continue.',
          400,
          'NO_TEAM',
        );
      }

      team = await this._createSoloTeamForStudent(user, effectiveAcademicYear);
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

    if (normalizedTitleProposals.length < 1) {
      throw new AppError(
        'At least 1 unique title proposal is required.',
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

    const requestedRoleAssignments = Array.isArray(data.memberRoleAssignments)
      ? data.memberRoleAssignments
      : [];

    if (requestedRoleAssignments.length > 0) {
      const teamMemberIds = team.members.map((memberId) => memberId.toString()).sort();
      const assignedMemberIds = requestedRoleAssignments
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

      const professionalTitles = requestedRoleAssignments.map(
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
    }

    const memberRoleAssignments = requestedRoleAssignments.map((assignment) => {
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
      const isPendingReview = existingProject.titleStatus === TITLE_STATUSES.SUBMITTED;
      const isDraft = existingProject.titleStatus === TITLE_STATUSES.DRAFT;
      const isRevisionRequired = existingProject.titleStatus === TITLE_STATUSES.REVISION_REQUIRED;
      const proposalCount = Array.isArray(existingProject.titleProposals)
        ? existingProject.titleProposals.length
        : 0;

      let errorMessage;
      if (isPendingReview) {
        errorMessage = `Your team already has ${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} pending instructor review. You cannot submit another set of proposals until the current ones are reviewed. Please wait for the instructor's decision.`;
      } else if (isDraft) {
        errorMessage =
          'Your team already has a project in draft status. Please go to My Capstone to edit and submit your existing proposals instead of creating a new project.';
      } else if (isRevisionRequired) {
        errorMessage =
          'Your team has proposals that require revision. Please go to My Capstone to address the instructor feedback and resubmit instead of creating a new project.';
      } else {
        errorMessage =
          'Your team already has an active project. Only one active project per team is allowed.';
      }

      throw new AppError(errorMessage, 409, 'PROJECT_EXISTS');
    }

    // Similarity check against all non-rejected projects
    const allProjects = await Project.find({
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    }).select(
      'title abstract keywords academicYear targetBeneficiary techStack titleProposalMetadata capstoneType',
    );

    const similarProjects = findSimilarProjects(
      { title: data.title, keywords: data.keywords || [] },
      allProjects,
    );

    const hasConflict = similarProjects.some((p) => {
      const score = p.similarityScore ?? Math.round((p.score || 0) * 100);
      return score >= 30;
    });
    const isFlagged = Boolean(data.isFlagged || hasConflict);
    const topScore =
      Number(data.similarityScore) ||
      (similarProjects[0]?.similarityScore ?? Math.round((similarProjects[0]?.score || 0) * 100)) ||
      0;
    const flagReason =
      data.flagReason ||
      (isFlagged && similarProjects[0]
        ? `Similar title detected (${topScore}%) against "${similarProjects[0].title}". Flagged for committee review.`
        : null);

    const project = await Project.create({
      teamId: team._id,
      title: data.title,
      titleProposals: proposalTitles,
      titleProposalMetadata: normalizedTitleProposals,
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      sdgTags: normalizedSdgTags,
      academicYear: effectiveAcademicYear,
      courseId: section.courseId._id,
      sectionId: section._id,
      memberRoleAssignments,
      adviserId: team.adviserId || undefined,
      secretaryId: team.secretaryId || undefined,
      panelistIds: team.panelistIds || [],
      isFlagged,
      flagReason,
      similarityScore: topScore,
      panelists:
        Array.isArray(team.panelistIds) && team.panelistIds.length > 0
          ? team.panelistIds.map((pId, idx) => ({
              userId: pId,
              role: idx === 0 ? 'chair' : 'member',
            }))
          : [],
    });

    team.courseId = section.courseId._id;
    team.sectionId = section._id;
    team.academicYear = section.academicYear;
    await team.save();

    if (!user.teamId || user.teamId.toString() !== team._id.toString()) {
      user.teamId = team._id;
      await user.save({ validateBeforeSave: false });
    }

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
   * Defensive normalization: Capstone 2 is not complete unless ADM is fully approved.
   * If a project record carries capstonePhase >= 3 without ADM approval, normalize to Phase 2.
   */
  _normalizeProjectADMPhase(project) {
    if (!project) return project;
    const isSecretaryDone = Boolean(project.admSignatures?.secretary?.endorsed);
    const isAdviserDone = Boolean(project.admSignatures?.adviser?.signed);
    const isChairDone = Boolean(project.admSignatures?.chair?.signed);
    const isADMApproved =
      project.admStatus === 'approved' || (isSecretaryDone && isAdviserDone && isChairDone);

    if (
      Number(project.capstonePhase) >= 3 &&
      !isADMApproved &&
      !project.isArchived &&
      project.projectStatus !== 'archived' &&
      project.projectStatus !== PROJECT_STATUSES.ARCHIVED &&
      project.projectStatus !== PROJECT_STATUSES.DEFENDED
    ) {
      project.capstonePhase = 2;
      if (project.capstoneCourse === 'Capstone 3') {
        project.capstoneCourse = 'Capstone 2';
      }
    }
    return project;
  }

  /**
   * Get a single project by ID with populated references.
   * @param {string} projectId
   * @param {Object} requester - Authenticated user context
   * @returns {Object} { project }
   */
  async getProject(projectId, requester) {
    const cacheKey = `project:meta:${projectId}`;
    const cachedPayload = await cacheService.get(cacheKey);

    if (cachedPayload) {
      const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.FACULTY].includes(
        requester?.role,
      );
      if (!isFaculty) {
        if (requester?.role !== ROLES.STUDENT) {
          throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
        }

        const isTeamMember = cachedPayload.teamId?.members?.some(
          (member) => (member?._id || member).toString() === requester._id.toString(),
        );

        const isArchived =
          cachedPayload.isArchived === true || cachedPayload.projectStatus === 'archived';

        if (!isTeamMember && !isArchived) {
          throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
        }
      }
      return { project: cachedPayload };
    }

    const project = await Project.findById(projectId)
      .select('-textSidecar -rawExtractedData')
      .populate({
        path: 'teamId',
        select:
          'name leaderId members memberRoles academicYear courseId sectionId adviserId secretaryId panelistIds googleDocUrl githubUrl',
        populate: [
          {
            path: 'leaderId',
            select: 'firstName middleName lastName email instructorId',
            populate: {
              path: 'instructorId',
              select: 'firstName middleName lastName email profilePicture',
            },
          },
          {
            path: 'members',
            select:
              'firstName middleName lastName email profilePicture role proponentRole capstoneRole',
          },
          {
            path: 'memberRoles.userId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'adviserId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'secretaryId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'panelistIds',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'sectionId',
            select: 'name academicYear courseId createdBy',
            populate: {
              path: 'createdBy',
              select: 'firstName middleName lastName email profilePicture',
            },
          },
        ],
      })
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('secretaryId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture')
      .populate('panelists.userId', 'firstName middleName lastName email profilePicture')
      .populate('courseId', 'name code')
      .populate({
        path: 'sectionId',
        select: 'name academicYear courseId createdBy',
        populate: [
          { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
        ],
      })
      .populate('memberRoleAssignments.userId', 'firstName middleName lastName email')
      .lean();

    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    const isFaculty = [ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.FACULTY].includes(
      requester?.role,
    );
    if (!isFaculty) {
      if (requester?.role !== ROLES.STUDENT) {
        throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
      }

      const isTeamMember = project.teamId?.members?.some(
        (member) => (member?._id || member).toString() === requester._id.toString(),
      );

      const isArchived = project.isArchived === true || project.projectStatus === 'archived';

      if (!isTeamMember && !isArchived) {
        throw new AppError('You do not have permission to view this project.', 403, 'FORBIDDEN');
      }
    }

    this._normalizeProjectADMPhase(project);

    // Query archive submissions to determine academic paper and journal availability
    const archivedSubmissions = await Submission.find({
      projectId: project._id,
      storageKey: { $exists: true, $ne: null },
    })
      .select('_id type fileName fileType fileSize version status createdAt plagiarismResult')
      .lean();

    const hasAcademicPaper = archivedSubmissions.some(
      (s) =>
        ['final_academic', 'final_paper', 'proposal', 'progress', 'final'].includes(s.type) ||
        (s.chapter !== null && s.chapter !== undefined),
    );
    const hasJournalPaper = archivedSubmissions.some((s) => s.type === 'final_journal');

    const projectPayload = project.toObject ? project.toObject() : { ...project };
    const isArchived = project.isArchived === true || project.projectStatus === 'archived';
    let resolvedOriginality = projectPayload.originalityScore;
    if (isArchived && !Number.isFinite(resolvedOriginality)) {
      const audit = projectPayload.archiveMetadata?.similarityAudit;
      const allConflicts = [
        ...(Array.isArray(audit?.titleConflicts) ? audit.titleConflicts : []),
        ...(Array.isArray(audit?.abstractConflicts) ? audit.abstractConflicts : []),
      ];
      if (allConflicts.length > 0) {
        const topSimilarity = Math.max(
          ...allConflicts.map(
            (c) =>
              Number(c?.similarityScore ?? c?.similarityPct ?? (c?.score ? c.score * 100 : 0)) || 0,
          ),
        );
        resolvedOriginality = Math.max(10, Math.min(100, Math.round(100 - topSimilarity)));
      } else {
        resolvedOriginality = 100;
      }
    }
    projectPayload.originalityScore = resolvedOriginality ?? 100;
    projectPayload.similarityScore = Number.isFinite(resolvedOriginality)
      ? Math.max(0, Math.min(100, Math.round((100 - resolvedOriginality) * 10) / 10))
      : 0;

    projectPayload.hasAcademicPaper = hasAcademicPaper;
    projectPayload.hasJournalPaper = hasJournalPaper;
    projectPayload.hasManuscript = Boolean(hasAcademicPaper || hasJournalPaper);
    projectPayload.archivedSubmissions = {
      hasAcademicPaper,
      hasJournalPaper,
      submissions: archivedSubmissions,
    };

    try {
      const pDoc = new Project(project);
      projectPayload.unisonADM = pDoc.getUnisonADM();
    } catch {
      // Non-blocking
    }

    // Cache metadata for 120 seconds
    await cacheService.set(cacheKey, projectPayload, 120);

    return { project: projectPayload };
  }

  /**
   * Get the project belonging to the authenticated student's team.
   * @param {string} userId
   * @returns {Object} { project }
   */
  async getMyProject(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    let effectiveTeamId = user.teamId;
    if (!effectiveTeamId) {
      // Reconcile missing or unlinked teamId by checking actual team membership records
      const membershipTeam = await Team.findOne({ members: user._id });
      if (membershipTeam) {
        effectiveTeamId = membershipTeam._id;
        user.teamId = membershipTeam._id;
        await user.save({ validateBeforeSave: false });
      }
    }

    if (!effectiveTeamId) {
      throw new AppError('You are not in a team or have no project.', 404, 'NO_TEAM');
    }

    const populateOpts = [
      {
        path: 'teamId',
        select:
          'name leaderId members memberRoles academicYear courseId sectionId adviserId secretaryId panelistIds googleDocUrl githubUrl',
        populate: [
          {
            path: 'leaderId',
            select: 'firstName middleName lastName email instructorId',
            populate: {
              path: 'instructorId',
              select: 'firstName middleName lastName email profilePicture',
            },
          },
          {
            path: 'members',
            select:
              'firstName middleName lastName email profilePicture role proponentRole capstoneRole',
          },
          {
            path: 'memberRoles.userId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'adviserId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'secretaryId',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'panelistIds',
            select: 'firstName middleName lastName email profilePicture',
          },
          {
            path: 'sectionId',
            select: 'name academicYear courseId createdBy',
            populate: {
              path: 'createdBy',
              select: 'firstName middleName lastName email profilePicture',
            },
          },
        ],
      },
      { path: 'adviserId', select: 'firstName middleName lastName email profilePicture' },
      { path: 'secretaryId', select: 'firstName middleName lastName email profilePicture' },
      { path: 'panelistIds', select: 'firstName middleName lastName email profilePicture' },
      { path: 'panelists.userId', select: 'firstName middleName lastName email profilePicture' },
      {
        path: 'sectionId',
        select: 'name academicYear courseId createdBy',
        populate: [
          { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
        ],
      },
      { path: 'courseId', select: 'name code' },
      {
        path: 'memberRoleAssignments.userId',
        select: 'firstName middleName lastName email',
      },
    ];

    // Prefer the active (non-rejected) project; fall back to most-recent rejected
    let project = await Project.findOne({
      teamId: effectiveTeamId,
      projectStatus: { $ne: PROJECT_STATUSES.REJECTED },
    })
      .select('-textSidecar -rawExtractedData')
      .populate(populateOpts)
      .lean();

    if (!project) {
      project = await Project.findOne({ teamId: effectiveTeamId })
        .select('-textSidecar -rawExtractedData')
        .sort({ createdAt: -1 })
        .populate(populateOpts)
        .lean();
    }

    if (!project) {
      throw new AppError('Your team does not have a project yet.', 404, 'PROJECT_NOT_FOUND');
    }

    this._normalizeProjectADMPhase(project);
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
      capstonePhase,
      actionNeeded,
      search,
      adviserId,
      panelistId,
      secretaryId,
      excludeArchived,
      defenseStatus,
    } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (titleStatus) {
      filter.titleStatus = titleStatus;
    } else if (actionNeeded === 'true' || actionNeeded === true) {
      filter.titleStatus = { $in: ['submitted', 'revision_required', 'pending_modification'] };
    }
    if (projectStatus) filter.projectStatus = projectStatus;
    if (capstonePhase) {
      const phaseNum = Number(capstonePhase);
      if (phaseNum >= 3) {
        filter.capstonePhase = { $in: [3, 4] };
      } else {
        filter.capstonePhase = phaseNum;
      }
    }
    if (adviserId) filter.adviserId = adviserId;
    if (panelistId) filter.panelistIds = panelistId;

    if (defenseStatus) {
      if (defenseStatus === 'none' || defenseStatus === 'unscheduled') {
        filter.$or = [
          { 'defenseSchedule.status': { $exists: false } },
          { 'defenseSchedule.status': null },
          { 'defenseSchedule.status': '' },
        ];
      } else {
        filter['defenseSchedule.status'] = defenseStatus;
      }
    }

    if (excludeArchived === 'true' || excludeArchived === true) {
      filter.isArchived = { $ne: true };
      if (!filter.projectStatus) {
        filter.projectStatus = { $ne: PROJECT_STATUSES.ARCHIVED };
      }
    }

    const andClauses = [];
    if (secretaryId) {
      andClauses.push({
        $or: [{ secretaryId }, { 'panelists.userId': secretaryId, 'panelists.role': 'secretary' }],
      });
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      andClauses.push({
        $or: [{ title: regex }, { abstract: regex }, { keywords: regex }],
      });
    }

    if (andClauses.length === 1) {
      Object.assign(filter, andClauses[0]);
    } else if (andClauses.length > 1) {
      filter.$and = andClauses;
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .select('-textSidecar -rawExtractedData')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'teamId',
          select:
            'name leaderId members memberRoles academicYear courseId sectionId adviserId secretaryId panelistIds googleDocUrl githubUrl',
          populate: [
            {
              path: 'leaderId',
              select: 'firstName middleName lastName email instructorId',
              populate: {
                path: 'instructorId',
                select: 'firstName middleName lastName email profilePicture',
              },
            },
            {
              path: 'members',
              select:
                'firstName middleName lastName email profilePicture role proponentRole capstoneRole',
            },
            {
              path: 'memberRoles.userId',
              select: 'firstName middleName lastName email profilePicture',
            },
            {
              path: 'adviserId',
              select: 'firstName middleName lastName email profilePicture',
            },
            {
              path: 'secretaryId',
              select: 'firstName middleName lastName email profilePicture',
            },
            {
              path: 'panelistIds',
              select: 'firstName middleName lastName email profilePicture',
            },
          ],
        })
        .populate('adviserId', 'firstName middleName lastName email profilePicture')
        .populate('secretaryId', 'firstName middleName lastName email profilePicture')
        .populate('panelistIds', 'firstName middleName lastName email profilePicture')
        .populate('panelists.userId', 'firstName middleName lastName email profilePicture')
        .populate({
          path: 'sectionId',
          select: 'name academicYear courseId createdBy',
          populate: [
            { path: 'createdBy', select: 'firstName middleName lastName email profilePicture' },
          ],
        })
        .populate('courseId', 'name code')
        .populate('memberRoleAssignments.userId', 'firstName middleName lastName email')
        .lean(),
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

  /**
   * Update the Gantt chart URL for a project.
   * Only a team member can perform this action.
   * @param {string} projectId
   * @param {string} userId - Requesting student (must be team member).
   * @param {Object} data - { ganttChartUrl }
   * @returns {Object} { project }
   */
  async updateGanttChartUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);
    await this._assertTeamMember(project.teamId, userId);

    if (data.ganttChartUrl !== undefined) {
      project.ganttChartUrl = data.ganttChartUrl;
      await project.save();
    }

    return { project };
  }

  /**
   * Update the Demo Video URL (Google Drive link) for a project.
   * Only a team member can perform this action.
   * @param {string} projectId
   * @param {string} userId - Requesting student (must be team member).
   * @param {Object} data - { demoVideoUrl }
   * @returns {Object} { project }
   */
  async updateDemoVideoUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);
    await this._assertTeamMember(project.teamId, userId);

    if (data.demoVideoUrl !== undefined) {
      project.demoVideoUrl = data.demoVideoUrl;
      await project.save();
    }

    return { project };
  }

  /**
   * Update the GitHub repository URL for a project.
   * Can be updated by team members, adviser, or instructor.
   * @param {string} projectId
   * @param {string} userId
   * @param {Object} data - { githubRepoUrl }
   * @returns {Object} { project }
   */
  async updateGithubRepoUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);

    const team = await Team.findById(project.teamId);
    const isMember = team?.members?.some((id) => id.toString() === userId.toString());
    const isAdviser = project.adviserId && project.adviserId.toString() === userId.toString();
    const user = await User.findById(userId).select('role');
    const isInstructor = user?.role === ROLES.INSTRUCTOR;

    if (!isMember && !isAdviser && !isInstructor) {
      throw new AppError(
        'You do not have permission to update the project GitHub repository.',
        403,
        'FORBIDDEN',
      );
    }

    if (data.githubRepoUrl !== undefined) {
      project.githubRepoUrl = data.githubRepoUrl;
      await project.save();

      // Mirror to team if applicable
      if (team && (!team.githubUrl || team.githubUrl !== data.githubRepoUrl)) {
        team.githubUrl = data.githubRepoUrl;
        await team.save();
      }
    }

    return { project };
  }

  /**
   * Update the Google Doc manuscript URL for a project.
   * Can be updated by team members, assigned adviser, or instructor.
   * @param {string} projectId
   * @param {string} userId
   * @param {Object} data - { googleDocUrl }
   * @returns {Object} { project }
   */
  async updateGoogleDocUrl(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);

    const team = await Team.findById(project.teamId);
    const isMember = team?.members?.some((id) => id.toString() === userId.toString());
    const isAdviser = project.adviserId && project.adviserId.toString() === userId.toString();
    const user = await User.findById(userId).select('role');
    const isInstructor = user?.role === ROLES.INSTRUCTOR;

    if (!isMember && !isAdviser && !isInstructor) {
      throw new AppError(
        'You do not have permission to update the project Google Doc manuscript link.',
        403,
        'FORBIDDEN',
      );
    }

    if (data.googleDocUrl !== undefined) {
      project.googleDocUrl = data.googleDocUrl;
      await project.save();

      // Mirror to team if applicable
      if (team && (!team.googleDocUrl || team.googleDocUrl !== data.googleDocUrl)) {
        team.googleDocUrl = data.googleDocUrl;
        await team.save();
      }
    }

    return { project };
  }

  /**
   * Update external links (Google Doc and/or GitHub Repo) simultaneously.
   * @param {string} projectId
   * @param {string} userId
   * @param {Object} data - { googleDocUrl, githubRepoUrl }
   * @returns {Object} { project }
   */
  async updateExternalLinks(projectId, userId, data) {
    const project = await this._getProjectOrFail(projectId);

    const team = await Team.findById(project.teamId);
    const isMember = team?.members?.some((id) => id.toString() === userId.toString());
    const isAdviser = project.adviserId && project.adviserId.toString() === userId.toString();
    const user = await User.findById(userId).select('role');
    const isInstructor = user?.role === ROLES.INSTRUCTOR;

    if (!isMember && !isAdviser && !isInstructor) {
      throw new AppError(
        'You do not have permission to update the project external links.',
        403,
        'FORBIDDEN',
      );
    }

    let modified = false;
    let teamModified = false;

    if (data.googleDocUrl !== undefined) {
      project.googleDocUrl = data.googleDocUrl;
      modified = true;
      if (team && team.googleDocUrl !== data.googleDocUrl) {
        team.googleDocUrl = data.googleDocUrl;
        teamModified = true;
      }
    }

    if (data.githubRepoUrl !== undefined) {
      project.githubRepoUrl = data.githubRepoUrl;
      modified = true;
      if (team && team.githubUrl !== data.githubRepoUrl) {
        team.githubUrl = data.githubRepoUrl;
        teamModified = true;
      }
    }

    if (modified) await project.save();
    if (teamModified && team) await team.save();

    return { project };
  }

  /**
   * Approve or reject the Gantt chart schedule for Capstone 2.
   * Only assigned adviser or instructor can review and approve.
   * @param {string} projectId
   * @param {string} reviewerId - Adviser or Instructor ID
   * @param {Object} data - { approved: boolean, remarks: string }
   * @returns {Object} { project }
   */
  async updateGanttApproval(projectId, reviewerId, data) {
    const project = await this._getProjectOrFail(projectId);

    const isAdviser = project.adviserId && project.adviserId.toString() === reviewerId.toString();
    const user = await User.findById(reviewerId).select('role firstName lastName');
    const isInstructor = user?.role === ROLES.INSTRUCTOR;

    if (!isAdviser && !isInstructor) {
      throw new AppError(
        'Only the assigned project adviser or course instructor can review and approve the Gantt chart schedule.',
        403,
        'NOT_ASSIGNED_ADVISER',
      );
    }

    const isApproved = Boolean(data.approved);
    project.ganttApproval = {
      approved: isApproved,
      approvedBy: reviewerId,
      approvedAt: new Date(),
      remarks: typeof data.remarks === 'string' ? data.remarks.trim() : '',
    };

    await project.save();

    // Broadcast realtime event
    try {
      const { emitToProject } = await import('../../services/socket.service.js');
      emitToProject(projectId, 'project:gantt_approval_updated', {
        projectId,
        ganttApproval: project.ganttApproval,
      });
    } catch {
      // Non-fatal
    }

    return { project };
  }

  /* ═══════════════════ Title workflow ═══════════════════ */

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
      [ROLES.ADVISER, ROLES.FACULTY].includes(requester?.role) &&
      (!project.adviserId ||
        String(project.adviserId?._id || project.adviserId) !== String(requesterId))
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
      if (!targetProject.deadlines) targetProject.deadlines = {};
      if (!Array.isArray(targetProject.deadlines.removed)) targetProject.deadlines.removed = [];
      if (!targetProject.deadlines.moved || typeof targetProject.deadlines.moved !== 'object') {
        targetProject.deadlines.moved = {};
      }

      dateFields.forEach((key) => {
        if (data[key] !== undefined) {
          const oldVal = targetProject.deadlines[key];
          const newVal = data[key];

          if (newVal === null || newVal === '' || newVal === 'unscheduled') {
            targetProject.deadlines[key] = null;
            if (!targetProject.deadlines.removed.includes(key)) {
              targetProject.deadlines.removed.push(key);
            }
            if (targetProject.deadlines.moved?.[key]) {
              delete targetProject.deadlines.moved[key];
            }
          } else {
            const newDate = new Date(newVal);
            if (!isNaN(newDate.getTime())) {
              if (oldVal && new Date(oldVal).getTime() !== newDate.getTime()) {
                targetProject.deadlines.moved[key] = {
                  oldDate: oldVal,
                  newDate,
                  movedAt: new Date(),
                };
              }
              targetProject.deadlines[key] = newDate;
              targetProject.deadlines.removed = targetProject.deadlines.removed.filter(
                (r) => r !== key,
              );
            }
          }
        }
      });

      if (Array.isArray(data.removed)) {
        data.removed.forEach((key) => {
          if (dateFields.includes(key)) {
            targetProject.deadlines[key] = null;
            if (!targetProject.deadlines.removed.includes(key)) {
              targetProject.deadlines.removed.push(key);
            }
            if (targetProject.deadlines.moved?.[key]) {
              delete targetProject.deadlines.moved[key];
            }
          }
        });
      }

      if (data.defense === null || data.defense === '') {
        if (targetProject.defenseSchedule) {
          targetProject.defenseSchedule.date = null;
          if (targetProject.defenseSchedule.status === 'scheduled') {
            targetProject.defenseSchedule.status = 'unscheduled';
          }
        }
      }

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
   * - 1 → 2: Requires chapter 1 upload OR proposal-approved status
   * - 2 → 3: Requires at least one RELEASED midterm evaluation (Capstone 2 approved)
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

    if (capstonePhase >= 3 || capstonePhase >= CAPSTONE_PHASES.PHASE_3) {
      throw new AppError(
        'This project is already at the final capstone phase.',
        400,
        'ALREADY_FINAL_PHASE',
      );
    }

    // Phase 1 → 2: Requires chapter 1 upload evidence OR proposal-approved status.
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

    // Phase 2 → 3: Requires the Action Done Matrix (ADM) to be approved,
    // the progress/midterm evaluation to have been released AND project asset URLs
    // (Gantt Chart, Demo Video) to be provided.
    // This ensures Capstone 2 (system development & progress defense) is formally completed before
    // students can proceed to chapters 4-5 and final defense (Capstone 3).
    if (capstonePhase === CAPSTONE_PHASES.PHASE_2) {
      const isSecretaryDone = Boolean(project.admSignatures?.secretary?.endorsed);
      const isAdviserDone = Boolean(project.admSignatures?.adviser?.signed);
      const isChairDone = Boolean(project.admSignatures?.chair?.signed);
      const isADMApproved =
        project.admStatus === 'approved' || (isSecretaryDone && isAdviserDone && isChairDone);

      if (!isADMApproved) {
        throw new AppError(
          'Action Done Matrix (ADM) must be fully endorsed and approved before advancing to Capstone 3.',
          400,
          'ADM_NOT_APPROVED',
        );
      }

      const hasReleasedMidterm = await Evaluation.exists({
        projectId: project._id,
        defenseType: { $in: ['progress', 'midterm'] },
        status: 'released',
      });

      if (!hasReleasedMidterm) {
        throw new AppError(
          'Capstone 2 progress defense evaluation must be released before advancing to Capstone 3.',
          400,
          'MIDTERM_EVALUATION_REQUIRED_FOR_PHASE_ADVANCE',
        );
      }

      if (!project.ganttChartUrl || !project.demoVideoUrl) {
        throw new AppError(
          'Gantt Chart and Project Demo Video URLs must be provided before advancing to Capstone 3.',
          400,
          'ASSET_URLS_REQUIRED',
        );
      }
    }

    const previousPhase = project.capstonePhase;
    project.capstonePhase = Math.min(3, capstonePhase + 1);
    project.capstoneCourse = `Capstone ${project.capstonePhase}`;
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
}

export default new ProjectCoreService();
