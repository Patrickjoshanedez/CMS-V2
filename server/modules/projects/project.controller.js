import projectService from './project.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';
import {
  calculateProposalSimilarityDetailed,
  extractMatchingKeywords,
  tokenize,
} from '../../utils/proposalSimilarity.js';
import { checkOriginality } from '../../services/plagiarism.service.js';
import Project from './project.model.js';
import Notification from '../notifications/notification.model.js';
import { emitToUser } from '../../services/socket.service.js';

function buildProposalText({
  title,
  problemStatement,
  proposedSolution,
  uniqueContribution,
  expectedImpact,
}) {
  return [title, problemStatement, proposedSolution, uniqueContribution, expectedImpact]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * ProjectController — Thin handlers delegating to ProjectService.
 */

/** POST /api/projects/similarity-scan — Compare proposals for similarity */
export const checkProposalSimilarity = catchAsync(async (req, res) => {
  const {
    title,
    problemStatement,
    proposedSolution,
    uniqueContribution,
    expectedImpact,
    academicYear,
  } = req.body;
  const tokenizedProjectInput = {
    title: tokenize(title),
    problemStatement: tokenize(problemStatement),
    proposedSolution: tokenize(proposedSolution),
    uniqueContribution: tokenize(uniqueContribution),
    expectedImpact: tokenize(expectedImpact),
  };

  const matchFilter = {
    status: { $in: ['APPROVED', 'PENDING', 'ARCHIVED'] },
  };
  if (academicYear) {
    matchFilter.academicYear = academicYear;
  }

  // Find approved, pending, archived projects
  // Limit to recent active projects or limit the scan pool to prevent DOS
  // And use lean() with strict selected fields only to minimize memory loading.
  const allProjects = await Project.find(matchFilter)
    .sort({ createdAt: -1 })
    .limit(500)
    .select(
      'title titleProposals problemStatement proposedSolution uniqueContribution expectedImpact status',
    )
    .lean();

  const submittedProposalText = buildProposalText({
    title,
    problemStatement,
    proposedSolution,
    uniqueContribution,
    expectedImpact,
  });

  const proposalCorpus = allProjects.map((project) => ({
    id: String(project._id),
    title: project.title,
    chapter: 0,
    text: buildProposalText(project),
  }));

  const plagiarismResult = await checkOriginality(submittedProposalText, proposalCorpus);

  const results = allProjects
    .map((p) => {
      const similarity = calculateProposalSimilarityDetailed(tokenizedProjectInput, p);

      // Only return if similarity score is high enough (e.g. > 0.15)
      return {
        _id: p._id,
        title: p.title,
        status: p.status,
        score: similarity.overall,
        keywords: {
          problemStatement: extractMatchingKeywords(
            tokenizedProjectInput.problemStatement,
            p.problemStatement || '',
          ),
          proposedSolution: extractMatchingKeywords(
            tokenizedProjectInput.proposedSolution,
            p.proposedSolution || '',
          ),
        },
      };
    })
    .filter((p) => p.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      matches: results,
      plagiarism: {
        originalityScore: plagiarismResult.originalityScore,
        similarityScore: Math.max(0, Math.min(100, 100 - plagiarismResult.originalityScore)),
        matchedSources: plagiarismResult.matchedSources,
      },
    },
  });
});

/** GET /api/projects/create-draft — Read the current user's create-project draft */
export const getCreateProjectDraft = catchAsync(async (req, res) => {
  const { draft, updatedAt } = await projectService.getCreateProjectDraft(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { draft, updatedAt },
  });
});

/** PUT /api/projects/create-draft — Save the current user's create-project draft */
export const saveCreateProjectDraft = catchAsync(async (req, res) => {
  const { draft, updatedAt } = await projectService.saveCreateProjectDraft(
    req.user._id,
    req.body.draft ?? null,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Create-project draft saved.',
    data: { draft, updatedAt },
  });
});

/** DELETE /api/projects/create-draft — Clear the current user's create-project draft */
export const clearCreateProjectDraft = catchAsync(async (req, res) => {
  await projectService.clearCreateProjectDraft(req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Create-project draft cleared.',
    data: { draft: null, updatedAt: null },
  });
});

/** POST /api/projects — Create a project (Team leader, student only) */
export const createProject = catchAsync(async (req, res) => {
  const { project, similarProjects } = await projectService.createProject(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Project created successfully.',
    data: { project, similarProjects },
  });
});

/** GET /api/projects/me — Get current student's project */
export const getMyProject = catchAsync(async (req, res) => {
  try {
    const { project } = await projectService.getMyProject(req.user._id);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    if (error?.code === 'NO_TEAM' || error?.code === 'PROJECT_NOT_FOUND') {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { project: null },
      });
    }

    throw error;
  }
});

