import { Router } from 'express';
import * as projectController from './project.controller.js';
import authorize, { authorizeSecretaryCapability } from '../../middleware/authorize.js';
import { ROLES, SECRETARY_CAPABILITIES } from '@cms/shared';

const router = Router();

// GET /api/adm/:projectId — Retrieve ADM rows and committee details
router.get(
  '/:projectId',
  authorize(ROLES.INSTRUCTOR, ROLES.FACULTY, ROLES.STUDENT),
  projectController.getActionDoneMatrix,
);

// POST /api/adm/:projectId/rows — Append new row
router.post(
  '/:projectId/rows',
  authorize(ROLES.INSTRUCTOR, ROLES.FACULTY, ROLES.STUDENT),
  projectController.createActionDoneMatrixItem,
);

// PATCH /api/adm/:projectId/rows/:itemId — Granular atomic patch
router.patch(
  '/:projectId/rows/:itemId',
  authorize(ROLES.INSTRUCTOR, ROLES.FACULTY, ROLES.STUDENT),
  projectController.updateActionDoneMatrixItem,
);

// DELETE /api/adm/:projectId/rows/:itemId — Delete row
router.delete(
  '/:projectId/rows/:itemId',
  authorize(ROLES.INSTRUCTOR, ROLES.FACULTY, ROLES.STUDENT),
  projectController.deleteActionDoneMatrixItem,
);

// POST /api/adm/:projectId/rows/:itemId/sign — Sign row
router.post(
  '/:projectId/rows/:itemId/sign',
  authorize(ROLES.INSTRUCTOR, ROLES.FACULTY),
  projectController.signADMItem,
);

// POST /api/adm/:projectId/signatures — Tiered Signatories Board sign-off
router.post(
  '/:projectId/signatures',
  authorize(ROLES.INSTRUCTOR, ROLES.FACULTY),
  projectController.signTieredADM,
);

// POST /api/adm/:projectId/endorse — Committee Secretary reviews & endorses completed ADM
router.post(
  '/:projectId/endorse',
  authorizeSecretaryCapability(SECRETARY_CAPABILITIES.MATRIX_ENDORSE),
  projectController.endorseADMBySecretary,
);

// POST /api/adm/:projectId/submit-for-endorsement — Student team submits ADM for Secretary review
router.post(
  '/:projectId/submit-for-endorsement',
  authorize(ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.FACULTY),
  projectController.submitADMForEndorsement,
);

// PATCH /api/adm/:projectId/metadata — Update review type and title
router.patch(
  '/:projectId/metadata',
  authorize(ROLES.INSTRUCTOR, ROLES.FACULTY, ROLES.STUDENT),
  projectController.updateADMMetadata,
);

export default router;
