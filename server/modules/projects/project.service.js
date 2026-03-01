import mongoose from 'mongoose';
import Project from './project.model.js';
import Team from '../teams/team.model.js';
import User from '../users/user.model.js';
import Notification from '../notifications/notification.model.js';
import Submission from '../submissions/submission.model.js';
import AppError from '../../utils/AppError.js';
import { findSimilarProjects } from '../../utils/titleSimilarity.js';
import storageService from '../../services/storage.service.js';
import { emitToUser } from '../../services/socket.service.js';
import { ROLES, TITLE_STATUSES, PROJECT_STATUSES, CAPSTONE_PHASES, PROTOTYPE_TYPES, PLAGIARISM_STATUSES } from '@cms/shared';

/**
 * Minimum originality score (percentage) required for final papers
 * before a project can be archived. Papers scoring below this threshold
 * are considered to have too much similarity with existing works.
 */
const MIN_ORIGINALITY_THRESHOLD = 75;

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
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      academicYear: data.academicYear,
    });

    // Notify team members
    const otherMembers = team.members.filter((id) => id.toString() !== userId.toString());
    if (otherMembers.length > 0) {
      const createdNotifs = await Notification.insertMany(
        otherMembers.map((memberId) => ({
          userId: memberId,
          type: 'system',
          title: 'Project Created',
          message: `A new project "${project.title}" has been created for your team.`,
          metadata: { projectId: project._id },
        })),
      );
      createdNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
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

    const populateOpts = [
      { path: 'teamId', select: 'name leaderId members academicYear' },
      { path: 'adviserId', select: 'firstName middleName lastName email profilePicture' },
      { path: 'panelistIds', select: 'firstName middleName lastName email profilePicture' },
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
      const titleNotifs = await Notification.insertMany(
        instructors.map((instr) => ({
          userId: instr._id,
          type: 'title_submitted',
          title: 'New Title Submission',
          message: `A project title "${project.title}" has been submitted for approval.`,
          metadata: { projectId: project._id },
        })),
      );
      titleNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
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
      const revisedNotifs = await Notification.insertMany(
        instructors.map((instr) => ({
          userId: instr._id,
          type: 'title_submitted',
          title: 'Revised Title Submission',
          message: `A revised project title "${project.title}" has been resubmitted for approval.`,
          metadata: { projectId: project._id },
        })),
      );
      revisedNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
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
      const modNotifs = await Notification.insertMany(
        instructors.map((instr) => ({
          userId: instr._id,
          type: 'title_modification_requested',
          title: 'Title Modification Request',
          message: `Team requests to change title from "${project.title}" to "${data.proposedTitle}".`,
          metadata: { projectId: project._id },
        })),
      );
      modNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
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
    if (data.chapter4 !== undefined) project.deadlines.chapter4 = data.chapter4;
    if (data.chapter5 !== undefined) project.deadlines.chapter5 = data.chapter5;
    if (data.defense !== undefined) project.deadlines.defense = data.defense;
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

  /* ═══════════════ Capstone Phase Progression ═══════════════ */

  /**
   * Advance a project to the next capstone phase (instructor action).
   *
   * Phase transitions:
   * - 1 → 2: Requires proposal approved (projectStatus === PROPOSAL_APPROVED)
   * - 2 → 3: Allowed once the instructor decides the team is ready
   * - 3 → 4: Allowed once the instructor decides the team is ready
   * - 4 → (none): Phase 4 is the final phase — cannot advance further.
   *
   * @param {string} projectId
   * @param {string} instructorId - Requesting instructor
   * @returns {Object} { project, previousPhase, newPhase }
   */
  async advancePhase(projectId, instructorId) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const { capstonePhase } = project;

    if (capstonePhase >= CAPSTONE_PHASES.PHASE_4) {
      throw new AppError(
        'This project is already at the final capstone phase.',
        400,
        'ALREADY_FINAL_PHASE',
      );
    }

    // Phase 1 → 2 requires the proposal to be approved
    if (
      capstonePhase === CAPSTONE_PHASES.PHASE_1 &&
      project.projectStatus !== PROJECT_STATUSES.PROPOSAL_APPROVED
    ) {
      throw new AppError(
        'The proposal must be approved before advancing to Capstone 2.',
        400,
        'PROPOSAL_NOT_APPROVED',
      );
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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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

    if (data.type === PROTOTYPE_TYPES.LINK) {
      if (!data.url) {
        throw new AppError('A URL is required for link-type prototypes.', 400, 'URL_REQUIRED');
      }
      prototypeData.type = PROTOTYPE_TYPES.LINK;
      prototypeData.url = data.url;
    } else {
      // Media type (image or video)
      if (!file) {
        throw new AppError(
          'A file is required for media-type prototypes.',
          400,
          'FILE_REQUIRED',
        );
      }

      // Determine type from validated MIME
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

      // Push a temporary prototype to get its _id for the storage key
      project.prototypes.push(prototypeData);
      const proto = project.prototypes[project.prototypes.length - 1];

      const key = storageService.buildPrototypeKey(
        project._id.toString(),
        proto._id.toString(),
        file.originalname,
      );

      await storageService.uploadFile(file.buffer, key, mime, {
        projectId: project._id.toString(),
        prototypeId: proto._id.toString(),
        uploadedBy: userId.toString(),
      });

      proto.storageKey = key;
      proto.fileName = file.originalname;
      proto.fileSize = file.size;
      proto.mimeType = mime;

      await project.save();

      await this._notifyAdviser(project, {
        type: 'prototype_added',
        title: 'New Prototype Added',
        message: `A prototype "${data.title}" has been added to the project "${project.title}".`,
        metadata: { projectId: project._id, prototypeId: proto._id },
      });

      return { project, prototype: proto };
    }

    // Link-type — push and save
    project.prototypes.push(prototypeData);
    await project.save();

    const proto = project.prototypes[project.prototypes.length - 1];

    await this._notifyAdviser(project, {
      type: 'prototype_added',
      title: 'New Prototype Added',
      message: `A prototype link "${data.title}" has been added to the project "${project.title}".`,
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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
  async getPrototypes(projectId, userId) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

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
    const papersToCheck = [
      { submission: academic, label: 'academic' },
      { submission: journal, label: 'journal' },
    ];

    for (const { submission, label } of papersToCheck) {
      const plagResult = submission.plagiarismResult;

      if (!plagResult || !plagResult.status) {
        throw new AppError(
          `Plagiarism check has not been run on the final ${label} version.`,
          400,
          'PLAGIARISM_CHECK_PENDING',
        );
      }

      if (plagResult.status === PLAGIARISM_STATUSES.QUEUED || plagResult.status === PLAGIARISM_STATUSES.PROCESSING) {
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
      if (score == null) {
        throw new AppError(
          `Originality score is missing for the final ${label} version.`,
          400,
          'PLAGIARISM_CHECK_PENDING',
        );
      }

      if (score < MIN_ORIGINALITY_THRESHOLD) {
        throw new AppError(
          `Final ${label} version has an originality score of ${score}%, which is below the required ${MIN_ORIGINALITY_THRESHOLD}%. Please revise and re-submit.`,
          400,
          'ORIGINALITY_BELOW_THRESHOLD',
        );
      }
    }

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
   * @param {Object} query - { page, limit, search?, academicYear?, keyword? }
   * @param {Object} user - The requesting user (for role-based visibility)
   * @returns {Object} { projects, pagination }
   */
  async searchArchive(query, user) {
    const { page = 1, limit = 10, search, academicYear, keyword } = query;
    const skip = (page - 1) * limit;

    const filter = { isArchived: true };
    if (academicYear) filter.academicYear = academicYear;
    if (keyword) filter.keywords = { $in: [keyword] };
    if (search) filter.$text = { $search: search };

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teamId', 'name members')
        .populate('adviserId', 'firstName middleName lastName')
        .select('title abstract keywords academicYear capstonePhase archivedAt adviserId teamId completionNotes isArchived'),
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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    if (!project.isArchived && project.projectStatus !== PROJECT_STATUSES.ARCHIVED) {
      throw new AppError('Project must be archived before uploading a certificate.', 400, 'NOT_ARCHIVED');
    }

    const storageKey = storageService.buildCertificateKey(projectId, file.originalname);
    await storageService.uploadFile(storageKey, file.buffer, file.mimetype);

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
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    if (!project.certificateStorageKey) {
      throw new AppError('No certificate has been uploaded for this project.', 404, 'NO_CERTIFICATE');
    }

    const url = await storageService.getSignedUrl(project.certificateStorageKey, 3600);
    return { url };
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
   * Bulk-upload a legacy document to the archive, bypassing the standard
   * submission workflow. Creates a minimal project record and an associated
   * final_journal submission so it appears in archive searches.
   *
   * @param {string} instructorId - The instructor performing the bulk upload
   * @param {Object} data - { title, abstract?, keywords?, academicYear }
   * @param {Object} file - Multer file object (the PDF to archive)
   * @returns {Object} { project, submission }
   */
  async bulkUploadArchive(instructorId, data, file) {
    if (!file) {
      throw new AppError('A file is required for bulk upload.', 400, 'FILE_REQUIRED');
    }

    // Create a minimal archived project record
    const project = await Project.create({
      teamId: new mongoose.Types.ObjectId(), // Placeholder — no real team
      title: data.title,
      abstract: data.abstract || '',
      keywords: data.keywords || [],
      academicYear: data.academicYear,
      capstonePhase: 4,
      titleStatus: 'approved',
      projectStatus: PROJECT_STATUSES.ARCHIVED,
      isArchived: true,
      archivedAt: new Date(),
      completionNotes: 'Bulk-uploaded legacy document.',
    });

    // Upload file to S3 under the bulk-archive path
    const storageKey = storageService.buildBulkArchiveKey(data.academicYear, file.originalname);
    await storageService.uploadFile(storageKey, file.buffer, file.mimetype);

    // Create a journal submission record so archive search picks it up
    const submission = await Submission.create({
      projectId: project._id,
      submittedBy: new mongoose.Types.ObjectId(instructorId),
      type: 'final_journal',
      chapter: null,
      version: 1,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageKey,
      status: 'approved',
    });

    return { project, submission };
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
   * @param {import('mongoose').Types.ObjectId} teamId
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @private
   */
  async _notifyTeamMembers(teamId, notif) {
    const team = await Team.findById(teamId);
    if (!team) return;
    const notifs = await Notification.insertMany(
      team.members.map((memberId) => ({
        userId: memberId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
      })),
    );
    notifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
  }
}

export default new ProjectService();
