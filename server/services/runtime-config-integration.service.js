/**
 * Runtime Config Integration Service
 * Bridges runtime config decisions with actual execution logic.
 * Provides fallback mechanisms, logging, and safe defaults.
 */

const runtimeConfigService = require('./runtime-config.service');
const logger = require('../utils/logger');

class RuntimeConfigIntegrationService {
  /**
   * Get a config setting with fallback chain
   * Priority: active profile → default profile → hardcoded default
   *
   * @param {string} path - Dot-notation path (e.g., 'modes.execution.parallelism')
   * @param {*} hardcodedDefault - Ultimate fallback value
   * @returns {*} Resolved value
   */
  static async resolveSetting(path, hardcodedDefault) {
    try {
      const profile = runtimeConfigService.getActiveProfile();
      if (!profile) {
        logger.warn(
          `[RuntimeConfigIntegration] No active profile found, using hardcoded default for path: ${path}`,
        );
        return hardcodedDefault;
      }

      const value = this._getNestedValue(profile.config, path);
      if (value !== undefined) {
        logger.debug(
          `[RuntimeConfigIntegration] Resolved '${path}' from active profile: ${JSON.stringify(value)}`,
        );
        return value;
      }

      // Fallback to default profile
      const defaultProfile = runtimeConfigService.getProfileById('default');
      if (defaultProfile) {
        const defaultValue = this._getNestedValue(defaultProfile.config, path);
        if (defaultValue !== undefined) {
          logger.warn(
            `[RuntimeConfigIntegration] Setting '${path}' not in active profile, using default profile value`,
          );
          return defaultValue;
        }
      }

      // Use hardcoded default
      logger.warn(
        `[RuntimeConfigIntegration] Setting '${path}' not found in any profile, using hardcoded default: ${hardcodedDefault}`,
      );
      return hardcodedDefault;
    } catch (error) {
      logger.error(
        `[RuntimeConfigIntegration] Error resolving setting '${path}': ${error.message}`,
        error,
      );
      return hardcodedDefault;
    }
  }

  /**
   * Get nested value from object using dot notation
   * e.g., 'modes.execution.parallelism' → obj.modes.execution.parallelism
   *
   * @private
   */
  static _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  /**
   * Check if a feature is enabled
   * Considers: active profile → default profile → false
   *
   * @param {string} featureName - Feature key (e.g., 'parallelToolExecution')
   * @returns {boolean} Whether feature is enabled
   */
  static async isFeatureEnabled(featureName) {
    try {
      // Check if feature toggle is explicitly controlled by env var
      const envOverride = process.env[`FEATURE_${featureName.toUpperCase()}`];
      if (envOverride !== undefined) {
        const enabled = envOverride === 'true' || envOverride === '1';
        logger.debug(
          `[RuntimeConfigIntegration] Feature '${featureName}' controlled by env var: ${enabled}`,
        );
        return enabled;
      }

      // Check active profile
      const profile = runtimeConfigService.getActiveProfile();
      if (profile?.config?.features?.[featureName] !== undefined) {
        const enabled = profile.config.features[featureName];
        logger.debug(
          `[RuntimeConfigIntegration] Feature '${featureName}' from active profile: ${enabled}`,
        );
        return enabled;
      }

      // Check default profile
      const defaultProfile = runtimeConfigService.getProfileById('default');
      if (defaultProfile?.config?.features?.[featureName] !== undefined) {
        const enabled = defaultProfile.config.features[featureName];
        logger.debug(
          `[RuntimeConfigIntegration] Feature '${featureName}' from default profile: ${enabled}`,
        );
        return enabled;
      }

      // Default to disabled
      logger.debug(
        `[RuntimeConfigIntegration] Feature '${featureName}' not configured, defaulting to false`,
      );
      return false;
    } catch (error) {
      logger.error(
        `[RuntimeConfigIntegration] Error checking feature '${featureName}': ${error.message}`,
        error,
      );
      return false;
    }
  }

  /**
   * Log decision source for audit trail
   * Helps track whether decisions came from runtime config or defaults
   *
   * @param {string} decisionPoint - Name of decision (e.g., 'libraryAutoTrigger', 'confidenceThreshold')
   * @param {*} value - The value being used
   * @param {string} source - Source: 'activeProfile' | 'defaultProfile' | 'hardcoded'
   */
  static logDecisionSource(decisionPoint, value, source) {
    logger.info(
      `[RuntimeConfigDecision] ${decisionPoint}=${JSON.stringify(value)} source=${source}`,
    );
  }

  /**
   * Get the effective configuration (merge active + defaults)
   * Useful for debugging or dumping current state
   *
   * @returns {object} Merged configuration
   */
  static getEffectiveConfig() {
    const defaultProfile = runtimeConfigService.getProfileById('default');
    const activeProfile = runtimeConfigService.getActiveProfile();

    // Deep merge: active profile overrides default
    return {
      profileId: activeProfile?.id || 'default',
      profileVersion: activeProfile?.version || defaultProfile?.version,
      config: {
        ...defaultProfile?.config,
        ...activeProfile?.config,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate a profile before activation
   * Checks schema compliance and critical settings
   *
   * @param {object} profile - Profile to validate
   * @returns {object} { isValid: boolean, errors: string[] }
   */
  static validateProfile(profile) {
    const errors = [];

    // Check required fields
    if (!profile.id) errors.push('Missing required field: id');
    if (!profile.version) errors.push('Missing required field: version');
    if (!profile.status) errors.push('Missing required field: status');
    if (!profile.config) errors.push('Missing required field: config');

    // Check config structure
    if (profile.config && typeof profile.config !== 'object') {
      errors.push('config must be an object');
    }

    // Warn about suspicious settings
    if (
      profile.config?.modes?.execution?.confidenceThreshold < 0 ||
      profile.config?.modes?.execution?.confidenceThreshold > 1
    ) {
      errors.push('modes.execution.confidenceThreshold must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a profile snapshot for auditing
   * Useful for comparing before/after config changes
   *
   * @param {string} reason - Why snapshot was taken
   * @returns {object} Snapshot data
   */
  static createSnapshot(reason) {
    const profile = runtimeConfigService.getActiveProfile();
    return {
      timestamp: new Date().toISOString(),
      reason,
      profileId: profile?.id,
      profileVersion: profile?.version,
      config: JSON.parse(JSON.stringify(profile?.config)), // Deep copy
    };
  }
}

module.exports = RuntimeConfigIntegrationService;
