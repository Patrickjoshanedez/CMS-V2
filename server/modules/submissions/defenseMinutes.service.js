import DefenseMinutes from './defenseMinutes.model.js';
import Project from '../projects/project.model.js';
import Evaluation from '../evaluations/evaluation.model.js';
import Notification from '../notifications/notification.model.js';
import { emitToUser, emitToRoom } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import { EVALUATION_STATUSES, DEFENSE_TYPES } from '@cms/shared';

class DefenseMinutesService {
  /**
   * Helper to compute live evaluation scores across assigned panelists for a defense session.
   */
  async computeLiveScores(projectId, defenseType) {
    const project = await Project.findById(projectId).select(
      'panelists panelistIds secretaryId title teamId',
    );
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const evaluations = await Evaluation.find({ projectId, defenseType })
      .populate('panelistId', 'firstName lastName email')
      .sort({ createdAt: 1 });

    const assignedPanelists = project.panelists || [];
    const panelScores = assignedPanelists.map((panelist) => {
      const pIdStr = panelist.userId?.toString();
      const evaluation = evaluations.find(
        (ev) => (ev.panelistId?._id || ev.panelistId)?.toString() === pIdStr,
      );

      const panelistName = evaluation?.panelistId?.firstName
        ? `${evaluation.panelistId.firstName} ${evaluation.panelistId.lastName}`
        : 'Panel Member';

      const score = typeof evaluation?.totalScore === 'number' ? evaluation.totalScore : null;
      const maxScore =
        typeof evaluation?.maxTotalScore === 'number' ? evaluation.maxTotalScore : 100;
      const percentage =
        score !== null && maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : null;

      return {
        panelistId: panelist.userId,
        panelistName,
        panelRole: panelist.role || 'member',
        score,
        maxScore,
        percentage,
        decision: evaluation?.decision || null,
        status: evaluation?.status || EVALUATION_STATUSES.DRAFT,
        submittedAt: evaluation?.submittedAt || null,
      };
    });

    const scoredEntries = panelScores.filter(
      (ps) => ps.score !== null && (ps.status === 'submitted' || ps.status === 'released'),
    );

    const totalPanelists = assignedPanelists.length;
    const submittedCount = scoredEntries.length;

    const averageScore =
      submittedCount > 0
        ? Math.round(
            (scoredEntries.reduce((sum, ps) => sum + ps.score, 0) / submittedCount) * 100,
          ) / 100
        : null;

    const averageMaxScore =
      submittedCount > 0
        ? Math.round(
            (scoredEntries.reduce((sum, ps) => sum + ps.maxScore, 0) / submittedCount) * 100,
          ) / 100
        : null;

    const averagePercentage =
      averageScore !== null && averageMaxScore > 0
        ? Math.round((averageScore / averageMaxScore) * 10000) / 100
        : null;

    const passingThreshold = 75;
    const passingThresholdMet = averagePercentage !== null && averagePercentage >= passingThreshold;

    return {
      totalPanelists,
      submittedCount,
      averageScore,
      averageMaxScore,
      averagePercentage,
      passingThreshold,
      passingThresholdMet,
      panelScores,
    };
  }

  /**
   * Get or initialize live defense minutes for a project and defense type.
   */
  async getOrCreateMinutes(projectId, defenseType, user) {
    const project = await Project.findById(projectId)
      .populate('teamId', 'name members')
      .populate('adviserId', 'firstName lastName email')
      .populate('secretaryId', 'firstName lastName email')
      .populate('panelists.userId', 'firstName lastName email');

    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    let minutes = await DefenseMinutes.findOne({ projectId, defenseType })
      .populate('secretaryId', 'firstName lastName email')
      .populate('consensusVerdict.finalizedBy', 'firstName lastName email')
      .populate('compositeScores.lockedBy', 'firstName lastName email');

    if (!minutes) {
      const appointedSecretaryId = project.secretaryId?._id || project.secretaryId || user._id;
      minutes = await DefenseMinutes.create({
        projectId,
        defenseType,
        secretaryId: appointedSecretaryId,
        sessionStatus: 'in_progress',
        startTime: new Date(),
      });
      await minutes.populate('secretaryId', 'firstName lastName email');
    }

    const liveScores = await this.computeLiveScores(projectId, defenseType);

    return {
      defenseMinutes: minutes,
      liveScores,
      project: {
        _id: project._id,
        title: project.title,
        teamId: project.teamId,
        capstonePhase: project.capstonePhase,
        adviser: project.adviserId,
        secretary: project.secretaryId,
        panelists: project.panelists,
        admStatus: project.admStatus,
        admSignatures: project.admSignatures,
      },
    };
  }

