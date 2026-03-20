import { Router } from 'express';

import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import { ROLES } from '@cms/shared';

import * as agentRuntimeController from './agentRuntime.controller.js';

const router = Router();

router.use(authenticate, authorize(ROLES.INSTRUCTOR));

router.get('/', agentRuntimeController.getRuntimeProfile);
router.post('/reload', agentRuntimeController.reloadRuntimeProfile);
router.post('/activate', agentRuntimeController.activateRuntimeProfile);
router.post('/rollback', agentRuntimeController.rollbackRuntimeProfile);

export default router;