/** GET /api/projects/:id — Get single project */
export const getProject = catchAsync(async (req, res) => {
  const { project } = await projectService.getProject(req.params.id, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { project },
  });
});

/** GET /api/projects — List projects with filters (faculty) */
export const listProjects = catchAsync(async (req, res) => {
  const { projects, pagination } = await projectService.listProjects(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { projects, pagination },
  });
});

/** PATCH /api/projects/:id/title — Update title/abstract/keywords (draft) */
export const updateTitle = catchAsync(async (req, res) => {
  const { project, similarProjects } = await projectService.updateTitle(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title updated.',
    data: { project, similarProjects },
  });
});

/** POST /api/projects/:id/title/submit — Submit title for approval */
export const submitTitle = catchAsync(async (req, res) => {
  const { project } = await projectService.submitTitle(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title submitted for approval.',
    data: { project },
  });
});

/** POST /api/projects/:id/title/approve — Approve a submitted title */
export const approveTitle = catchAsync(async (req, res) => {
  const { project } = await projectService.approveTitle(req.params.id, req.user, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title approved.',
    data: { project },
  });
});

/** POST /api/projects/:id/title/reject — Reject a submitted title */
export const rejectTitle = catchAsync(async (req, res) => {
  const { project } = await projectService.rejectTitle(req.params.id, req.user, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title sent back for revision.',
    data: { project },
  });
});

/** POST /api/projects/:id/title-proposals/:proposalId/comments — Add a comment to a title proposal */
export const addTitleComment = catchAsync(async (req, res) => {
  const { project } = await projectService.addTitleComment({
    projectId: req.params.id,
    proposalId: req.params.proposalId,
    user: req.user,
    text: req.body.text,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Comment added successfully.',
    data: { project },
  });
});

/** PATCH /api/projects/:id/title/revise — Revise and resubmit title */
export const reviseAndResubmit = catchAsync(async (req, res) => {
  const { project, similarProjects } = await projectService.reviseAndResubmit(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title revised and resubmitted.',
    data: { project, similarProjects },
  });
});

/** POST /api/projects/:id/title/modification — Request title modification */
export const requestTitleModification = catchAsync(async (req, res) => {
  const { project } = await projectService.requestTitleModification(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title modification request submitted.',
    data: { project },
  });
});

/** POST /api/projects/:id/title/modification/resolve — Resolve modification */
export const resolveTitleModification = catchAsync(async (req, res) => {
  const { project } = await projectService.resolveTitleModification(
    req.params.id,
    req.user,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title modification request resolved.',
    data: { project },
  });
});

/** POST /api/projects/title-check — Real-time title similarity check */
export const checkTitleSimilarity = catchAsync(async (req, res) => {
  const { title, keywords, excludeProjectId } = req.body;
  const { similarProjects, threshold } = await projectService.checkTitleSimilarity(
    title,
    keywords,
    excludeProjectId || null,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { similarProjects, threshold },
  });
});

/** POST /api/projects/:id/adviser — Assign an adviser */
export const assignAdviser = catchAsync(async (req, res) => {
  const { project } = await projectService.assignAdviser(req.params.id, req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Adviser assigned.',
    data: { project },
  });
});

/** POST /api/projects/:id/panelists — Assign a panelist */
export const assignPanelist = catchAsync(async (req, res) => {
  const { project } = await projectService.assignPanelist(req.params.id, req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Panelist assigned.',
    data: { project },
  });
});

/** DELETE /api/projects/:id/panelists — Remove a panelist */
export const removePanelist = catchAsync(async (req, res) => {
  const { project } = await projectService.removePanelist(req.params.id, req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Panelist removed.',
    data: { project },
  });
});

/** POST /api/projects/:id/panelists/select — Panelist self-selects */
export const selectAsPanelist = catchAsync(async (req, res) => {
  const { project } = await projectService.selectAsPanelist(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'You have been added as a panelist.',
    data: { project },
  });
});

/** PATCH /api/projects/:id/deadlines — Set deadlines */
export const setDeadlines = catchAsync(async (req, res) => {
  const { project } = await projectService.setDeadlines(req.params.id, req.body, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Deadlines updated.',
    data: { project },
  });
});

/** POST /api/projects/:id/reject — Reject entire project */
export const rejectProject = catchAsync(async (req, res) => {
  const { project } = await projectService.rejectProject(req.params.id, req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Project rejected.',
    data: { project },
  });
});

