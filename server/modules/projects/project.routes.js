import { Router } from 'express';
import * as projectController from './project.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import { ROLES } from '@cms/shared';
import {
  createProjectSchema,
  updateTitleSchema,
  submitTitleSchema,
  approveTitleSchema,
  rejectTitleSchema,
  requestTitleModificationSchema,
  resolveTitleModificationSchema,
  assignAdviserSchema,
  assignPanelistSchema,
  removePanelistSchema,
  setDeadlinesSchema,
  rejectProjectSchema,
  listProjectsQuerySchema,
} from './project.validation.js';

const router = Router();

/**
 * Project routes — /api/projects
 * All routes require authentication.
 */
router.use(authenticate);

/* ────── Student routes ────── */

// Create a project (team leader only)
router.post(
  '/',
  authorize(ROLES.STUDENT),
  validate(createProjectSchema),
  projectController.createProject,
);

// Get my team's project
router.get('/me', authorize(ROLES.STUDENT), projectController.getMyProject);

// Update title/abstract/keywords (draft stage, team leader)
router.patch(
  '/:id/title',
  authorize(ROLES.STUDENT),
  validate(updateTitleSchema),
  projectController.updateTitle,
);

// Submit title for approval (team leader)
router.post(
  '/:id/title/submit',
  authorize(ROLES.STUDENT),
  validate(submitTitleSchema),
  projectController.submitTitle,
);

// Revise & resubmit title after revision-required (team leader)
router.patch(
  '/:id/title/revise',
  authorize(ROLES.STUDENT),
  validate(updateTitleSchema),
  projectController.reviseAndResubmit,
);

// Request title modification (after approval, team leader)
router.post(
  '/:id/title/modification',
  authorize(ROLES.STUDENT),
  validate(requestTitleModificationSchema),
  projectController.requestTitleModification,
);

/* ────── Instructor routes ────── */

// Approve a submitted title
router.post(
  '/:id/title/approve',
  authorize(ROLES.INSTRUCTOR),
  validate(approveTitleSchema),
  projectController.approveTitle,
);

// Reject a submitted title (send back for revision)
router.post(
  '/:id/title/reject',
  authorize(ROLES.INSTRUCTOR),
  validate(rejectTitleSchema),
  projectController.rejectTitle,
);

// Resolve a title modification request (approve or deny)
router.post(
  '/:id/title/modification/resolve',
  authorize(ROLES.INSTRUCTOR),
  validate(resolveTitleModificationSchema),
  projectController.resolveTitleModification,
);

// Assign an adviser to a project
router.post(
  '/:id/adviser',
  authorize(ROLES.INSTRUCTOR),
  validate(assignAdviserSchema),
  projectController.assignAdviser,
);

// Assign a panelist to a project
router.post(
  '/:id/panelists',
  authorize(ROLES.INSTRUCTOR),
  validate(assignPanelistSchema),
  projectController.assignPanelist,
);

// Remove a panelist from a project
router.delete(
  '/:id/panelists',
  authorize(ROLES.INSTRUCTOR),
  validate(removePanelistSchema),
  projectController.removePanelist,
);

// Set chapter/proposal deadlines
router.patch(
  '/:id/deadlines',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER),
  validate(setDeadlinesSchema),
  projectController.setDeadlines,
);

// Reject entire project
router.post(
  '/:id/reject',
  authorize(ROLES.INSTRUCTOR),
  validate(rejectProjectSchema),
  projectController.rejectProject,
);

/* ────── Panelist routes ────── */

// Panelist self-selects into a project
router.post('/:id/panelists/select', authorize(ROLES.PANELIST), projectController.selectAsPanelist);

/* ────── Faculty shared routes ────── */

// Get a single project (any authenticated faculty or the owning team)
router.get('/:id', projectController.getProject);

// List all projects with filters/pagination
router.get(
  '/',
  authorize(ROLES.INSTRUCTOR, ROLES.ADVISER, ROLES.PANELIST),
  validate(listProjectsQuerySchema, 'query'),
  projectController.listProjects,
);

export default router;
