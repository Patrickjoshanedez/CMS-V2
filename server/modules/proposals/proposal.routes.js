import { Router } from 'express';
import { ROLES } from '@cms/shared';
import authorize from '../../middleware/authorize.js';
import validate from '../../middleware/validate.js';
import * as proposalController from './proposal.controller.js';
import { generateDeckSchema } from './proposal.validation.js';

const router = Router();

router.post(
  '/generate-deck',
  authorize(ROLES.STUDENT),
  validate(generateDeckSchema),
  proposalController.generateDeck,
);

export default router;