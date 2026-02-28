import Project from './project.model.js';
import Team from '../teams/team.model.js';
import User from '../users/user.model.js';
import Notification from '../notifications/notification.model.js';
import AppError from '../../utils/AppError.js';
import { findSimilarProjects } from '../../utils/titleSimilarity.js';
import { ROLES, TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';

/**
 * ProjectService — Business logic for capstone project management.
 * Handles creation, title workflow, adviser/panelist assignment, and status transitions.
 */
class ProjectService {
  /* ═══════════════════ Creation ═══════════════════ */

  /**
   * Create a new project for the authenticated student's team.
   * The student must be a team leader with a locked team and no existing project.
   * Also runs a similarity check against existing titles and returns warnings.
   * @param {string} userId - The requesting student (team leader).
   * @param {Object} data - { title, abstract?, keywords?, academicYear }
   * @returns {Object} { project, similarProjects }
   */
  async createProject(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can create projects.', 403, 'FORBIDDEN');
    }
    if (!user.teamId) {
      throw new AppError('You must be in a team before creating a project.', 400, 'NO_TEAM');
    }

    const team = await Team.findById(user.teamId);
    if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');

    if (team.leaderId.toString() !== userId.toString()) {
      throw new AppError('Only the team leader can create a project.', 403, 'FORBIDDEN');
    }
    if (!team.isLocked) {
      throw new AppError(
        'Your team must be locked before creating a project.',
        400,
        'TEAM_NOT_LOCKED',
      );
    }

    // Prevent duplicate projects per team
    const existingProject = await Project.findOne({ teamId: team._id });
    if (existingProject) {
      throw new AppError(
        'Your team already has a project. Only one project per team is allowed.',
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
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      academicYear: data.academicYear,
    });

    // Notify team members
    const otherMembers = team.members.filter((id) => id.toString() !== userId.toString());
    if (otherMembers.length > 0) {
      await Notification.insertMany(
        otherMembers.map((memberId) => ({
          userId: memberId,
          type: 'system',
          title: 'Project Created',
          message: `A new project "${project.title}" has been created for your team.`,
          metadata: { projectId: project._id },
        })),
      );
    }

    return { project, similarProjects };
  }

  /* ═══════════════════ Read ═══════════════════ */

  /**
   * Get a single project by ID with populated references.
   * @param {string} projectId
   * @returns {Object} { project }
   */
  async getProject(projectId) {
    const project = await Project.findById(projectId)
      .populate('teamId', 'name leaderId members academicYear')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
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

    const project = await Project.findOne({ teamId: user.teamId })
      .populate('teamId', 'name leaderId members academicYear')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

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
        .populate('teamId', 'name leaderId members')
        .populate('adviserId', 'firstName middleName lastName email')
        .populate('panelistIds', 'firstName middleName lastName email'),
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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const instructors = await User.find({ role: ROLES.INSTRUCTOR, isActive: true });
    if (instructors.length > 0) {
      await Notification.insertMany(
        instructors.map((instr) => ({
          userId: instr._id,
          type: 'title_submitted',
          title: 'New Title Submission',
          message: `A project title "${project.title}" has been submitted for approval.`,
          metadata: { projectId: project._id },
        })),
      );
    }

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    if (project.titleStatus !== TITLE_STATUSES.SUBMITTED) {
      throw new AppError(
        'Only submitted titles can be approved.',
        400,
        'INVALID_STATUS_TRANSITION',
      );
    }

    project.titleStatus = TITLE_STATUSES.APPROVED;
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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const instructors = await User.find({ role: ROLES.INSTRUCTOR, isActive: true });
    if (instructors.length > 0) {
      await Notification.insertMany(
        instructors.map((instr) => ({
          userId: instr._id,
          type: 'title_submitted',
          title: 'Revised Title Submission',
          message: `A revised project title "${project.title}" has been resubmitted for approval.`,
          metadata: { projectId: project._id },
        })),
      );
    }

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const instructors = await User.find({ role: ROLES.INSTRUCTOR, isActive: true });
    if (instructors.length > 0) {
      await Notification.insertMany(
        instructors.map((instr) => ({
          userId: instr._id,
          type: 'title_modification_requested',
          title: 'Title Modification Request',
          message: `Team requests to change title from "${project.title}" to "${data.proposedTitle}".`,
          metadata: { projectId: project._id },
        })),
      );
    }

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const adviser = await User.findById(data.adviserId);
    if (!adviser || adviser.role !== ROLES.ADVISER) {
      throw new AppError('The specified user is not a valid adviser.', 400, 'INVALID_ADVISER');
    }

    project.adviserId = data.adviserId;
    await project.save();

    // Notify the adviser
    await Notification.create({
      userId: data.adviserId,
      type: 'adviser_assigned',
      title: 'Adviser Assignment',
      message: `You have been assigned as adviser for the project "${project.title}".`,
      metadata: { projectId: project._id, assignedBy: instructorId },
    });

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    await Notification.create({
      userId: data.panelistId,
      type: 'panelist_assigned',
      title: 'Panelist Assignment',
      message: `You have been assigned as a panelist for the project "${project.title}".`,
      metadata: { projectId: project._id, assignedBy: instructorId },
    });

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
   * @returns {Object} { project }
   */
  async setDeadlines(projectId, data) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    if (data.chapter1 !== undefined) project.deadlines.chapter1 = data.chapter1;
    if (data.chapter2 !== undefined) project.deadlines.chapter2 = data.chapter2;
    if (data.chapter3 !== undefined) project.deadlines.chapter3 = data.chapter3;
    if (data.proposal !== undefined) project.deadlines.proposal = data.proposal;
    await project.save();

    await this._notifyTeamMembers(project.teamId, {
      type: 'system',
      title: 'Deadlines Updated',
      message: 'Your project deadlines have been updated. Please check the new schedule.',
      metadata: { projectId: project._id },
    });

    return { project };
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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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

  /* ═══════════════════ Helpers ═══════════════════ */

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
   * Send identical notifications to every member of a team.
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @private
   */
  async _notifyTeamMembers(teamId, notif) {
    const team = await Team.findById(teamId);
    if (!team) return;
    await Notification.insertMany(
      team.members.map((memberId) => ({
        userId: memberId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
      })),
    );
  }
}

export default new ProjectService();