  /**
   * Add a structured revision critique entry.
   */
  async addEntry(projectId, defenseType, data, user) {
    const {
      category = 'General / Other',
      panelistName,
      panelistId = null,
      critique,
      expectedAction,
      severity = 'minor',
      pageOrModule = '',
    } = data;

    if (!panelistName || !panelistName.trim()) {
      throw new AppError('Panelist name is required.', 400, 'PANELIST_NAME_REQUIRED');
    }
    if (!critique || !critique.trim()) {
      throw new AppError('Critique or observation is required.', 400, 'CRITIQUE_REQUIRED');
    }
    if (!expectedAction || !expectedAction.trim()) {
      throw new AppError('Expected action is required.', 400, 'EXPECTED_ACTION_REQUIRED');
    }

    let minutes = await DefenseMinutes.findOne({ projectId, defenseType });
    if (!minutes) {
      minutes = await DefenseMinutes.create({
        projectId,
        defenseType,
        secretaryId: user._id,
        sessionStatus: 'in_progress',
      });
    }

    const newEntry = {
      category,
      panelistName: panelistName.trim(),
      panelistId,
      critique: critique.trim(),
      expectedAction: expectedAction.trim(),
      severity,
      pageOrModule: pageOrModule.trim(),
      createdAt: new Date(),
    };

    minutes.entries.push(newEntry);
    await minutes.save();

    const added = minutes.entries[minutes.entries.length - 1];

    try {
      emitToRoom(`project:${projectId}`, 'defense:minutes_updated', {
        projectId,
        defenseType,
        action: 'add',
        entry: added,
      });
    } catch {
      // Non-blocking socket emission
    }

    return { entry: added, defenseMinutes: minutes };
  }

  /**
   * Update an existing revision entry.
   */
  async updateEntry(projectId, defenseType, entryId, data) {
    const minutes = await DefenseMinutes.findOne({ projectId, defenseType });
    if (!minutes)
      throw new AppError('Defense minutes session not found.', 404, 'MINUTES_NOT_FOUND');

    const entry = minutes.entries.id(entryId);
    if (!entry) throw new AppError('Entry not found.', 404, 'ENTRY_NOT_FOUND');

    if (data.category !== undefined) entry.category = data.category;
    if (data.panelistName !== undefined) entry.panelistName = data.panelistName.trim();
    if (data.panelistId !== undefined) entry.panelistId = data.panelistId;
    if (data.critique !== undefined) entry.critique = data.critique.trim();
    if (data.expectedAction !== undefined) entry.expectedAction = data.expectedAction.trim();
    if (data.severity !== undefined) entry.severity = data.severity;
    if (data.pageOrModule !== undefined) entry.pageOrModule = data.pageOrModule.trim();

    await minutes.save();

    try {
      emitToRoom(`project:${projectId}`, 'defense:minutes_updated', {
        projectId,
        defenseType,
        action: 'update',
        entry,
      });
    } catch {
      // Non-blocking
    }

    return { entry, defenseMinutes: minutes };
  }

  /**
   * Delete a revision entry.
   */
  async deleteEntry(projectId, defenseType, entryId) {
    const minutes = await DefenseMinutes.findOne({ projectId, defenseType });
    if (!minutes)
      throw new AppError('Defense minutes session not found.', 404, 'MINUTES_NOT_FOUND');

    minutes.entries.pull(entryId);
    await minutes.save();

    try {
      emitToRoom(`project:${projectId}`, 'defense:minutes_updated', {
        projectId,
        defenseType,
        action: 'delete',
        entryId,
      });
    } catch {
      // Non-blocking
    }

    return { defenseMinutes: minutes };
  }

  /**
   * Finalize the panel's consensus verdict.
   */
  async finalizeVerdict(projectId, defenseType, data, user) {
    const { verdict, remarks = '', chairConfirmed = false } = data;

    if (!verdict) {
      throw new AppError('Consensus verdict is required.', 400, 'VERDICT_REQUIRED');
    }

    const minutes = await DefenseMinutes.findOne({ projectId, defenseType });
    if (!minutes)
      throw new AppError('Defense minutes session not found.', 404, 'MINUTES_NOT_FOUND');

    minutes.consensusVerdict = {
      verdict,
      remarks: remarks.trim(),
      finalizedAt: new Date(),
      finalizedBy: user._id,
      chairConfirmed: Boolean(chairConfirmed),
      chairConfirmedAt: chairConfirmed ? new Date() : null,
      chairConfirmedBy: chairConfirmed ? user._id : null,
    };

    minutes.sessionStatus = 'concluded';
    minutes.endTime = new Date();

    await minutes.save();

    return { consensusVerdict: minutes.consensusVerdict, defenseMinutes: minutes };
  }