/** POST /api/projects/:id/advance-phase — Advance capstone phase (Instructor) */
export const advancePhase = catchAsync(async (req, res) => {
  const { project } = await projectService.advancePhase(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Project advanced to Capstone ${project.capstonePhase}.`,
    data: { project },
  });
});

/** POST /api/projects/:id/prototypes/link — Add prototype link (Student) */
export const addPrototypeLink = catchAsync(async (req, res) => {
  const data = { ...req.body, type: 'link' };
  const { project } = await projectService.addPrototype(req.params.id, req.user._id, data);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Prototype link added.',
    data: { project },
  });
});

/** POST /api/projects/:id/prototypes/media — Upload prototype media (Student) */
export const addPrototypeMedia = catchAsync(async (req, res) => {
  const data = { ...req.body, type: 'media' };
  const { project } = await projectService.addPrototype(
    req.params.id,
    req.user._id,
    data,
    req.file,
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Prototype media uploaded.',
    data: { project },
  });
});

/** GET /api/projects/:id/prototypes — List prototypes with signed URLs */
export const getPrototypes = catchAsync(async (req, res) => {
  const { prototypes } = await projectService.getPrototypes(req.params.id, req.user._id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { prototypes },
  });
});

/** DELETE /api/projects/:id/prototypes/:prototypeId — Remove a prototype */
export const removePrototype = catchAsync(async (req, res) => {
  const { project } = await projectService.removePrototype(
    req.params.id,
    req.params.prototypeId,
    req.user._id,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Prototype removed.',
    data: { project },
  });
});

/** POST /api/projects/:id/archive — Archive a completed project (Instructor) */
export const archiveProject = catchAsync(async (req, res) => {
  const { project } = await projectService.archiveProject(req.params.id, req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Project archived successfully.',
    data: { project },
  });
});

/** GET /api/projects/archive/search — Search the archive */
export const searchArchive = catchAsync(async (req, res) => {
  const result = await projectService.searchArchive(req.query, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  });
});

/** POST /api/projects/:id/certificate — Upload completion certificate (Instructor) */
export const uploadCertificate = catchAsync(async (req, res) => {
  const { project } = await projectService.uploadCertificate(req.params.id, req.user._id, req.file);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Certificate uploaded successfully.',
    data: { project },
  });
});

/** GET /api/projects/:id/certificate — Get certificate download URL */
export const getCertificateUrl = catchAsync(async (req, res) => {
  const { url } = await projectService.getCertificateUrl(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { url },
  });
});

/** GET /api/projects/reports — Generate project reports (Instructor) */
export const generateReport = catchAsync(async (req, res) => {
  const { report } = await projectService.generateReport(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { report },
  });
});

/** POST /api/projects/archive/bulk — Bulk upload an archived capstone bundle (Instructor) */
export const bulkUploadArchive = catchAsync(async (req, res) => {
  const { project, submissions, similarity } = await projectService.bulkUploadArchive(
    req.user._id,
    req.body,
    {
      academicPaperFile: req.files?.academicPaperFile?.[0] || null,
      academicJournalFile: req.files?.academicJournalFile?.[0] || null,
    },
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Archived capstone bundle uploaded successfully.',
    data: { project, submissions, similarity },
  });
});

/** PATCH /api/projects/:id/gantt-chart — Update Gantt chart URL */
export const updateGanttChartUrl = catchAsync(async (req, res) => {
  const { project } = await projectService.updateGanttChartUrl(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Gantt chart URL updated.',
    data: { project },
  });
});

/** PATCH /api/projects/:id/demo-video — Update Demo video URL */
export const updateDemoVideoUrl = catchAsync(async (req, res) => {
  const { project } = await projectService.updateDemoVideoUrl(
    req.params.id,
    req.user._id,
    req.body,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Demo video URL updated.',
    data: { project },
  });
});

/** POST /api/projects/:projectId/stream-routing — Route Capstone 1 vs Capstone 2 streams */
export const handleProjectStream = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);

  if (!project) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Project not found.',
    });
  }

  const targetCourse = req.body?.capstoneCourse || project.capstoneCourse;
  if (targetCourse) {
    project.capstoneCourse = targetCourse;
  }

  if (project.capstoneCourse === 'Capstone 2') {
    // Bypass standard manuscript upload cycles (Proposal, Progress, Final)
    project.projectStatus = 'active';
    project.admStatus = 'awaiting_minutes_upload';
    if (!project.actionDoneMatrix) {
      project.actionDoneMatrix = [];
    }
    await project.save();

    // Alert Adviser and Panelists if assigned
    if (project.adviserId) {
      const notif = await Notification.create({
        userId: project.adviserId,
        type: 'system',
        title: 'Capstone 2 ADM Pipeline Activated',
        message: `Project "${project.title}" has entered the Capstone 2 Action Done Matrix (ADM) pipeline.`,
        metadata: { projectId: project._id, capstoneCourse: 'Capstone 2' },
      });
      emitToUser(project.adviserId, 'notification:new', notif);
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message:
        'Capstone 2 stream detected. Manuscript uploads bypassed; routing directly to the Action Done Matrix module.',
      project,
    });
  }

  // Default Capstone 1 routing
  project.projectStatus = 'active';
  await project.save();
  return res.status(HTTP_STATUS.OK).json({ success: true, project });
});

/** GET /api/projects/:projectId/action-done-matrix — Retrieve ADM rows */
export const getActionDoneMatrix = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId).select(
    'actionDoneMatrix admStatus capstoneCourse title',
  );

  if (!project) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Project not found.',
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      actionDoneMatrix: project.actionDoneMatrix || [],
      admStatus: project.admStatus || 'not_started',
      capstoneCourse: project.capstoneCourse,
    },
  });
});

/** PATCH /api/projects/:projectId/action-done-matrix/:itemId — Update single ADM item */
export const updateActionDoneMatrixItem = catchAsync(async (req, res) => {
  const { projectId, itemId } = req.params;
  const { actionDone, status, remarks } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Project not found.',
    });
  }

  const item = project.actionDoneMatrix.id(itemId);
  if (!item) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'ADM row item not found.',
    });
  }

  if (actionDone !== undefined) item.actionDone = actionDone;
  if (status !== undefined) item.status = status;
  if (remarks !== undefined) item.remarks = remarks;

  // Check overall ADM completion → advance status
  const allAddressed = project.actionDoneMatrix.every(
    (row) => row.status === 'addressed' || row.status === 'verified',
  );
  if (allAddressed && project.actionDoneMatrix.length > 0) {
    project.admStatus = 'under_panel_review';
  }

  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Action Done Matrix item updated.',
    data: {
      item,
      actionDoneMatrix: project.actionDoneMatrix,
      admStatus: project.admStatus,
    },
  });
});

/** PATCH /api/projects/:projectId/adm-status — Update overall ADM status (instructor/panelist) */
export const updateADMStatus = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { admStatus } = req.body;

  const validStatuses = [
    'not_started',
    'awaiting_minutes_upload',
    'pending_developer_action',
    'under_panel_review',
    'approved',
  ];
  if (!validStatuses.includes(admStatus)) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ success: false, message: 'Invalid ADM status.' });
  }

  const project = await Project.findById(projectId).populate('teamId');
  if (!project) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ success: false, message: 'Project not found.' });
  }

  project.admStatus = admStatus;

  // Auto-archive on ADM approval (Labastida #1 + #7)
  if (admStatus === 'approved') {
    project.isArchived = true;
    project.archivedAt = new Date();
    project.projectStatus = 'archived';

    // Notify team members of approval and archiving
    if (project.teamId?.members) {
      const Notification = (await import('../notifications/notification.model.js')).default;
      const { emitToUser } = await import('../notifications/notification.socket.js');
      const notifications = project.teamId.members.map((memberId) => ({
        userId: memberId,
        type: 'adm_approved',
        title: 'ADM Approved — Project Archived',
        message: `Congratulations! Your capstone project "${project.title}" has been approved by the panel and has been automatically archived.`,
        metadata: { projectId, admStatus: 'approved' },
      }));
      const inserted = await Notification.insertMany(notifications);
      inserted.forEach((n) => emitToUser(n.userId, 'notification:new', n));
    }
  }

  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `ADM status updated to "${admStatus}".`,
    data: { admStatus: project.admStatus, isArchived: project.isArchived },
  });
});

/** POST /api/projects/:projectId/action-done-matrix/:itemId/sign — Sign an ADM row item */
export const signADMItem = catchAsync(async (req, res) => {
  const { projectId, itemId } = req.params;
  const { signatureDataUrl } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ success: false, message: 'Project not found.' });
  }

  const item = project.actionDoneMatrix.id(itemId);
  if (!item) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ success: false, message: 'ADM row item not found.' });
  }

  // Prevent duplicate signatures from same user
  const alreadySigned = item.signatures.some((s) => String(s.userId) === String(req.user._id));
  if (alreadySigned) {
    return res
      .status(HTTP_STATUS.CONFLICT)
      .json({ success: false, message: 'You have already signed this ADM item.' });
  }

  const panelistAssignment = (project.panelists || []).find(
    (p) => String(p.userId) === String(req.user._id),
  );
  item.signatures.push({
    userId: req.user._id,
    name: `${req.user.firstName} ${req.user.lastName}`,
    role: panelistAssignment?.role || 'panel member',
    signedAt: new Date(),
    signatureDataUrl: signatureDataUrl || null,
  });

  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'ADM item signed successfully.',
    data: { item },
  });
});
