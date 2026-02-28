/**
 * Dashboard routes — GET /api/dashboard/stats
 * All routes require authentication.
 */
import { Router } from 'express';
import { getStats } from './dashboard.controller.js';
import authenticate from '../../middleware/authenticate.js';

const router = Router();

router.get('/stats', authenticate, getStats);

export default router;
