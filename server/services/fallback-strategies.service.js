/**
 * Fallback Strategies Utility
 * Ensures agent decisions have safe fallbacks at every layer
 * Hierarchy: ActiveProfile → DefaultProfile → Hardcoded → Safe Default
 */

const logger = require('../utils/logger');
const runtimeConfigService = require('./runtime-config.service');
const runtimeIntegration = require('./runtime-config-integration.service');

class FallbackStrategies {
  /**
   * Fallback strategy for library auto-trigger decisions
   * Used by: "Should we auto-trigger Context7, import analysis, etc?"
   */
  static async shouldAutoTriggerLibraryCheck() {
    const resolved = await runtimeIntegration.resolveSetting(
      'decisionPolicies.libraryAutoTrigger.enabled',
      true, // Hardcoded safe default: enable libraries by default
    );

    runtimeIntegration.logDecisionSource(
      'shouldAutoTriggerLibraryCheck',
      resolved,
      resolved ? 'config' : 'hardcoded-default',
    );

    return resolved;
  }

  /**
   * Fallback strategy for confidence thresholds
   * Used by: "Can we respond with this level of uncertainty?"
   *
   * @param {string} taskType - Task type: 'code-gen' | 'architecture' | 'refactor' | 'debug'
   * @returns {number} Confidence threshold (0.0-1.0)
   */
  static async getConfidenceThreshold(taskType = 'default') {
    const thresholdMap = {
      'code-gen': 0.85,
      architecture: 0.8,
      security: 0.95, // Most critical
      refactor: 0.7, // Can be more lenient
      debug: 0.75,
      default: 0.8,
    };

    const configPath = `decisionPolicies.confidenceBands.${taskType || 'default'}`;
    const resolved = await runtimeIntegration.resolveSetting(
      configPath,
      thresholdMap[taskType || 'default'],
    );

    runtimeIntegration.logDecisionSource(`getConfidenceThreshold[${taskType}]`, resolved, 'config');

    return Math.max(0, Math.min(1, resolved)); // Clamp 0-1
  }

  /**
   * Fallback strategy for parallelism
   * Used by: "Can we execute tool calls in parallel?"
   *
   * @param {string} operation - Operation type: 'search' | 'read' | 'browser' | 'api'
   * @returns {boolean} Whether operation supports parallelism
   */
  static async supportsParallelism(operation = 'search') {
    const parallelismMap = {
      search: true, // Safe: independent searches
      read: true, // Safe: independent file reads
      write: false, // Unsafe: potential conflicts
      browser: false, // Unsafe: browser state conflict
      api: false, // Unsafe: rate limiting
      default: true,
    };

    const configPath = `executionModes.parallelism.${operation || 'default'}`;
    const resolved = await runtimeIntegration.resolveSetting(
      configPath,
      parallelismMap[operation || 'default'],
    );

    runtimeIntegration.logDecisionSource(`supportsParallelism[${operation}]`, resolved, 'config');

    return !!resolved;
  }

  /**
   * Fallback strategy for context compaction
   * Used by: "Should we compress conversation context?"
   *
   * @returns {object} Compaction rules
   */
  static async getCompactionThreshold() {
    const defaults = {
      messageCount: 40,
      tokenPercentage: 0.8, // 80% of budget
      autoTrigger: true,
    };

    const configPath = 'contextManagement.compaction';
    const resolved = await runtimeIntegration.resolveSetting(configPath, defaults);

    return {
      messageCount: resolved?.messageCount || defaults.messageCount,
      tokenPercentage: resolved?.tokenPercentage || defaults.tokenPercentage,
      autoTrigger: resolved?.autoTrigger !== false,
    };
  }

  /**
   * Fallback strategy for feature flags
   * Used by: "Is this feature enabled for this tenant/user?"
   *
   * @param {string} featureName - Feature key
   * @returns {object} Feature configuration
   */
  static async getFeatureConfig(featureName) {
    const defaults = {
      enabled: false,
      rolloutPercentage: 0,
      betaCohort: false,
      requiresApproval: false,
    };

    const configPath = `features.${featureName}`;
    const resolved = await runtimeIntegration.resolveSetting(configPath, defaults);

    return {
      enabled: !!resolved?.enabled,
      rolloutPercentage: resolved?.rolloutPercentage || 0,
      betaCohort: !!resolved?.betaCohort,
      requiresApproval: !!resolved?.requiresApproval,
    };
  }

