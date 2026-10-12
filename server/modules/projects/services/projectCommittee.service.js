import Team from '../../teams/team.model.js';
import User from '../../users/user.model.js';
import Notification from '../../notifications/notification.model.js';
import AppError from '../../../utils/AppError.js';
import { emitToUser } from '../../../services/socket.service.js';
import { ROLES } from '@cms/shared';
import projectCoreService from './projectCore.service.js';

class ProjectCommitteeService {
  async _getProjectOrFail(projectId) {
    return projectCoreService._getProjectOrFail(projectId);
  }

  async _notifyTeamMembers(teamId, notif, options) {
    return projectCoreService._notifyTeamMembers(teamId, notif, options);
  }

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
    const isFacultyEligible =
      adviser &&
      (adviser.role === ROLES.ADVISER ||
        adviser.role === ROLES.FACULTY ||
        adviser.role === ROLES.PANELIST ||
        ['adviser', 'faculty', 'panelist'].includes(adviser.role));

    if (
      !adviser ||
      !isFacultyEligible ||
      adviser.role === ROLES.INSTRUCTOR ||
      adviser.role === ROLES.STUDENT
    ) {
      throw new AppError(
        'Course instructors and students cannot serve as capstone adviser. Please appoint a verified faculty member.',
        400,
        'INVALID_ADVISER',
      );
    }

    if (
      project.panelistIds &&
      project.panelistIds.some((id) => id.toString() === data.adviserId.toString())
    ) {
      throw new AppError(
        'A defense panelist cannot serve as the faculty adviser on the same project.',
        400,
        'ROLE_CONFLICT',
      );
    }

    if (project.secretaryId && project.secretaryId.toString() === data.adviserId.toString()) {
      throw new AppError(
        'The committee secretary cannot serve as the faculty adviser on the same project.',
        400,
        'ROLE_CONFLICT',
      );
    }

    project.adviserId = data.adviserId;
    await project.save();

    if (project.teamId) {
      await Team.findByIdAndUpdate(project.teamId, { adviserId: data.adviserId });
    }

    await project.populate('adviserId', 'firstName middleName lastName email profilePicture');
    await project.populate('panelistIds', 'firstName middleName lastName email profilePicture');
    await project.populate(
      'panelists.userId',
      'firstName middleName lastName email profilePicture',
    );

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
    const isFacultyEligible =
      panelist &&
      (panelist.role === ROLES.PANELIST ||
        panelist.role === ROLES.FACULTY ||
        panelist.role === ROLES.ADVISER ||
        ['panelist', 'faculty', 'adviser'].includes(panelist.role));

    if (
      !panelist ||
      !isFacultyEligible ||
      panelist.role === ROLES.INSTRUCTOR ||
      panelist.role === ROLES.STUDENT
    ) {
      throw new AppError(
        'Course instructors and students cannot serve as defense panelists. Please appoint a verified faculty member.',
        400,
        'INVALID_PANELIST',
      );
    }

    if (project.adviserId && project.adviserId.toString() === data.panelistId.toString()) {
      throw new AppError(
        'A faculty adviser cannot serve as a defense panelist on the same project.',
        400,
        'ROLE_CONFLICT',
      );
    }

