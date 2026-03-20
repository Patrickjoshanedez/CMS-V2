import agentRuntimeConfigService from './agentRuntimeConfig.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AgentDecisionIntegration');

/**
 * Agent Decision Integration Service
 *
 * Bridges runtime configuration into actual agent execution decisions.
 * Demonstrates:
 * - Getting a setting from runtime config (with fallback)
 * - Logging decision source (static vs dynamic)
 * - Guarded rollout with feature flag
 * - Confidence threshold enforcement
 *
 * This is the PILOT example that shows how to integrate runtime config
 * into actual decision paths without breaking existing functionality.
 */
class AgentDecisionIntegrationService {
  /**
   * Check if library auto-trigger should be enabled
   * PILOT DECISION POINT: Using runtime config for library trigger policy
   *
   * @param {Object} options
   * @param {string} options.libraryName - e.g., 'react', 'mongoose'
   * @param {boolean} options.useRuntimeConfig - feature flag to enable dynamic config
   * @returns {Promise<{ enabled: boolean, source: 'static'|'dynamic'|'default', reason: string }>}
   */
  async shouldTriggerLibraryAuto(options = {}) {
    const { libraryName, useRuntimeConfig = false } = options;

    try {
      // Check if feature flag for runtime config is enabled
      if (!useRuntimeConfig) {
        const isEnabled =
          await agentRuntimeConfigService.isFeatureEnabled('dynamic_runtime_config');
        if (!isEnabled) {
          // Fallback to static defaults
          logger.debug('Dynamic runtime config disabled, using static defaults', {
            libraryName,
          });
          return this._getStaticLibraryTriggerDefault(libraryName);
        }
      }

      // Get the auto-trigger policy from runtime config
      const policy = await agentRuntimeConfigService.getSetting(
        'policies.library_auto_trigger',
        null,
      );

      if (!policy) {
        logger.warn('No library auto-trigger policy in runtime config, using static default', {
          libraryName,
        });
        return this._getStaticLibraryTriggerDefault(libraryName);
      }

      // Check if library is in enabled list
      const enabled = policy.enabledLibraries && policy.enabledLibraries.includes(libraryName);

      // Log decision source
      if (await agentRuntimeConfigService.isDecisionSourceLoggingEnabled()) {
        logger.info('Library trigger decision from runtime config', {
          libraryName,
          enabled,
          source: 'dynamic',
          policy: policy.id,
        });
      }

      return {
        enabled,
        source: 'dynamic',
        reason: enabled
          ? `Library "${libraryName}" enabled in runtime config policy`
          : `Library "${libraryName}" not in enabled list`,
      };
    } catch (error) {
      logger.error('Error in library auto-trigger decision', {
        error: error.message,
        libraryName,
      });

      // Safe fallback to static default on error
      return this._getStaticLibraryTriggerDefault(libraryName);
    }
  }

  /**
   * Determine if confidence threshold for a check is met
   * DEMONSTRATION: Using runtime config for confidence thresholds
   *
   * @param {Object} options
   * @param {string} options.decisionType - e.g., 'library_trigger', 'skill_selection'
   * @param {number} options.confidence - 0.0 - 1.0
   * @param {boolean} options.useRuntimeConfig - feature flag
   * @returns {Promise<{ passes: boolean, threshold: number, confidence: number }>}
   */
  async checkConfidenceThreshold(options = {}) {
    const { decisionType, confidence, useRuntimeConfig = false } = options;

    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0.0 and 1.0');
    }

