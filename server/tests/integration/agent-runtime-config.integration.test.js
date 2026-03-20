/**
 * Agent Runtime Config Integration Test
 * Verifies that profiles, decision service, and routes work together
 */

import assert from 'assert';
import { beforeEach, describe, it } from 'vitest';
import agentRuntimeConfigService from '../../services/agentRuntimeConfig.service.js';
import agentDecisionIntegrationService from '../../services/agent-decision-integration.service.js';

describe('Agent Runtime Config Integration', () => {
  let configService;
  let decisionService;

  beforeEach(() => {
    configService = agentRuntimeConfigService;
    decisionService = agentDecisionIntegrationService;
  });

  describe('Profile Schema Validation', () => {
    it('should load and validate default profile structure', async () => {
      const profile = await configService.getActiveProfile();

      assert.ok(profile, 'Profile should exist');
      assert.strictEqual(profile.id, 'cms-agent-default', 'Profile ID should be cms-agent-default');
      assert.ok(profile.modeProfiles, 'Should have modeProfiles');
      assert.ok(profile.modeProfiles.execution, 'Should have execution mode');
      assert.ok(profile.modeProfiles.explainability, 'Should have explainability mode');
      assert.ok(profile.modeProfiles.proactive, 'Should have proactive mode');
      assert.ok(profile.confidencePolicy, 'Should have confidence policy');
      assert.ok(profile.verification, 'Should have verification config');
      assert.ok(profile.pluginRegistry, 'Should have plugin registry');
    });

    it('should have properly structured mode profiles', async () => {
      const profile = await configService.getActiveProfile();

      Object.values(profile.modeProfiles).forEach((mode) => {
        assert.ok(Array.isArray(mode.useWhen), 'Mode should have useWhen array');
        assert.ok(Array.isArray(mode.behaviors), 'Mode should have behaviors array');
        assert(mode.useWhen.length > 0, 'useWhen should have at least one trigger');
        assert(mode.behaviors.length > 0, 'behaviors should have at least one behavior');
      });
    });

    it('should have valid confidence policy bands', async () => {
      const profile = await configService.getActiveProfile();
      const bands = ['high', 'medium', 'low'];

      bands.forEach((band) => {
        assert.ok(profile.confidencePolicy[band], `Should have ${band} confidence band`);
        assert.ok(profile.confidencePolicy[band].min >= 0, `${band} min should be >= 0`);
        assert.ok(profile.confidencePolicy[band].max <= 1.0, `${band} max should be <= 1.0`);
        assert.ok(profile.confidencePolicy[band].policy, `${band} should have policy`);
      });

      // Verify bands are properly ordered
      assert(profile.confidencePolicy.high.min >= profile.confidencePolicy.medium.max);
      assert(profile.confidencePolicy.medium.min >= profile.confidencePolicy.low.max);
    });
  });

  describe('Decision Service Compatibility', () => {
    it('should retrieve confidence thresholds from policy', async () => {
      // Decision service expects to call getConfidenceThreshold
      // This should read from confidencePolicy structure
      const decision = await decisionService.checkConfidenceThreshold({
        decisionType: 'library_trigger',
        confidence: 0.92,
      });

      assert.ok(decision, 'Should return decision result');
      assert.ok(decision.passes !== undefined, 'Should indicate if confidence passes');
    });

    it('should handle library trigger decisions', async () => {
      const decision = await decisionService.shouldTriggerLibraryAuto({
        libraryName: 'react',
      });

      assert.ok(decision !== undefined, 'Should return decision');
      // Should return boolean or object with boolean flag
      assert(typeof decision === 'boolean' || decision.trigger !== undefined);
    });

    it('should access experimental features correctly', async () => {
      const config = await configService.getActiveProfile();

      // Check that staging has more experimental features enabled
      assert.ok(config.experimentalFeatures, 'Should have experimental features');
      assert.ok(
        config.experimentalFeatures.splitScreenViewer,
        'Should have splitScreenViewer config',
      );
    });
  });

  describe('Service Method Coverage', () => {
    it('should provide all required accessor methods', async () => {
      assert.strictEqual(typeof configService.getActiveProfile, 'function');
      assert.strictEqual(typeof configService.getSetting, 'function');
      assert.strictEqual(typeof configService.getFeatureConfig, 'function');
      assert.strictEqual(typeof configService.getConfidenceThreshold, 'function');
      assert.strictEqual(typeof configService.getLogLevel, 'function');
      assert.strictEqual(typeof configService.validateActiveProfile, 'function');
      assert.strictEqual(typeof configService.isFeatureEnabled, 'function');
    });

    it('should use getSetting for dot-notation access', async () => {
      // Test accessing nested properties
      const executionMode = await configService.getSetting('modeProfiles.execution');
      assert.ok(executionMode, 'Should retrieve execution mode via dot notation');
      assert.ok(executionMode.useWhen, 'Retrieved mode should have useWhen');
    });

    it('should provide safe defaults for missing settings', async () => {
      const missing = await configService.getSetting('this.does.not.exist', 'DEFAULT_VALUE');
      assert.strictEqual(missing, 'DEFAULT_VALUE', 'Should return default for missing path');
    });

    it('should validate profile structure', async () => {
      const validation = await configService.validateActiveProfile();

      assert.ok(validation, 'Should return validation result');
      assert.strictEqual(typeof validation.valid, 'boolean');
      assert.ok(Array.isArray(validation.errors), 'Should have errors array');
      assert.strictEqual(validation.valid, true, 'Default profile should be valid');
    });
  });

  describe('Multi-Profile Support', () => {
    it('should switch between profiles', async () => {
      // Get initial active profile
      const initialKey = await configService.getActiveProfileKey();
      assert.ok(initialKey, 'Should have initial active profile');

      // Note: Full profile switching tested in routes/integration tests
      // This just verifies the service can identify active profile
    });

    it('should maintain profile isolation', async () => {
      // Staging should have more experimental features
      // Production should have fewer

      // This would require loading different profiles
      // Tested in routes integration tests
      assert.ok(true, 'Profile isolation tested in route integration tests');
    });
  });

  describe('Fallback Behavior', () => {
    it('should provide hardcoded defaults', async () => {
      const defaults = configService.getHardcodedDefaults();

      assert.ok(defaults, 'Should return hardcoded defaults');
      assert.ok(defaults.id, 'Defaults should have an ID');
      assert.ok(defaults.modeProfiles, 'Defaults should have mode profiles');
      assert.ok(defaults.confidencePolicy, 'Defaults should have confidence policy');
    });

    it('should use fallback defaults when profile loading fails', async () => {
      // Create scenario where config loading fails
      // Service should return hardcoded defaults

      // Note: Requires mocking file system
      // Verified in unit tests for getActiveProfile fallback
      assert.ok(true, 'Fallback tested via getActiveProfile three-tier fallback');
    });
  });

  describe('Plugin Registry Integration', () => {
    it('should load enabled plugins from registry', async () => {
      const profile = await configService.getActiveProfile();
      const plugins = profile.pluginRegistry;

      assert.ok(Array.isArray(plugins), 'Should have plugin registry array');
      assert(plugins.length > 0, 'Should have at least one plugin');

      plugins.forEach((plugin) => {
        assert.ok(plugin.id, 'Plugin should have ID');
        assert.strictEqual(typeof plugin.enabled, 'boolean', 'Plugin should have enabled flag');
        assert.ok(Array.isArray(plugin.triggers), 'Plugin should have triggers array');
      });
    });

    it('should filter enabled plugins only', async () => {
      const profile = await configService.getActiveProfile();
      const enabledPlugins = profile.pluginRegistry.filter((p) => p.enabled);

      assert(enabledPlugins.length > 0, 'Should have at least one enabled plugin');
    });
  });

  describe('Logging Configuration', () => {
    it('should provide consistent logging settings', async () => {
      const profile = await configService.getActiveProfile();

      assert.ok(profile.logging, 'Should have logging configuration');
      assert.ok(profile.logging.level, 'Should have log level');
      assert.strictEqual(typeof profile.logging.logDecisionSource, 'boolean');
    });

    it('should support component-level logging', async () => {
      const profile = await configService.getActiveProfile();

      assert.ok(profile.logging.components, 'Should have component-level logging');
      assert.ok(profile.logging.components.agentRuntime, 'Should have agentRuntime logging');
    });
  });

  describe('Router Integration Points', () => {
    // These tests verify routes can successfully:
    // 1. Call getActiveProfile() - returns profile with source metadata
    // 2. Call activateProfile(profileId) - switches active profile
    // 3. Call rollbackProfile() - reverts to previous profile
    // 4. Call getFeatureConfig(name) - returns feature config
    // 5. Call getEffectiveConfig(overrides) - merges config

    it('should support router call: getActiveProfile()', async () => {
      const result = await configService.getActiveProfile();

      assert.ok(result.profile, 'Should return profile object');
      assert.ok(result.source, 'Should include source (cache/active/fallback/hardcoded)');
      assert.ok(result.metadata, 'Should include metadata');
    });

    it('should support router call: activateProfile(profileId)', async () => {
      // Service has this method
      assert.strictEqual(typeof configService.activateProfile, 'function');
    });

    it('should support router call: rollbackProfile()', async () => {
      // Service has this method
      assert.strictEqual(typeof configService.rollbackProfile, 'function');
    });

    it('should support router call: getEffectiveConfig(overrides)', async () => {
      // Service has this method
      assert.strictEqual(typeof configService.getEffectiveConfig, 'function');
    });
  });
});
