import projectService from './project.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { HTTP_STATUS } from '@cms/shared';
import {
  calculateProposalSimilarity,
  extractMatchingKeywords,
  tokenize,
} from '../../utils/proposalSimilarity.js';
import { checkOriginality } from '../../services/plagiarism.service.js';
import Project from './project.model.js';

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
      const similarity = calculateProposalSimilarity(tokenizedProjectInput, p);

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
  const { project } = await projectService.approveTitle(req.params.id, req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Title approved.',
    data: { project },
  });
});

/** POST /api/projects/:id/title/reject — Reject a submitted title */
export const rejectTitle = catchAsync(async (req, res) => {
  const { project } = await projectService.rejectTitle(req.params.id, req.user._id, req.body);

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
    req.user._id,
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
