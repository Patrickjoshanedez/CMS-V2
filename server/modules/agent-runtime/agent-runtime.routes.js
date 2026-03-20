import express from 'express';
import agentRuntimeConfigService from '../../services/agentRuntimeConfig.service.js';
import { createLogger } from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';

const router = express.Router();
const logger = createLogger('AgentRuntimeRoutes');

/**
 * Agent Runtime API Routes
 *
 * These endpoints allow authorized admins to:
 * - View active runtime profile
 * - Check feature flags
 * - Switch profiles
 * - Rollback to previous profile
 * - Access debug information
 *
 * Access Control:
 * - instructor+ role required for all endpoints
 * - All actions are logged
 */

/**
 * GET /api/agent-runtime
 * Get current active profile and status
 * @requires instructor+ role
 */
router.get('/', authenticate, authorize('instructor'), async (req, res, next) => {
  try {
    const { profile, source, metadata } = await agentRuntimeConfigService.getActiveProfile();

    logger.info('Active profile retrieved', {
      userId: req.user?.id,
      profileId: profile.id,
      source,
    });

    res.json({
      success: true,
      data: {
        activeProfile: {
          id: profile.id,
          version: profile.version,
          status: profile.status,
          expiresAt: profile.expiresAt,
        },
        source,
        metadata,
      },
    });
  } catch (error) {
    logger.error('Error retrieving active profile', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/agent-runtime/debug/config
 * Dump effective configuration (for debugging)
 * Shows current settings with overrides applied
 * @requires instructor+ role
 */
router.get('/debug/config', authenticate, authorize('instructor'), async (req, res, next) => {
  try {
    const effectiveConfig = await agentRuntimeConfigService.getEffectiveConfig();

    logger.debug('Effective config dumped', {
      userId: req.user?.id,
      profileId: effectiveConfig.activeProfileId,
    });

    res.json({
      success: true,
      data: effectiveConfig,
    });
  } catch (error) {
    logger.error('Error dumping effective config', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/agent-runtime/debug/validate
 * Validate that active profile is being used and is valid
 * Returns detailed validation results
 * @requires instructor+ role
 */
router.get('/debug/validate', authenticate, authorize('instructor'), async (req, res, next) => {
  try {
    const { profile, source, metadata } = await agentRuntimeConfigService.getActiveProfile();

    const validation = {
      activeProfileId: profile.id,
      source,
      isValid: profile.status === 'active',
      hasExpired: profile.expiresAt && new Date(profile.expiresAt) < new Date(),
      loadedAt: metadata.loadedAt,
      cacheStatus: source === 'cache' ? 'cached' : 'fresh',
      fallbackAvailable: agentRuntimeConfigService.lastKnownGood !== null,
    };

    logger.info('Profile validation check', {
      userId: req.user?.id,
      ...validation,
    });

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Error validating profile', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/agent-runtime/features/:featureName
 * Check if a feature is enabled and get its configuration
 * @param {string} featureName - e.g., 'course_creation', 'advanced_quizzes'
 * @requires instructor+ role
 */
router.get(
  '/features/:featureName',
  authenticate,
  authorize('instructor'),
  async (req, res, next) => {
    try {
      const { featureName } = req.params;

      const config = await agentRuntimeConfigService.getFeatureConfig(featureName);

      logger.debug('Feature config retrieved', {
        userId: req.user?.id,
        featureName,
        enabled: config.enabled,
      });

      res.json({
        success: true,
        data: {
          featureName,
          enabled: config.enabled,
          config,
        },
      });
    } catch (error) {
      logger.error('Error retrieving feature config', { error: error.message });
      next(error);
    }
  },
);

/**
 * POST /api/agent-runtime/switch
 * Switch to a different active profile
 * @body { profileId: string }
 * @requires instructor+ role
 */
router.post('/switch', authenticate, authorize('instructor'), async (req, res, next) => {
  try {
    const { profileId } = req.body;

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'profileId is required (string)',
        },
      });
    }

    try {
      const previousProfile = await agentRuntimeConfigService.getActiveProfileKey();
      await agentRuntimeConfigService.activateProfile(profileId);
      const newProfile = await agentRuntimeConfigService.getActiveProfileKey();

      logger.info('Profile switched successfully', {
        userId: req.user?.id,
        previousProfile,
        newProfile,
      });

      res.json({
        success: true,
        data: {
          previousProfile,
          newProfile,
        },
      });
    } catch (error) {
      logger.warn('Profile switch failed', {
        userId: req.user?.id,
        targetProfileId: profileId,
        reason: error.code,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: error.code || 'ACTIVATION_FAILED',
          message: error.message || 'Failed to switch profile',
        },
      });
    }
  } catch (error) {
    logger.error('Error switching profile', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/agent-runtime/rollback
 * Rollback to previous active profile (if available)
 * @body { reason?: string }
 * @requires instructor+ role
 */
router.post('/rollback', authenticate, authorize('instructor'), async (req, res, next) => {
  try {
    const { reason = 'manual' } = req.body;

    try {
      const currentProfile = await agentRuntimeConfigService.getActiveProfileKey();
      const previousProfile = await agentRuntimeConfigService.rollbackProfile();

      logger.info('Rollback completed', {
        userId: req.user?.id,
        from: currentProfile,
        to: previousProfile,
        reason,
      });

      res.json({
        success: true,
        data: {
          previousProfile: currentProfile,
          currentProfile: previousProfile,
          reason,
        },
      });
    } catch (error) {
      logger.warn('Rollback failed', {
        userId: req.user?.id,
        reason: error.message,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: error.code || 'ROLLBACK_FAILED',
          message: error.message || 'Failed to rollback profile',
        },
      });
    }
  } catch (error) {
    logger.error('Error during rollback', { error: error.message });
    next(error);
  }
});

export default router;
