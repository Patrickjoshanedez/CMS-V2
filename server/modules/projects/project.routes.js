import { Router } from 'express';
import * as projectController from './project.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import upload, { prototypeUpload, archiveDualUpload } from '../../middleware/upload.js';
import validateFile from '../../middleware/fileValidation.js';
import {
  validatePrototypeFile,
  validateDualArchiveFiles,
} from '../../middleware/fileValidation.js';
import auditLog from '../../middleware/auditLog.js';
import checkTitleLock from '../../middleware/checkTitleLock.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { ROLES } from '@cms/shared';
import {
  createProjectSchema,
  checkTitleSimilaritySchema,
  saveCreateProjectDraftSchema,
  updateTitleSchema,
  submitTitleSchema,
  approveTitleSchema,
  rejectTitleSchema,
  addTitleCommentSchema,
  requestTitleModificationSchema,
  resolveTitleModificationSchema,
  assignAdviserSchema,
  assignPanelistSchema,
  removePanelistSchema,
  setDeadlinesSchema,
  rejectProjectSchema,
  listProjectsQuerySchema,
  advancePhaseSchema,
  addPrototypeLinkSchema,
  addPrototypeMediaSchema,
  removePrototypeSchema,
  archiveProjectSchema,
  searchArchiveQuerySchema,
  reportQuerySchema,
  bulkUploadSchema,
  updateGanttChartUrlSchema,
  updateDemoVideoUrlSchema,
} from './project.validation.js';

const router = Router();

/**
 * Project routes — /api/projects
 * All routes require authentication.
 */
router.use(authenticate);

// Similarity scan
router.post('/similarity-scan', projectController.checkProposalSimilarity);

// Create-project draft persistence (authenticated user)
router.get('/create-draft', projectController.getCreateProjectDraft);
router.put(
  '/create-draft',
  validate(saveCreateProjectDraftSchema),
  projectController.saveCreateProjectDraft,
);
router.delete('/create-draft', projectController.clearCreateProjectDraft);

/* ────── Student routes ────── */

// Create a project (team leader only)
router.post(
  '/',
  authorize(ROLES.STUDENT),
  validate(createProjectSchema),
  auditLog('project.created', 'Project', {
    getTargetId: (_req, body) => body?.data?._id,
    getDescription: (req) => `Created project "${req.body.title}"`,
  }),
  projectController.createProject,
);

// Get my team's project
router.get('/me', authorize(ROLES.STUDENT), projectController.getMyProject);

/* ────── Archive & Reporting routes (before /:id catch-all) ────── */

// Search the archive (any authenticated user)
router.get(
  '/archive/search',
  validate(searchArchiveQuerySchema, 'query'),
  projectController.searchArchive,
);

// Generate reports (Instructor only)
router.get(
  '/reports',
  authorize(ROLES.INSTRUCTOR),
  validate(reportQuerySchema, 'query'),
  projectController.generateReport,
);

// Bulk-upload archived capstone bundle (Instructor only)
router.post(
  '/archive/bulk',
  authorize(ROLES.INSTRUCTOR),
  uploadLimiter,
  archiveDualUpload.fields([
    { name: 'academicPaperFile', maxCount: 1 },
    { name: 'academicJournalFile', maxCount: 1 },
  ]),
  validateDualArchiveFiles,
  validate(bulkUploadSchema),
  auditLog('project.bulk_uploaded', 'Project', {
    getDescription: (req) => `Bulk-uploaded archived capstone bundle: "${req.body.title}"`,
    getMetadata: (req) => ({ title: req.body.title, academicYear: req.body.academicYear }),
  }),
  projectController.bulkUploadArchive,
);

// Real-time title similarity check (any authenticated user)
router.post(
  '/title-check',
  validate(checkTitleSimilaritySchema),
  projectController.checkTitleSimilarity,
);

// Update title/abstract/keywords (draft stage, team leader)
router.patch(
  '/:id/title',
  authorize(ROLES.STUDENT),
  checkTitleLock,
  validate(updateTitleSchema),
  auditLog('project.title_updated', 'Project', {
    getDescription: (req) => `Updated project title details for project ${req.params.id}`,
    getMetadata: (req) => ({
      hasTitle: typeof req.body.title === 'string',
      hasAbstract: typeof req.body.abstract === 'string',
      hasKeywords: Array.isArray(req.body.keywords),
    }),
  }),
  projectController.updateTitle,
);

