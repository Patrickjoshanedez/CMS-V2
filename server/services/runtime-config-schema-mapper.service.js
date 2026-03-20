/**
 * Agent Runtime Configuration Schema Mapper
 *
 * Maps between runtime profile settings and agent execution context.
 * Provides type-safe access to configuration with defaults.
 *
 * Usage:
 * const mapper = new RuntimeConfigMapper();
 * const libraryPolicy = mapper.getLibraryAutoTriggerPolicy(profile);
 * const threshold = mapper.getConfidenceThreshold(profile, 'library_trigger', 0.7);
 */
class RuntimeConfigMapper {
  /**
   * Get library auto-trigger policy from profile
   * @param {Object} profile - Runtime profile object
   * @returns {Object} { enabledLibraries: string[], policyId: string }
   */
  getLibraryAutoTriggerPolicy(profile) {
    const policy = profile?.settings?.policies?.library_auto_trigger || {};
    return {
      enabledLibraries: policy.enabledLibraries || [],
      policyId: policy.id || 'unknown',
      description: policy.description || '',
    };
  }

  /**
   * Get feature configuration
   * @param {Object} profile - Runtime profile object
   * @param {string} featureName - Feature name (e.g., 'course_creation')
   * @returns {Object} { enabled, allowedRoles, rolloutPercentage }
   */
  getFeatureConfig(profile, featureName) {
    const feature = profile?.settings?.features?.[featureName] || {};
    return {
      enabled: feature.enabled !== false,
      allowedRoles: feature.allowedRoles || [],
      rolloutPercentage: feature.rolloutPercentage || 0,
      description: feature.description || '',
    };
  }

  /**
   * Get confidence threshold for decision type
   * @param {Object} profile - Runtime profile object
   * @param {string} decisionType - Decision type (e.g., 'library_trigger')
   * @param {number} defaultValue - Fallback threshold
   * @returns {number} Threshold between 0.0 and 1.0
   */
  getConfidenceThreshold(profile, decisionType, defaultValue = 0.7) {
    const threshold =
      profile?.settings?.thresholds?.confidence?.[decisionType] ||
      profile?.settings?.thresholds?.confidence?.default ||
      defaultValue;

    // Validate range
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      return defaultValue;
    }

    return threshold;
  }

  /**
   * Get logging configuration
   * @param {Object} profile - Runtime profile object
   * @returns {Object} { level, logDecisionSource, components }
   */
  getLoggingConfig(profile) {
    const logging = profile?.settings?.logging || {};
    return {
      level: logging.level || 'info',
      logDecisionSource: logging.logDecisionSource !== false,
      components: logging.components || {},
    };
  }

  /**
   * Check if decision logging is enabled
   * @param {Object} profile - Runtime profile object
   * @returns {boolean}
   */
  isDecisionSourceLoggingEnabled(profile) {
    return profile?.settings?.logging?.logDecisionSource !== false;
  }

  /**
   * Get log level for specific component
   * @param {Object} profile - Runtime profile object
   * @param {string} componentName - Component name
   * @param {string} defaultLevel - Fallback log level
   * @returns {string} 'debug' | 'info' | 'warn' | 'error'
   */
  getComponentLogLevel(profile, componentName, defaultLevel = 'info') {
    const level =
      profile?.settings?.logging?.components?.[componentName] ||
      profile?.settings?.logging?.level ||
      defaultLevel;

    const validLevels = ['debug', 'info', 'warn', 'error'];
    return validLevels.includes(level) ? level : defaultLevel;
  }

  /**
   * Check if feature flag is enabled
   * @param {Object} profile - Runtime profile object
   * @param {string} featureName - Feature name
   * @returns {boolean}
   */
  isFeatureEnabled(profile, featureName) {
    return profile?.settings?.features?.[featureName]?.enabled === true;
  }

  /**
   * Get all enabled features
   * @param {Object} profile - Runtime profile object
   * @returns {string[]} Array of enabled feature names
   */
  getEnabledFeatures(profile) {
    const features = profile?.settings?.features || {};
    return Object.entries(features)
      .filter(([, config]) => config.enabled === true)
      .map(([name]) => name);
  }

  /**
   * Validate profile against schema
   * @param {Object} profile - Runtime profile object
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateProfile(profile) {
    const errors = [];

    // Check required fields
    if (!profile.id || typeof profile.id !== 'string') {
      errors.push('Missing or invalid "id" field (must be string)');
    }

    if (!profile.version || typeof profile.version !== 'string') {
      errors.push('Missing or invalid "version" field (must be string)');
    }

    if (!profile.status || !['active', 'deprecated'].includes(profile.status)) {
      errors.push('Invalid status field (must be "active" or "deprecated")');
    }

    if (!profile.settings || typeof profile.settings !== 'object') {
      errors.push('Missing or invalid "settings" object');
    }

    // Check structure of settings
    if (profile.settings) {
      if (profile.settings.features && typeof profile.settings.features !== 'object') {
        errors.push('Invalid "features" object in settings');
      }

      if (profile.settings.policies && typeof profile.settings.policies !== 'object') {
        errors.push('Invalid "policies" object in settings');
      }

      if (profile.settings.thresholds && typeof profile.settings.thresholds !== 'object') {
        errors.push('Invalid "thresholds" object in settings');
      }

      if (profile.settings.logging && typeof profile.settings.logging !== 'object') {
        errors.push('Invalid "logging" object in settings');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Merge two profiles (new overrides old)
   * @param {Object} baseProfile - Base profile
   * @param {Object} overrideProfile - Overrides
   * @returns {Object} Merged profile
   */
  mergeProfiles(baseProfile, overrideProfile) {
    if (!baseProfile) return overrideProfile;
    if (!overrideProfile) return baseProfile;

    return {
      id: overrideProfile.id || baseProfile.id,
      version: overrideProfile.version || baseProfile.version,
      status: overrideProfile.status || baseProfile.status,
      expiresAt: overrideProfile.expiresAt || baseProfile.expiresAt,
      checksum: overrideProfile.checksum || baseProfile.checksum,
      settings: this._deepMergeObjects(baseProfile.settings || {}, overrideProfile.settings || {}),
    };
  }

  /**
   * Get all settings paths and their types
   * Useful for documentation and debugging
   * @returns {Object} Schema documentation
   */
  getSchemaDocumentation() {
    return {
      'settings.features.{featureName}.enabled': {
        type: 'boolean',
        description: 'Whether the feature is enabled',
      },
      'settings.features.{featureName}.allowedRoles': {
        type: 'string[]',
        description: 'Which roles can use this feature',
      },
      'settings.features.{featureName}.rolloutPercentage': {
        type: 'number',
        description: 'Percentage of users to rollout to (0-100)',
      },
      'settings.policies.library_auto_trigger.enabledLibraries': {
        type: 'string[]',
        description: 'Libraries that trigger auto Context7 lookups',
      },
      'settings.thresholds.confidence.{decisionType}': {
        type: 'number',
        description: 'Confidence threshold for decision type (0.0-1.0)',
      },
      'settings.logging.level': {
        type: 'string',
        enum: ['debug', 'info', 'warn', 'error'],
        description: 'Global logging level',
      },
      'settings.logging.logDecisionSource': {
        type: 'boolean',
        description: 'Whether to log static vs dynamic decision sources',
      },
    };
  }

  // ===== Private Helpers =====

  _deepMergeObjects(base, override) {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this._deepMergeObjects(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }
}

// Export singleton mapper
const runtimeConfigMapper = new RuntimeConfigMapper();

export default runtimeConfigMapper;
export { RuntimeConfigMapper };
