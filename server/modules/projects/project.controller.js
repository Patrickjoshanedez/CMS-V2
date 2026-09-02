import projectService from './project.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS, ROLES } from '@cms/shared';
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
  const project = await Project.findById(projectId)
    .select(
      'actionDoneMatrix admStatus admReviewType admSignatures capstoneCourse title adviserId panelistIds panelists teamId',
    )
    .populate('adviserId', 'firstName lastName email avatar')
    .populate('panelistIds', 'firstName lastName email avatar')
    .populate('panelists.userId', 'firstName lastName email avatar')
    .populate({
      path: 'teamId',
      populate: [
        { path: 'leaderId', select: 'firstName lastName email avatar' },
        { path: 'members', select: 'firstName lastName email avatar' },
        {
          path: 'sectionId',
          select: 'name code instructorId',
          populate: { path: 'instructorId', select: 'firstName lastName email avatar' },
        },
      ],
    });

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
      admReviewType: project.admReviewType || 'internal',
      admSignatures: project.admSignatures || {},
      capstoneCourse: project.capstoneCourse,
      title: project.title,
      adviser: project.adviserId,
      panelists: project.panelists,
      team: project.teamId,
    },
  });
});

/** PATCH /api/projects/:projectId/action-done-matrix/:itemId — Update single ADM item */
export const updateActionDoneMatrixItem = catchAsync(async (req, res) => {
  const { projectId, itemId } = req.params;
  const { actionDone, status, remarks, suggestion, panelName, pageNumbers, isLocked } = req.body;

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

  // Post-signature immutability rule:
  const isInstructor = req.user.role === ROLES.INSTRUCTOR;
  if (item.isLocked && !isInstructor) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'This ADM row is locked and cannot be modified.',
    });
  }

  // Role-gated field restrictions:
  const isStudent = req.user.role === ROLES.STUDENT;
  if (isStudent) {
    if (actionDone !== undefined) {
      item.actionDone = actionDone;
      if (actionDone.trim()) item.status = 'addressed';
    }
    if (status !== undefined && (status === 'addressed' || status === 'pending')) {
      item.status = status;
    }
    if (pageNumbers !== undefined) item.pageNumbers = pageNumbers;
    if (remarks !== undefined) item.remarks = remarks;
  } else {
    // Faculty / Panelist / Instructor
    if (actionDone !== undefined) item.actionDone = actionDone;
    if (pageNumbers !== undefined) item.pageNumbers = pageNumbers;
    if (suggestion !== undefined) item.suggestion = suggestion;
    if (panelName !== undefined) item.panelName = panelName;
    if (status !== undefined) item.status = status;
    if (remarks !== undefined) item.remarks = remarks;
    if (isLocked !== undefined && isInstructor) item.isLocked = isLocked;
  }

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

/** POST /api/projects/:projectId/action-done-matrix — Append row item */
export const createActionDoneMatrixItem = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { panelName, suggestion, expectedAction, actionDone, pageNumbers } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Project not found.',
    });
  }

  const newItem = {
    panelName: panelName || 'Panel Member',
    suggestion: suggestion || '',
    expectedAction: expectedAction || '',
    actionDone: actionDone || '',
    pageNumbers: pageNumbers || '',
    status: 'pending',
    signatures: [],
    isLocked: false,
  };

  project.actionDoneMatrix.push(newItem);
  if (project.admStatus === 'not_started') {
    project.admStatus = 'pending_developer_action';
  }

  await project.save();

  const addedItem = project.actionDoneMatrix[project.actionDoneMatrix.length - 1];

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'ADM item created.',
    data: {
      item: addedItem,
      actionDoneMatrix: project.actionDoneMatrix,
      admStatus: project.admStatus,
    },
  });
});

/** DELETE /api/projects/:projectId/action-done-matrix/:itemId — Remove row item */
export const deleteActionDoneMatrixItem = catchAsync(async (req, res) => {
  const { projectId, itemId } = req.params;

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

  if (item.isLocked && req.user.role !== ROLES.INSTRUCTOR) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Cannot delete a locked ADM row.',
    });
  }

  project.actionDoneMatrix.pull(itemId);
  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'ADM row removed successfully.',
    data: {
      actionDoneMatrix: project.actionDoneMatrix,
    },
  });
});