// Submit title for approval (team leader)
router.post(
  '/:id/title/submit',
  authorize(ROLES.STUDENT),
  validate(submitTitleSchema),
  auditLog('project.title_submitted', 'Project', {
    getDescription: (req) => `Submitted project title for approval: ${req.params.id}`,
  }),
  projectController.submitTitle,
);

// Revise & resubmit title after revision-required (team leader)
router.patch(
  '/:id/title/revise',
  authorize(ROLES.STUDENT),
  checkTitleLock,
  validate(updateTitleSchema),
  auditLog('project.title_revised', 'Project', {
    getDescription: (req) => `Revised and resubmitted project title for project ${req.params.id}`,
  }),
  projectController.reviseAndResubmit,
);

// Request title modification (after approval, team leader)
router.post(
  '/:id/title/modification',
  authorize(ROLES.STUDENT),
  validate(requestTitleModificationSchema),
  auditLog('project.title_modification_requested', 'Project', {
    getDescription: (req) => `Requested title modification for project ${req.params.id}`,
    getMetadata: (req) => ({
      hasProposedTitle: typeof req.body.proposedTitle === 'string',
      hasReason: typeof req.body.reason === 'string',
    }),
  }),
  projectController.requestTitleModification,
);

// Update Gantt chart URL (team member)
router.patch(
  '/:id/gantt-chart',
  authorize(ROLES.STUDENT),
  validate(updateGanttChartUrlSchema),
  auditLog('project.gantt_chart_updated', 'Project', {
    getDescription: (req) => `Updated Gantt chart URL for project ${req.params.id}`,
  }),
  projectController.updateGanttChartUrl,
);

// Update Demo video URL (team member)
router.patch(
  '/:id/demo-video',
  authorize(ROLES.STUDENT),
  validate(updateDemoVideoUrlSchema),
  auditLog('project.demo_video_updated', 'Project', {
    getDescription: (req) => `Updated Demo video URL for project ${req.params.id}`,
  }),
  projectController.updateDemoVideoUrl,
);

// Add a prototype link (team member, Capstone 2 & 3)
router.post(
  '/:id/prototypes/link',
  authorize(ROLES.STUDENT),
  validate(addPrototypeLinkSchema),
  projectController.addPrototypeLink,
);

// Upload prototype media — image or video (team member, Capstone 2 & 3)
router.post(
  '/:id/prototypes/media',
  authorize(ROLES.STUDENT),
  uploadLimiter,
  prototypeUpload.single('file'),
  validatePrototypeFile,
  validate(addPrototypeMediaSchema),
  projectController.addPrototypeMedia,
);

// Remove a prototype (team member)
router.delete(
  '/:id/prototypes/:prototypeId',
  authorize(ROLES.STUDENT),
  projectController.removePrototype,
);

/* ────── Instructor routes ────── */

// Comment on a title proposal
router.post(
  '/:id/title-proposals/:proposalId/comments',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST),
  validate(addTitleCommentSchema),
  auditLog('project.title_proposal_commented', 'Project', {
    getDescription: (req) => `Added comment to title proposal in project ${req.params.id}`,
  }),
  projectController.addTitleComment,
);

// Approve a submitted title
router.post(
  '/:id/title/approve',
  authorize(ROLES.INSTRUCTOR),
  validate(approveTitleSchema),
  auditLog('project.title_approved', 'Project', {
    getDescription: (req) => `Approved title for project ${req.params.id}`,
  }),
  projectController.approveTitle,
);

// Reject a submitted title (send back for revision)
router.post(
  '/:id/title/reject',
  authorize(ROLES.INSTRUCTOR),
  validate(rejectTitleSchema),
  auditLog('project.title_rejected', 'Project', {
    getDescription: (req) => `Rejected title for project ${req.params.id}`,
    getMetadata: (req) => ({ reason: req.body.feedback }),
  }),
  projectController.rejectTitle,
);

// Resolve a title modification request (approve or deny)
router.post(
  '/:id/title/modification/resolve',
  authorize(ROLES.INSTRUCTOR),
  validate(resolveTitleModificationSchema),
  auditLog('project.title_modification_resolved', 'Project', {
    getDescription: (req) => `Resolved title modification for project ${req.params.id}`,
    getMetadata: (req) => ({ action: req.body.action }),
  }),
  projectController.resolveTitleModification,
);