    try {
      let threshold = 0.7; // Static default

      // If runtime config enabled, try to get dynamic threshold
      if (useRuntimeConfig) {
        threshold = await agentRuntimeConfigService.getConfidenceThreshold(decisionType);
      }

      const passes = confidence >= threshold;

      if (await agentRuntimeConfigService.isDecisionSourceLoggingEnabled()) {
        logger.info('Confidence threshold check', {
          decisionType,
          confidence: confidence.toFixed(2),
          threshold: threshold.toFixed(2),
          passes,
          source: useRuntimeConfig ? 'dynamic' : 'static',
        });
      }

      return {
        passes,
        threshold,
        confidence,
        decisionType,
      };
    } catch (error) {
      logger.error('Error checking confidence threshold', {
        error: error.message,
        decisionType,
      });

      // Safe fallback
      const threshold = 0.7;
      return {
        passes: confidence >= threshold,
        threshold,
        confidence,
        decisionType,
      };
    }
  }

  /**
   * Get skill selection strategy from runtime config
   * DEMONSTRATION: Feature flag + soft rollout for skill changes
   *
   * @param {string} skillName
   * @returns {Promise<{ strategy: 'static'|'dynamic', enabled: boolean }>}
   */
  async getSkillSelectionStrategy(skillName) {
    try {
      const config = await agentRuntimeConfigService.getFeatureConfig('skill_selection_v2');

      // Feature flag determines if we use new skill selection logic
      if (!config.enabled) {
        logger.debug('Skill selection v2 disabled, using legacy strategy', { skillName });
        return {
          strategy: 'static',
          enabled: false,
          reason: 'Feature flag disabled',
        };
      }

      // Soft rollout: check allowed roles
      const allowedRoles = config.allowedRoles || [];
      const rolloutPercentage = config.rolloutPercentage || 0;

      logger.debug('Skill selection v2 available', {
        skillName,
        allowedRoles,
        rolloutPercentage,
      });

      return {
        strategy: 'dynamic',
        enabled: true,
        allowedRoles,
        rolloutPercentage,
        reason: 'Using dynamic skill selection from runtime config',
      };
    } catch (error) {
      logger.error('Error getting skill selection strategy', {
        error: error.message,
        skillName,
      });

      // Safe fallback: use static strategy
      return {
        strategy: 'static',
        enabled: false,
        reason: 'Fall back to static strategy due to config load error',
      };
    }
  }

  /**
   * Evaluate if a decision should proceed with full dynamic runtime config
   * GUARDED ROLLOUT TOGGLE
   *
   * @returns {Promise<boolean>}
   */
  async shouldUseFullDynamicConfig() {
    // Environment variable allows quick disable without redeploying
    if (process.env.USE_RUNTIME_CONFIG === 'false') {
      return false;
    }

    try {
      // Check if feature is enabled in active profile
      const enabled = await agentRuntimeConfigService.isFeatureEnabled(
        'full_dynamic_runtime_config',
      );
      return enabled;
    } catch (error) {
      logger.error('Error checking full dynamic config flag', { error: error.message });
      return false;
    }
  }

  /**
   * Log decision source for observability
   * Call this after every major decision point
   *
   * @param {Object} context
   * @param {string} context.decisionType - e.g., 'library_trigger', 'skill_selection'
   * @param {string} context.source - 'static', 'dynamic', or 'hardcoded'
   * @param {any} context.value - The decision value
   * @param {string} context.reason - Why this decision was made
   */
  async logDecisionSource(context) {
    const { decisionType, source, value, reason } = context;

    // Check if logging is enabled
    const loggingEnabled = await agentRuntimeConfigService.isDecisionSourceLoggingEnabled();
    if (!loggingEnabled) {
      return;
    }

    logger.info('Decision made', {
      decisionType,
      source,
      value,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  // ===== Private Helpers =====

  _getStaticLibraryTriggerDefault(libraryName) {
    // Hardcoded static defaults for library triggers
    const staticDefaults = {
      react: true,
      mongoose: true,
      express: true,
      'react-query': true,
      zustand: true,
      // Add more as needed
    };

    const enabled = staticDefaults[libraryName] || false;

    return {
      enabled,
      source: 'static',
      reason: enabled
        ? `Library "${libraryName}" is in hardcoded enabled list`
        : `Library "${libraryName}" not in hardcoded enabled list`,
    };
  }
}

// Singleton instance
const agentDecisionIntegrationService = new AgentDecisionIntegrationService();

export default agentDecisionIntegrationService;