/** PATCH /api/projects/:projectId/adm-metadata — Update review type and title */
export const updateADMMetadata = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { admReviewType, title } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Project not found.',
    });
  }

  if (admReviewType !== undefined) {
    project.admReviewType = admReviewType;
  }
  if (title !== undefined && title.trim()) {
    project.title = title.trim();
  }

  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'ADM metadata updated.',
    data: {
      admReviewType: project.admReviewType,
      title: project.title,
    },
  });
});

/** POST /api/projects/:projectId/adm-signatures — Sign Tiered Signatories Board */
export const signTieredADM = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { tier, role, signatoryName, signatureDataUrl } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Project not found.',
    });
  }

  if (!project.admSignatures) {
    project.admSignatures = { adviser: {}, instructor: {}, panelists: [], chair: {} };
  }

  const name = signatoryName || `${req.user.firstName} ${req.user.lastName}`;
  const now = new Date();

  if (role === 'adviser' || (tier === 1 && req.user.role === ROLES.ADVISER)) {
    project.admSignatures.adviser = {
      signed: true,
      signedAt: now,
      signatoryName: name,
      signatureDataUrl: signatureDataUrl || null,
      userId: req.user._id,
    };
  } else if (role === 'instructor' || (tier === 1 && req.user.role === ROLES.INSTRUCTOR)) {
    project.admSignatures.instructor = {
      signed: true,
      signedAt: now,
      signatoryName: name,
      signatureDataUrl: signatureDataUrl || null,
      userId: req.user._id,
    };
  } else if (role === 'chair' || tier === 3) {
    project.admSignatures.chair = {
      signed: true,
      signedAt: now,
      signatoryName: name,
      signatureDataUrl: signatureDataUrl || null,
      userId: req.user._id,
    };
    // Chair sign-off freezes all rows
    project.actionDoneMatrix.forEach((item) => {
      item.isLocked = true;
      if (!item.signatures.some((s) => String(s.userId) === String(req.user._id))) {
        item.signatures.push({
          userId: req.user._id,
          name,
          role: 'chair',
          signedAt: now,
          signatureDataUrl: signatureDataUrl || null,
        });
      }
    });
    project.admStatus = 'approved';
  } else {
    // Panel Member (Tier 2)
    const existingIndex = project.admSignatures.panelists.findIndex(
      (p) => String(p.userId) === String(req.user._id),
    );
    const panelistEntry = {
      userId: req.user._id,
      role: 'Panel Member',
      signed: true,
      signedAt: now,
      signatoryName: name,
      signatureDataUrl: signatureDataUrl || null,
    };
    if (existingIndex >= 0) {
      project.admSignatures.panelists[existingIndex] = panelistEntry;
    } else {
      project.admSignatures.panelists.push(panelistEntry);
    }
  }

  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Signed ADM as ${role || 'signatory'}.`,
    data: {
      admSignatures: project.admSignatures,
      admStatus: project.admStatus,
      actionDoneMatrix: project.actionDoneMatrix,
    },
  });
});

/** POST /api/projects/:projectId/action-done-matrix/seed-institutional */
export const seedInstitutionalADM = catchAsync(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'Project not found.',
    });
  }

  // Institutional items from Project-Workspace-ADM.docx
  const institutionalRows = [
    {
      panelName: 'Louie Jay Labastida',
      suggestion:
        '- Approved capstones should be transferred to archive Automatically\n- do not require minimum of 3 submissions ("add more" and "done" button instead)\n- adviser and panel will be same account as faculty (and secretary).\n- identification of panel roles (chair, members, secretary(for the record,with notification))\n- do not delete data (archive only)\n- setting of plagiarism rate should be cascaded to faculty and students.\n- action done matrix should be incorporated (with complete signatories)\n- students should also be able to see comments and suggestions embedded in documents (name of suggester, highlight of concerned areas, google doc style)\n- Capstone 2: no documents involved so directly to action done matrix.\n- secretary account upload minutes, action done created directly from that.\n- editable/notification of justification will trigger only if late.\n- put algorithm and its justification in paper',
      actionDone:
        '- We fixed the workflow and automatically programmed it to archived approved manuscript\n- Replaced static sequential milestone checks with a flexible upload buffer. Students can upload chapters iteratively during their active session and click "Done" to package the submission batch\n- Refactored adviser, secretary and panel to be under "faculty account"\n- Consolidated disjointed schemas into a single, cohesive User model with a unified faculty role. Context-sensitive RBAC middleware dynamically calculates whether a user is an Adviser, Panelist, or Chair for a specific project\n- Explicitly mapped chairId, secretaryId, and memberIds within the Project schema to target dashboard alerts and fire contextual email notifications during evaluations\n- Enforced a system-wide soft-delete policy. All mutating controllers intercept deletion requests to toggle isDeleted: true instead of dropping rows from MongoDB\n- Centralized institutional similarity threshold policy via GET /api/settings and wired to a reactive Zustand store (settingsStore.js); dynamically cascades passing and warning cutoffs to student submission portals (for pre-upload transparency) and faculty evaluation sheets (for uniform, objective grading) so coordinator policy changes propagate in real time without redeployment\n- Extended the ADM sub-document schema to capture Base64 cryptographic drawing data URLs, locking rows once panelists sign their names on the evaluation canvas\n- Implemented page-specific annotation anchors. Faculty comments are mapped to normalized coordinates { x, y, width, height } and rendered dynamically over the PDF canvas\n- Refactored backend validation gates; if a project is identified as Capstone 2, the controller bypasses document upload validations and navigates the team straight to their ADM portal\n- Built an OCR minutes-parsing route that scans secretarial PDF/Word uploads using line-by-line regex splits to auto-populate compliance rows for each panel member\n- Configured pre-upload date comparisons against coordinator deadlines. If overdue, the UI locks and prompts the student to write a formal justification before progressing\n- Formally documented your dual-engine mathematics, detailing Rabin-Karp Winnowing footprints (exact matches) and PyTorch vector cosine similarity (semantic plagiarism)',
      pageNumbers: 'pp. 12-15',
      status: 'addressed',
      isLocked: false,
    },
    {
      panelName: 'Raul Lecaros',
      suggestion:
        '- majority of the core functionalities (FR1–FR3, FR6, FR8–FR10, FR12–FR17) have been successfully implemented and are operating as intended.\n- For FR4, it was agreed that the documentation must be updated to reflect a maximum of four members per capstone group instead of three, with an accompanying justification. Additionally, interface improvements were suggested, including repositioning the lock notification to the top and introducing color-coded indicators (red for locked and green for opened) to enhance user clarity.\n- For FR5, the header "capstone type" will be revised to "IT Field of Discipline" to ensure proper terminology alignment.\n- FR7 requires enhancement by removing the hard-coded Google Doc link and enabling instructors to configure this dynamically within the system.\n- FR11 was noted as partially met; while the functionality is available on the student side, the GitHub repository link must also be made visible on the adviser\'s interface to ensure transparency and monitoring.\n- FRAD1, FRAD5, FRAD6, and FRAD7 were confirmed as fully implemented.\n- FRAD2, however, remains partially complete, as it requires the display of team member names on the adviser\'s view, specifically positioned on the right side of the interface.\n- It was also agreed that FRAD3 and FRAD4 should be removed from the adviser functional requirements, as attaching minutes of the system proposal does not align with the intended scope.\n- For the panel requirements (FRPA01–FRPA07), all functionalities were confirmed as fully met\n- FRINS1, FRINS3–FRINS5, FRINS7 meets expectations. Minor adjustments were identified, including replacing the trash icon with an archive function (FRINS2) to better reflect intended usage and data retention practices.\n- Additionally, FRINS6 remains incomplete, as it requires the inclusion of an Evaluation Report and a Plagiarism Report for each study, which are essential for academic assessment and integrity.',
      actionDone:
        '- Updated shared validation schemas (teamSchema.js) and database models to support a maximum group size of exactly 4 members.\n- Placed a viewport-fixed, absolute-top banner card showing dynamic color states: emerald-green for open edit windows and crimson-red for locked milestones\n- Conducted global client-side string refactoring to display "IT Field of Discipline" on all tables, grids, and filters\n- Replaced hardcoded links with a database-backed DocumentTemplate collection managed dynamically from the coordinator\'s admin panel.\n- Expanded backend query outputs to pass team GitHub URLs directly to the Adviser interface as clickable badges on student cards.\n- Developed a sticky sidebar docked to the right viewport margin, displaying proponent profiles, traditional roles, and titles.\n- Completely removed the redundant proposal minutes file-upload components and routes from student views.\n- Exchanged destructive "trash bin" delete UI buttons for non-destructive, safe Lucide Archive actions.\n- Revised Implementation: Built a server-side PDF compiler that generates downloadable academic assessment packages detailing score rubrics and similarity scores.',
      pageNumbers: 'pp. 18-24',
      status: 'addressed',
      isLocked: false,
    },
    {
      panelName: 'Joseph Abella',
      suggestion:
        '- results should be seen only once details are filled in.\n- User should be able to read the full paper if project is archived, details should not be visible (direct to whole paper).\n- tabs: plagiarism vs similarity should be definite.\n- proposal should be able to be submitted, but should be flagged.\n- per session submission list',
      actionDone:
        '- Wrapped student-facing scoring endpoints behind custom validation middleware that returns an evaluation-incomplete warning until all assigned panelists submit their scores.\n- Guest search clicks bypass details blocks and route straight to a clean PDF viewer streaming raw approved manuscripts directly from MiniIO.\n- Decoupled the plagiarism workspace into two clearly separated frontend tabs: "Exact Match Similarity" (Winnowing text overlaps) and "Conceptual Plagiarism" (PyTorch embeddings)\n- Allowed proposal uploads to proceed even with missing metadata fields, marking the project with a warning badge (isFlagged: true) without throwing validation errors\n- Added an ephemeral React state hook that caches and displays a historical log of all uploads completed during the active browser session',
      pageNumbers: 'pp. 26-29',
      status: 'addressed',
      isLocked: false,
    },
    {
      panelName: 'Dr. Sales G. Aribe Jr.',
      suggestion:
        '- Request: template redesignable/restructurable (instructor side).\n- light mode theme, bigger font size.\n- date of submission of deliverables should be settable.\n- scheduling upload (calendar implementation).\n- consultation module (optional)',
      actionDone:
        '- Built a dynamic rubric builder form allowing coordinators to create, configure, and reorder evaluation criteria on the fly\n- Integrated a global theme toggle paired with font scaling multipliers supporting viewport-fixed CSS baseline scaling up to 20px (A+ ± 2).\n- Built administrative calendar route controls allowing coordinators to dynamically lock portals at exact times.\n- Integrated an interactive monthly scheduler grid displaying active hearings, defense times, and section locks on a color-coded grid\n- Developed a Consultation module and database collection allowing student teams to schedule appointment slots and track advisory progress logs',
      pageNumbers: 'pp. 31-35',
      status: 'addressed',
      isLocked: false,
    },
  ];

  project.actionDoneMatrix = institutionalRows;
  project.admStatus = 'pending_developer_action';
  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Institutional ADM template loaded successfully.',
    data: {
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
  const userRole =
    panelistAssignment?.role || (req.user.facultyRole === 'chair' ? 'chair' : 'panel member');
  item.signatures.push({
    userId: req.user._id,
    name: `${req.user.firstName} ${req.user.lastName}`,
    role: userRole,
    signedAt: new Date(),
    signatureDataUrl: signatureDataUrl || null,
  });

  // Auto-Archiving Trigger (FR-4.5)
  // When the Panel Chair signs off on the final ADM row (or all rows have chair signatures)
  const isChair =
    userRole === 'chair' ||
    userRole === 'panel chair' ||
    userRole === 'lead_panelist' ||
    panelistAssignment?.role === 'chair';

  const isFinalRow =
    project.actionDoneMatrix.length > 0 &&
    String(project.actionDoneMatrix[project.actionDoneMatrix.length - 1]._id) === String(itemId);

  const allRowsSignedByChair = project.actionDoneMatrix.every((row) =>
    row.signatures.some(
      (s) =>
        s.role === 'chair' ||
        s.role === 'panel chair' ||
        s.role === 'lead_panelist' ||
        String(s.userId) === String(req.user._id),
    ),
  );

  if ((isChair && isFinalRow) || (isChair && allRowsSignedByChair)) {
    project.admStatus = 'approved';
    project.isArchived = true;
    project.archivedAt = new Date();
    project.projectStatus = 'archived';

    // Notify team members of auto-archiving
    await project.populate('teamId');
    if (project.teamId?.members) {
      const Notification = (await import('../notifications/notification.model.js')).default;
      const { emitToUser } = await import('../../services/socket.service.js');
      const notifications = project.teamId.members.map((memberId) => ({
        userId: memberId,
        type: 'project_archived',
        title: 'ADM Approved — Project Archived',
        message: `Congratulations! Your capstone project "${project.title}" has been signed off by the Panel Chair and automatically archived.`,
        metadata: { projectId, admStatus: 'approved' },
      }));
      const inserted = await Notification.insertMany(notifications);
      inserted.forEach((n) => emitToUser(n.userId, 'notification:new', n));
    }
  }

  await project.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'ADM item signed successfully.',
    data: { item, projectStatus: project.projectStatus, isArchived: project.isArchived },
  });
});