// Assign an adviser to a project
router.post(
  '/:id/adviser',
  authorize(ROLES.INSTRUCTOR),
  validate(assignAdviserSchema),
  auditLog('project.adviser_assigned', 'Project', {
    getDescription: (req) => `Assigned adviser ${req.body.adviserId} to project ${req.params.id}`,
    getMetadata: (req) => ({ adviserId: req.body.adviserId }),
  }),
  projectController.assignAdviser,
);

// Assign a panelist to a project
router.post(
  '/:id/panelists',
  authorize(ROLES.INSTRUCTOR),
  validate(assignPanelistSchema),
  auditLog('project.panelist_assigned', 'Project', {
    getDescription: (req) => `Assigned panelist ${req.body.panelistId} to project ${req.params.id}`,
    getMetadata: (req) => ({ panelistId: req.body.panelistId }),
  }),
  projectController.assignPanelist,
);

// Remove a panelist from a project
router.delete(
  '/:id/panelists',
  authorize(ROLES.INSTRUCTOR),
  validate(removePanelistSchema),
  auditLog('project.panelist_removed', 'Project', {
    getDescription: (req) => `Removed panelist from project ${req.params.id}`,
    getMetadata: (req) => ({ panelistId: req.body.panelistId }),
  }),
  projectController.removePanelist,
);

// Set chapter/proposal deadlines
router.patch(
  '/:id/deadlines',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER),
  validate(setDeadlinesSchema),
  auditLog('project.deadlines_updated', 'Project', {
    getDescription: (req) => `Updated deadlines for project ${req.params.id}`,
  }),
  projectController.setDeadlines,
);

// Reject entire project
router.post(
  '/:id/reject',
  authorize(ROLES.INSTRUCTOR),
  validate(rejectProjectSchema),
  auditLog('project.rejected', 'Project', {
    getDescription: (req) => `Rejected project ${req.params.id}`,
    getMetadata: (req) => ({ reason: req.body.reason }),
  }),
  projectController.rejectProject,
);

// Advance capstone phase (Instructor only)
router.post(
  '/:id/advance-phase',
  authorize(ROLES.INSTRUCTOR),
  validate(advancePhaseSchema),
  auditLog('project.phase_advanced', 'Project', {
    getDescription: (req) => `Advanced phase for project ${req.params.id}`,
    getMetadata: (req) => ({ targetPhase: req.body.targetPhase }),
  }),
  projectController.advancePhase,
);

// Archive a project (Instructor only)
router.post(
  '/:id/archive',
  authorize(ROLES.INSTRUCTOR),
  validate(archiveProjectSchema),
  auditLog('project.archived', 'Project', {
    getDescription: (req) => `Archived project ${req.params.id}`,
  }),
  projectController.archiveProject,
);

// Upload completion certificate (Instructor only)
router.post(
  '/:id/certificate',
  authorize(ROLES.INSTRUCTOR),
  uploadLimiter,
  upload.single('file'),
  validateFile,
  auditLog('project.certificate_uploaded', 'Project', {
    getDescription: (req) => `Uploaded completion certificate for project ${req.params.id}`,
  }),
  projectController.uploadCertificate,
);

// Get certificate download link (any authenticated user)
router.get('/:id/certificate', projectController.getCertificateUrl);

/* ────── Panelist routes ────── */

// Panelist self-selects into a project
router.post(
  '/:id/panelists/select',
  authorize(ROLES.PANELIST),
  auditLog('project.panelist_self_selected', 'Project', {
    getDescription: (req) => `Panelist self-selected into project ${req.params.id}`,
  }),
  projectController.selectAsPanelist,
);

/* ────── Faculty shared routes ────── */

// Get a single project (any authenticated faculty or the owning team)
router.get(
  '/:id',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST, ROLES.STUDENT),
  projectController.getProject,
);

// List prototypes for a project (any authenticated user)
router.get('/:id/prototypes', projectController.getPrototypes);

// List all projects with filters/pagination
router.get(
  '/',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST),
  validate(listProjectsQuerySchema, 'query'),
  projectController.listProjects,
);

export default router;
