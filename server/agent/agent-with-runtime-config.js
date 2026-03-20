/**
 * Agent Initialization with Runtime Configuration
 * Example showing how to wire runtime config into agent startup and execution loop
 */

const runtimeConfigService = require('../services/runtime-config.service');
const runtimeIntegration = require('../services/runtime-config-integration.service');
const fallbackStrategies = require('../services/fallback-strategies.service');
const logger = require('../utils/logger');

/**
 * Agent class with runtime config integration
 * Real instance would have much more, but shows integration points
 */
class CMSCapstoneAgent {
  constructor() {
    this.config = null;
    this.executionMode = 'execution'; // Default mode
    this.isInitialized = false;
    this.decisionLog = [];
  }

  /**
   * Initialize agent with runtime configuration
   * Called once at startup
   */
  async initialize() {
    try {
      logger.info('[Agent] Initializing with runtime configuration...');

      // 1. Load config service
      if (!runtimeConfigService.isInitialized()) {
        await runtimeConfigService.initialize();
      }

      // 2. Get effective configuration
      this.config = runtimeIntegration.getEffectiveConfig();
      logger.info(
        `[Agent] Loaded profile: ${this.config.profileId} v${this.config.profileVersion}`,
      );

      // 3. Check if we should enable debug mode
      const debugConfig = await fallbackStrategies.getDebugConfig();
      if (debugConfig.enableTracing) {
        logger.info('[Agent] Debug tracing enabled - detailed logs will be captured');
      }

      this.isInitialized = true;
      logger.info('[Agent] Initialization complete');
    } catch (error) {
      logger.error('[Agent] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Main agent execution loop
   * Demonstrates decision points integrated with runtime config
   *
   * @param {object} request - User request
   * @returns {object} Response
   */
  async execute(request) {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      logger.info(`[Agent] Processing request: ${request.task}`);

      // DECISION POINT 1: Determine execution mode
      const executionMode = await this._selectExecutionMode(request);
      logger.info(`[Agent] Using execution mode: ${executionMode}`);

      // DECISION POINT 2: Check if we should parallelize tool calls
      const canParallelize = await fallbackStrategies.supportsParallelism(
        request.toolType || 'search',
      );
      logger.info(`[Agent] Tool call parallelization: ${canParallelize}`);

      // DECISION POINT 3: Check confidence threshold
      const confidenceRequired = await fallbackStrategies.getConfidenceThreshold(
        request.taskType || 'default',
      );
      logger.info(`[Agent] Confidence threshold required: ${confidenceRequired}`);

      // DECISION POINT 4: Check if libraries should auto-trigger
      const enableLibraryAuto = await fallbackStrategies.shouldAutoTriggerLibraryCheck();
      logger.info(`[Agent] Library auto-trigger enabled: ${enableLibraryAuto}`);

      // DECISION POINT 5: Check if we're in safe mode
      const safeMode = await fallbackStrategies.getSafeModeConfig();
      if (safeMode.enabled) {
        logger.warn(
          `[Agent] SAFE MODE ACTIVE - restricted features: ${safeMode.restrictFeatures.join(', ')}`,
        );
      }

      // DECISION POINT 6: Check feature flags
      const featureConfig = await fallbackStrategies.getFeatureConfig('advancedDebugPanel');
      if (featureConfig.enabled) {
        logger.info('[Agent] Advanced debug panel feature enabled');
      }

      // Now execute based on all these decisions
      const response = await this._executeWithConfig(request, {
        executionMode,
        canParallelize,
        confidenceRequired,
        enableLibraryAuto,
        safeMode,
        featureConfig,
      });

      logger.info('[Agent] Request completed successfully');
      return response;
    } catch (error) {
      logger.error('[Agent] Execution failed:', error);
      throw error;
    }
  }

  /**
   * Select execution mode based on request and configuration
   * DECISION POINT: execution vs explainability vs proactive
   *
   * @private
   */
  async _selectExecutionMode(request) {
    // Check if request explicitly asks for a mode
    if (request.mode && ['execution', 'explainability', 'proactive'].includes(request.mode)) {
      runtimeIntegration.logDecisionSource('selectExecutionMode', request.mode, 'user-request');
      return request.mode;
    }

    // Otherwise, use config
    const modeConfig = await runtimeIntegration.resolveSetting('modes.default', 'execution');

    runtimeIntegration.logDecisionSource('selectExecutionMode', modeConfig, 'runtime-config');
    return modeConfig;
  }

  /**
   * Execute with runtime configuration applied
   * Where the actual work happens
   *
   * @private
   */
  async _executeWithConfig(request, decisions) {
    const startTime = Date.now();

    // This is pseudocode - real implementation would do actual work
    let result = {};

    if (decisions.executionMode === 'execution') {
      // Execute mode: Do the work as fast as possible
      result = await this._executeTask(request, decisions);
    } else if (decisions.executionMode === 'explainability') {
      // Explainability mode: Include reasoning
      result = await this._executeTaskWithReasoning(request, decisions);
    } else if (decisions.executionMode === 'proactive') {
      // Proactive mode: Include next steps and suggestions
      result = await this._executeTaskWithProactivity(request, decisions);
    }

    const duration = Date.now() - startTime;

    // Log timing if profiler enabled
    const debugConfig = await fallbackStrategies.getDebugConfig();
    if (debugConfig.profileTimings) {
      logger.info(`[Agent] Execution duration: ${duration}ms`);
    }

    return result;
  }

  /**
   * Internal task execution
   * @private
   */
  async _executeTask(request, decisions) {
    // Actual task implementation
    return { success: true, message: 'Task executed' };
  }

  /**
   * Execute with reasoning and explanation
   * @private
   */
  async _executeTaskWithReasoning(request, decisions) {
    // Include "why" in the response
    return {
      success: true,
      message: 'Task executed',
      reasoning: 'Detailed explanation of decisions',
      decisionPath: decisions,
    };
  }

  /**
   * Execute with proactive suggestions for next steps
   * @private
   */
  async _executeTaskWithProactivity(request, decisions) {
    const result = await this._executeTask(request, decisions);
    return {
      ...result,
      nextSteps: ['Suggested follow-up action 1', 'Suggested follow-up action 2'],
    };
  }

  /**
   * Get current agent state (for monitoring)
   */
  getState() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      executionMode: this.executionMode,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Switch to a different profile at runtime
   * Useful for responding to errors or admin commands
   *
   * @param {string} profileId - Profile ID to switch to
   */
  async switchProfile(profileId) {
    try {
      const switches = runtimeConfigService.switchProfile(profileId);
      this.config = runtimeIntegration.getEffectiveConfig();

      logger.info(`[Agent] Switched profile from ${switches.from} to ${switches.to}`);
      return { success: true, previousProfile: switches.from, newProfile: switches.to };
    } catch (error) {
      logger.error(`[Agent] Profile switch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rollback to previous profile
   */
  async rollbackProfile() {
    try {
      const result = runtimeConfigService.rollbackProfile();
      this.config = runtimeIntegration.getEffectiveConfig();

      logger.info(`[Agent] Rolled back profile to ${result.profileId}`);
      return result;
    } catch (error) {
      logger.error(`[Agent] Profile rollback failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Factory function to create and initialize agent
 */
async function createAgent() {
  const agent = new CMSCapstoneAgent();
  await agent.initialize();
  return agent;
}

module.exports = {
  CMSCapstoneAgent,
  createAgent,
};
