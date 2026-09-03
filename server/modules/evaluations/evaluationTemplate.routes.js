import express from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import { ROLES } from '@cms/shared';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getDefaultTemplate,
} from './evaluationTemplate.controller.js';

const router = express.Router();

router.use(authenticate);

// Default template lookup — available to all authenticated users
router.get('/default/:defenseType', getDefaultTemplate);

// CRUD — instructor only
router.get('/', listTemplates);
router.get('/:id', getTemplate);
router.post('/', authorize(ROLES.INSTRUCTOR), createTemplate);
router.patch('/:id', authorize(ROLES.INSTRUCTOR), updateTemplate);
router.delete('/:id', authorize(ROLES.INSTRUCTOR), deleteTemplate);

export default router;