    if (project.secretaryId && project.secretaryId.toString() === data.panelistId.toString()) {
      throw new AppError(
        'The committee secretary cannot serve as a defense panelist on the same project.',
        400,
        'ROLE_CONFLICT',
      );
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
    if (!Array.isArray(project.panelists)) {
      project.panelists = [];
    }
    if (
      !project.panelists.some(
        (p) => (p.userId?._id || p.userId)?.toString() === data.panelistId.toString(),
      )
    ) {
      project.panelists.push({
        userId: data.panelistId,
        role: project.panelists.length === 0 ? 'chair' : 'member',
      });
    }
    await project.save();

    if (project.teamId) {
      await Team.findByIdAndUpdate(project.teamId, { panelistIds: project.panelistIds });
    }

    await project.populate('adviserId', 'firstName middleName lastName email profilePicture');
    await project.populate('panelistIds', 'firstName middleName lastName email profilePicture');
    await project.populate(
      'panelists.userId',
      'firstName middleName lastName email profilePicture',
    );

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
    if (Array.isArray(project.panelists)) {
      project.panelists = project.panelists.filter(
        (p) => (p.userId?._id || p.userId)?.toString() !== data.panelistId.toString(),
      );
    }
    await project.save();

    if (project.teamId) {
      await Team.findByIdAndUpdate(project.teamId, { panelistIds: project.panelistIds });
    }

    await project.populate('adviserId', 'firstName middleName lastName email profilePicture');
    await project.populate('panelistIds', 'firstName middleName lastName email profilePicture');
    await project.populate(
      'panelists.userId',
      'firstName middleName lastName email profilePicture',
    );

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
   * Assign a committee secretary to a project (instructor action).
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { secretaryId }
   * @returns {Object} { project }
   */
  async assignSecretary(projectId, instructorId, data) {
    const project = await this._getProjectOrFail(projectId);

    const secretary = await User.findById(data.secretaryId);
    const isFacultyEligible =
      secretary &&
      (secretary.role === ROLES.FACULTY ||
        secretary.role === ROLES.ADVISER ||
        secretary.role === ROLES.PANELIST ||
        ['faculty', 'adviser', 'panelist'].includes(secretary.role));

    if (
      !secretary ||
      !isFacultyEligible ||
      secretary.role === ROLES.INSTRUCTOR ||
      secretary.role === ROLES.STUDENT
    ) {
      throw new AppError(
        'Course instructors and students cannot serve as committee secretary. Please appoint a verified faculty member.',
        400,
        'INVALID_SECRETARY',
      );
    }

    if (project.adviserId && project.adviserId.toString() === data.secretaryId.toString()) {
      throw new AppError(
        'A faculty adviser cannot serve as committee secretary on the same project.',
        400,
        'ROLE_CONFLICT',
      );
    }

    if (
      project.panelistIds &&
      project.panelistIds.some((id) => id.toString() === data.secretaryId.toString())
    ) {
      throw new AppError(
        'A defense panelist cannot serve as committee secretary on the same project.',
        400,
        'ROLE_CONFLICT',
      );
    }

    project.secretaryId = data.secretaryId;
    await project.save();

    // Synchronize team secretaryId if project belongs to a team
    if (project.teamId) {
      await Team.findByIdAndUpdate(project.teamId, { secretaryId: data.secretaryId });
    }

    await project.populate('adviserId', 'firstName middleName lastName email profilePicture');
    await project.populate('secretaryId', 'firstName middleName lastName email profilePicture');
    await project.populate('panelistIds', 'firstName middleName lastName email profilePicture');
    await project.populate(
      'panelists.userId',
      'firstName middleName lastName email profilePicture',
    );

    // Notify the secretary
    const secretaryNotif = await Notification.create({
      userId: data.secretaryId,
      type: 'committee_assigned',
      title: 'Committee Secretary Assignment',
      message: `You have been appointed as Committee Secretary for the project "${project.title}".`,
      metadata: { projectId: project._id, assignedBy: instructorId },
    });
    emitToUser(data.secretaryId, 'notification:new', secretaryNotif);

    // Notify team members
    await this._notifyTeamMembers(project.teamId, {
      type: 'committee_assigned',
      title: 'Secretary Appointed',
      message: `${secretary.fullName || `${secretary.firstName} ${secretary.lastName}`} has been appointed as your Committee Secretary.`,
      metadata: { projectId: project._id, secretaryId: data.secretaryId },
    });

    return { project };
  }

  /**
   * Remove the committee secretary from a project (instructor action).
   * @param {string} projectId
   * @param {string} instructorId
   * @returns {Object} { project }
   */
  async removeSecretary(projectId, instructorId) {
    const project = await this._getProjectOrFail(projectId);

    if (!project.secretaryId) {
      throw new AppError(
        'No secretary is currently assigned to this project.',
        404,
        'SECRETARY_NOT_FOUND',
      );
    }

    const previousSecretaryId = project.secretaryId;
    project.secretaryId = null;
    await project.save();

    if (project.teamId) {
      await Team.findByIdAndUpdate(project.teamId, { secretaryId: null });
    }

    await project.populate('adviserId', 'firstName middleName lastName email profilePicture');
    await project.populate('secretaryId', 'firstName middleName lastName email profilePicture');
    await project.populate('panelistIds', 'firstName middleName lastName email profilePicture');
    await project.populate(
      'panelists.userId',
      'firstName middleName lastName email profilePicture',
    );

    const removedSecNotif = await Notification.create({
      userId: previousSecretaryId,
      type: 'committee_assigned',
      title: 'Committee Assignment Updated',
      message: `You have been unassigned as Committee Secretary for the project "${project.title}".`,
      metadata: { projectId: project._id, removedBy: instructorId },
    });
    emitToUser(previousSecretaryId, 'notification:new', removedSecNotif);

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

    if (project.adviserId && project.adviserId.toString() === panelistId.toString()) {
      throw new AppError(
        'A faculty adviser cannot serve as a defense panelist on the same project.',
        400,
        'ROLE_CONFLICT',
      );
    }

    const panelist = await User.findById(panelistId);
    const isFacultyEligible =
      panelist &&
      (panelist.role === ROLES.PANELIST ||
        panelist.role === ROLES.FACULTY ||
        panelist.role === ROLES.ADVISER ||
        ['panelist', 'faculty', 'adviser'].includes(panelist.role));

    if (
      !panelist ||
      !isFacultyEligible ||
      panelist.role === ROLES.INSTRUCTOR ||
      panelist.role === ROLES.STUDENT
    ) {
      throw new AppError(
        'Course instructors and students cannot serve as defense panelists. Please appoint a verified faculty member.',
        400,
        'INVALID_PANELIST',
      );
    }

    project.panelistIds.push(panelistId);
    if (!Array.isArray(project.panelists)) {
      project.panelists = [];
    }
    if (
      !project.panelists.some(
        (p) => (p.userId?._id || p.userId)?.toString() === panelistId.toString(),
      )
    ) {
      project.panelists.push({
        userId: panelistId,
        role: project.panelists.length === 0 ? 'chair' : 'member',
      });
    }
    await project.save();

    await project.populate('adviserId', 'firstName middleName lastName email profilePicture');
    await project.populate('panelistIds', 'firstName middleName lastName email profilePicture');
    await project.populate(
      'panelists.userId',
      'firstName middleName lastName email profilePicture',
    );

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
   * Notify appointed committee members (Adviser, Secretary, Panelists) about a project event.
   *
   * @param {Object} project
   * @param {{ type: string, title: string, message: string, metadata: Object }} notif
   * @private
   */
  async _notifyCommittee(project, notif) {
    if (!project) return;
    const recipientIds = new Set();
    if (project.adviserId) recipientIds.add(project.adviserId.toString());
    if (project.secretaryId) recipientIds.add(project.secretaryId.toString());
    if (Array.isArray(project.panelistIds)) {
      project.panelistIds.forEach((pid) => {
        if (pid) recipientIds.add(pid.toString());
      });
    }

    if (recipientIds.size === 0) return;

    const notifs = await Notification.insertMany(
      [...recipientIds].map((userId) => ({
        userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
      })),
    );
    notifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
  }
}

export default new ProjectCommitteeService();