  /**
   * Lock composite scores once verified by Secretary and Panel Chair.
   */
  async lockCompositeScores(projectId, defenseType, data, user) {
    const minutes = await DefenseMinutes.findOne({ projectId, defenseType });
    if (!minutes)
      throw new AppError('Defense minutes session not found.', 404, 'MINUTES_NOT_FOUND');

    const liveScores = await this.computeLiveScores(projectId, defenseType);

    minutes.compositeScores = {
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: user._id,
      chairConfirmed: Boolean(data?.confirmedByChair),
      chairConfirmedAt: data?.confirmedByChair ? new Date() : null,
      chairConfirmedBy: data?.confirmedByChair ? user._id : null,
      averageScore: liveScores.averageScore,
      averageMaxScore: liveScores.averageMaxScore,
      averagePercentage: liveScores.averagePercentage,
      passingThreshold: liveScores.passingThreshold,
      passingThresholdMet: liveScores.passingThresholdMet,
      panelScores: liveScores.panelScores,
    };

    await minutes.save();

    return { compositeScores: minutes.compositeScores, defenseMinutes: minutes };
  }

  /**
   * Publish logged minutes into the official Action Done Matrix (ADM).
   */
  async publishToADM(projectId, defenseType, user) {
    const minutes = await DefenseMinutes.findOne({ projectId, defenseType });
    if (!minutes)
      throw new AppError('Defense minutes session not found.', 404, 'MINUTES_NOT_FOUND');

    if (!minutes.entries || minutes.entries.length === 0) {
      throw new AppError(
        'Cannot publish an empty Action Done Matrix. Please log at least one defense revision entry before publishing.',
        400,
        'NO_MINUTES_ENTRIES',
      );
    }

    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const milestoneMap = {
      [DEFENSE_TYPES.PROPOSAL]: 'CAPSTONE_2',
      [DEFENSE_TYPES.MIDTERM]: 'CAPSTONE_3',
      [DEFENSE_TYPES.PAPER]: 'CAPSTONE_3',
      [DEFENSE_TYPES.FINAL]: 'CAPSTONE_4',
    };
    const milestone = milestoneMap[defenseType] || 'CAPSTONE_2';

    const newRows = minutes.entries.map((entry) => ({
      panelName: entry.panelistName,
      suggestion: entry.critique,
      expectedAction: entry.expectedAction,
      pageNumbers: entry.pageOrModule || '',
      actionDone: '',
      status: 'pending',
      remarks: `[${entry.category}]`,
      milestone,
      isLocked: false,
      signatures: [],
    }));

    if (!Array.isArray(project.actionDoneMatrix)) {
      project.actionDoneMatrix = [];
    }

    // Append new rows
    project.actionDoneMatrix.push(...newRows);
    project.admStatus = 'pending_developer_action';

    // Reset secretary endorsement for the new revision cycle
    if (!project.admSignatures) {
      project.admSignatures = { adviser: {}, instructor: {}, panelists: [], chair: {} };
    }
    project.admSignatures.secretary = {
      endorsed: false,
      endorsedAt: null,
      signatoryName: '',
      notes: '',
      signatureDataUrl: null,
      userId: null,
    };

    await project.save();

    minutes.matrixPublished = true;
    minutes.matrixPublishedAt = new Date();
    minutes.sessionStatus = 'published';
    await minutes.save();

    // Dispatch notifications to team members
    try {
      const team = await (await import('../teams/team.model.js')).default.findById(project.teamId);
      if (team?.members?.length > 0) {
        const notifications = team.members.map((memberId) => ({
          userId: memberId,
          type: 'minutes_uploaded',
          title: 'Action Done Matrix Published',
          message: `Official defense minutes for "${project.title}" have been published. Please review the checklist and submit your compliance log.`,
          metadata: { projectId: project._id, admStatus: project.admStatus },
        }));
        const createdNotifs = await Notification.insertMany(notifications);
        createdNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));
      }
    } catch {
      // Non-blocking notification
    }

    return {
      success: true,
      actionDoneMatrix: project.actionDoneMatrix,
      admStatus: project.admStatus,
      defenseMinutes: minutes,
    };
  }
}

export default new DefenseMinutesService();