  /**
   * Fallback strategy for logging verbosity
   * Used by: "What should we log?"
   *
   * @returns {string} Log level: 'debug' | 'info' | 'warn' | 'error'
   */
  static async getLogLevel() {
    const levelMap = {
      development: 'debug',
      staging: 'info',
      production: 'warn',
      default: 'info',
    };

    const env = process.env.NODE_ENV || 'development';
    const configPath = `logging.level.${env}`;
    const resolved = await runtimeIntegration.resolveSetting(
      configPath,
      levelMap[env] || levelMap.default,
    );

    runtimeIntegration.logDecisionSource(`getLogLevel[${env}]`, resolved, 'config');

    return resolved;
  }

  /**
   * Fallback strategy for tool call retry behavior
   * Used by: "Should we retry this failed tool call?"
   *
   * @param {string} toolName - Name of tool (e.g., 'read_file', 'run_in_terminal')
   * @returns {object} Retry policy
   */
  static async getRetryPolicy(toolName) {
    const defaults = {
      maxRetries: 3,
      initialDelay: 500, // ms
      backoffMultiplier: 2,
      maxDelay: 10000, // ms
      retryableErrors: ['TIMEOUT', 'NETWORK', 'TRANSIENT'],
    };

    const configPath = `resilience.retryPolicies.${toolName}`;
    const resolved = await runtimeIntegration.resolveSetting(configPath, defaults);

    return {
      maxRetries: Math.max(1, resolved?.maxRetries || defaults.maxRetries),
      initialDelay: Math.max(0, resolved?.initialDelay || defaults.initialDelay),
      backoffMultiplier: Math.max(1, resolved?.backoffMultiplier || defaults.backoffMultiplier),
      maxDelay: Math.max(1000, resolved?.maxDelay || defaults.maxDelay),
      retryableErrors: Array.isArray(resolved?.retryableErrors)
        ? resolved.retryableErrors
        : defaults.retryableErrors,
    };
  }

  /**
   * Fallback strategy for decision tracing/debugging
   * Used by: "Should we create detailed trace logs?"
   *
   * @returns {object} Debug configuration
   */
  static async getDebugConfig() {
    const defaults = {
      enableTracing: false,
      tracingDepth: 2,
      captureDecisionPath: false,
      profileTimings: false,
    };

    const configPath = 'debuggingAndObservability.tracing';
    const resolved = await runtimeIntegration.resolveSetting(configPath, defaults);

    return {
      enableTracing: !!resolved?.enableTracing,
      tracingDepth: Math.max(1, resolved?.tracingDepth || defaults.tracingDepth),
      captureDecisionPath: !!resolved?.captureDecisionPath,
      profileTimings: !!resolved?.profileTimings,
    };
  }

  /**
   * Fallback strategy for safe mode activation
   * Used by: "Are we in safe/restricted mode?"
   * (e.g., after errors, during critical operations, in production)
   *
   * @returns {object} Safe mode configuration
   */
  static async getSafeModeConfig() {
    const defaults = {
      enabled: false,
      restrictFeatures: [],
      requiresApproval: [],
      disableAutoRetry: false,
      reduceParallelism: false,
    };

    const configPath = 'safetyAndResilience.safeMode';
    const resolved = await runtimeIntegration.resolveSetting(configPath, defaults);

    return {
      enabled: !!resolved?.enabled,
      restrictFeatures: Array.isArray(resolved?.restrictFeatures) ? resolved.restrictFeatures : [],
      requiresApproval: Array.isArray(resolved?.requiresApproval) ? resolved.requiresApproval : [],
      disableAutoRetry: !!resolved?.disableAutoRetry,
      reduceParallelism: !!resolved?.reduceParallelism,
    };
  }

  /**
   * Create custom fallback for arbitrary decision
   * Use this for one-off decisions not covered above
   *
   * @param {string} path - Dot-notation config path
   * @param {*} hardcodedDefault - Fallback value if not found
   * @param {string} decisionName - Human-readable name for logging
   * @returns {*} Resolved value
   */
  static async customFallback(path, hardcodedDefault, decisionName) {
    const resolved = await runtimeIntegration.resolveSetting(path, hardcodedDefault);
    runtimeIntegration.logDecisionSource(
      decisionName,
      resolved,
      resolved === hardcodedDefault ? 'hardcoded-default' : 'config',
    );
    return resolved;
  }
}

module.exports = FallbackStrategies;
