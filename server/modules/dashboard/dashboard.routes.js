/**
 * Dashboard routes — role-aware dashboard endpoints.
 * All routes require authentication.
 */
import { Router } from 'express';
import {
  getStats,
  getAdviserWorkload,
  getAdviserAnalytics,
  getPanelistTopics,
  selectPanelistTopic,
  getInstructorKpis,
  getInstructorWorkload,
  optimizeInstructorWorkload,
} from './dashboard.controller.js';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import { ROLES } from '@cms/shared';

const router = Router();

// General dashboard stats for all authenticated users
router.get('/stats', authenticate, getStats);

/* ════════ PHASE 2: Adviser Dashboard Routes ════════ */

// Adviser-only: detailed workload tracking
router.get('/adviser/workload', authenticate, authorize(ROLES.ADVISER), getAdviserWorkload);

// Adviser-only: review analytics
router.get('/adviser/analytics', authenticate, authorize(ROLES.ADVISER), getAdviserAnalytics);

/* ════════ PHASE 3: Panelist Dashboard Routes ════════ */

router.get('/panelist/topics', authenticate, authorize(ROLES.PANELIST), getPanelistTopics);

router.post(
  '/panelist/topics/:projectId/select',
  authenticate,
  authorize(ROLES.PANELIST),
  selectPanelistTopic,
);

/* ════════ PHASE 4: Instructor Command Center Routes ════════ */

router.get('/instructor/kpis', authenticate, authorize(ROLES.INSTRUCTOR), getInstructorKpis);

router.get(
  '/instructor/workload',
  authenticate,
  authorize(ROLES.INSTRUCTOR),
  getInstructorWorkload,
);

router.post(
  '/instructor/optimize',
  authenticate,
  authorize(ROLES.INSTRUCTOR),
  optimizeInstructorWorkload,
);

export default router;
