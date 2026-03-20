/**
 * Agent Decision Integration Example
 *
 * This example shows how to integrate runtime configuration decisions into your agent code.
 * It demonstrates the full flow from reading config → making decisions → logging sources.
 *
 * Key Concepts:
 * 1. Runtime config provides dynamic decision parameters
 * 2. Feature flags guard new code paths during rollout
 * 3. Decision logging captures whether we used static or dynamic logic
 * 4. Fallback mechanisms ensure safety if config missing
 *
 * Usage:
 * import { DemoIntegration } from './agent-decision-integration-example.js';
 * const demo = new DemoIntegration();
 * await demo.runFullExample();
 */

import agentRuntimeConfigService from '../services/agentRuntimeConfig.service.js';
import agentDecisionIntegrationService from '../services/agent-decision-integration.service.js';
import runtimeConfigMapper from '../services/runtime-config-schema-mapper.service.js';

// ============================================================
// EXAMPLE 1: Skill Routing Decision
// ============================================================

/**
 * Before: Hard-coded skill routing
 */
async function selectSkillsTraditional(taskType) {
  // This approach has no flexibility - changes require code deployment
  const skillMap = {
    'document-analysis': ['document-parser', 'nlp-analyzer'],
    'code-generation': ['template-engine', 'linter'],
    'plagiarism-check': ['plagiarism-detector', 'similarity-scorer'],
  };

  return skillMap[taskType] || [];
}

/**
 * After: Runtime-driven skill routing
 */
async function selectSkillsRuntimeDriven(taskType) {
  // Get the strategy from runtime config
  const strategy = await agentDecisionIntegrationService.getSkillSelectionStrategy(
    `skill_routing_${taskType}`,
  );

  let selectedSkills = [];

  if (strategy.enabled && strategy.strategy === 'dynamic') {
    // Use dynamic config
    try {
      const profile = await agentRuntimeConfigService.getActiveProfile();
      const mapper = runtimeConfigMapper;

      // Example: Load skill list from config
      const skillSetting = mapper.getFeatureConfig(profile.profile, `skills_for_${taskType}`);
      selectedSkills = skillSetting.skillNames || [];

      // Log decision source
      if (mapper.isDecisionSourceLoggingEnabled(profile.profile)) {
        await agentDecisionIntegrationService.logDecisionSource({
          decisionType: 'skill_selection',
          source: 'dynamic',
          value: selectedSkills,
          reason: `Selected skills for ${taskType} from runtime config`,
        });
      }
    } catch (error) {
      console.error('Error loading dynamic skills, falling back to static:', error);
      selectedSkills = await selectSkillsTraditional(taskType);
    }
  } else {
    // Use traditional static routing
    selectedSkills = await selectSkillsTraditional(taskType);

    // Log that we used static approach
    if (await agentDecisionIntegrationService.shouldUseFullDynamicConfig()) {
      await agentDecisionIntegrationService.logDecisionSource({
        decisionType: 'skill_selection',
        source: 'static',
        value: selectedSkills,
        reason: `Dynamic routing disabled for ${taskType}, using static fallback`,
      });
    }
  }

  return selectedSkills;
}

// ============================================================
// EXAMPLE 2: Library Auto-Trigger Decision
// ============================================================

/**
 * Before: Hard-coded library trigger list
 */
async function shouldLoadLibraryDocsTraditional(libraryName) {
  // Updates require code changes and redeployment
  const autoTriggerLibraries = ['react', 'mongoose', 'express', 'react-query', 'zustand'];

  return autoTriggerLibraries.includes(libraryName);
}

/**
 * After: Runtime-driven library triggers with feature flag guard
 */
async function shouldLoadLibraryDocsRuntimeDriven(libraryName) {
  try {
    // Check if we should use runtime config (guarded by feature flag)
    const useRuntimeConfig = await agentDecisionIntegrationService.shouldUseFullDynamicConfig();

    const decision = await agentDecisionIntegrationService.shouldTriggerLibraryAuto({
      libraryName,
      useRuntimeConfig,
    });

    // Log decision source for observability
    if (decision.source === 'dynamic') {
      await agentDecisionIntegrationService.logDecisionSource({
        decisionType: 'library_trigger',
        source: 'dynamic',
        value: decision.enabled,
        reason: `Library trigger decision from runtime config: ${decision.reason}`,
      });
    }

    return decision.enabled;
  } catch (error) {
    console.error('Error in library trigger decision, using fallback:', error);
    return await shouldLoadLibraryDocsTraditional(libraryName);
  }
}

// ============================================================
// EXAMPLE 3: Confidence Threshold Decision
// ============================================================

/**
 * Before: Hard-coded confidence thresholds
 */
function getConfidenceThresholdTraditional(decisionType) {
  // Changes require code updates
  const thresholds = {
    entity_extraction: 0.75,
    intent_classification: 0.7,
    plagiarism_detection: 0.8,
  };

  return thresholds[decisionType] || 0.7;
}

/**
 * After: Runtime-driven confidence thresholds
 */
async function getConfidenceThresholdRuntimeDriven(decisionType, userConfidence) {
  try {
    // Get threshold from runtime config
    const profile = await agentRuntimeConfigService.getActiveProfile();
    const mapper = runtimeConfigMapper;
    const configuredThreshold = mapper.getConfidenceThreshold(
      profile.profile,
      decisionType,
      0.7, // fallback default
    );

    // Use runtime threshold if higher than traditional (conservative approach)
    const finalThreshold = Math.max(
      getConfidenceThresholdTraditional(decisionType),
      configuredThreshold,
    );

    // Check if decision meets threshold
    const decision = await agentDecisionIntegrationService.checkConfidenceThreshold({
      decisionType,
      confidence: userConfidence,
    });

    if (decision.source === 'dynamic') {
      await agentDecisionIntegrationService.logDecisionSource({
        decisionType: 'confidence_threshold',
        source: 'dynamic',
        value: finalThreshold,
        reason: `Threshold check: confidence ${userConfidence} vs threshold ${finalThreshold}`,
      });
    }

    return {
      passes: userConfidence >= finalThreshold,
      threshold: finalThreshold,
      confidence: userConfidence,
    };
  } catch (error) {
    console.error('Error checking confidence threshold, using static:', error);
    return {
      passes: userConfidence >= getConfidenceThresholdTraditional(decisionType),
      threshold: getConfidenceThresholdTraditional(decisionType),
      confidence: userConfidence,
    };
  }
}

// ============================================================
// EXAMPLE 4: Full Integration Demo
// ============================================================

export class DemoIntegration {
  /**
   * Run full example showing all decision types
   */
  async runFullExample() {
    console.log('\n=== AGENT RUNTIME DECISION INTEGRATION EXAMPLE ===\n');

    try {
      // Step 1: Check active profile and its status
      console.log('1. Checking active runtime profile...');
      const profileStatus = await agentRuntimeConfigService.getActiveProfile();
      console.log(
        `   Active Profile: ${profileStatus.profile.id} (v${profileStatus.profile.version})`,
      );
      console.log(`   Source: ${profileStatus.source}`);

      // Step 2: Library triggers
      console.log('\n2. Testing library auto-trigger decisions...');
      const testLibraries = ['react', 'mongoose', 'unknown-lib', 'vue'];
      for (const lib of testLibraries) {
        const shouldTrigger = await shouldLoadLibraryDocsRuntimeDriven(lib);
        console.log(`   ${lib}: ${shouldTrigger ? 'LOAD DOCS' : 'skip'}`);
      }

      // Step 3: Skill selection
      console.log('\n3. Testing skill selection decisions...');
      const testTasks = ['document-analysis', 'code-generation'];
      for (const task of testTasks) {
        const skills = await selectSkillsRuntimeDriven(task);
        console.log(`   ${task}: ${skills.join(', ') || '(none)'}`);
      }

      // Step 4: Confidence thresholds
      console.log('\n4. Testing confidence threshold decisions...');
      const testDecisions = [
        { type: 'entity_extraction', confidence: 0.85 },
        { type: 'entity_extraction', confidence: 0.65 },
        { type: 'plagiarism_detection', confidence: 0.82 },
      ];
      for (const test of testDecisions) {
        const result = await getConfidenceThresholdRuntimeDriven(test.type, test.confidence);
        console.log(
          `   ${test.type} @ ${test.confidence}: ${
            result.passes ? 'PASS' : 'FAIL'
          } (threshold: ${result.threshold})`,
        );
      }

      // Step 5: Check effective config
      console.log('\n5. Current effective configuration...');
      const effectiveConfig = await agentRuntimeConfigService.getEffectiveConfig();
      console.log(
        `   Features enabled: ${
          Object.keys(effectiveConfig?.settings?.features || {})
            .filter((f) => effectiveConfig.settings.features[f].enabled)
            .join(', ') || '(none)'
        }`,
      );

      // Step 6: Profile validation
      console.log('\n6. Validating active profile...');
      const validation = await agentRuntimeConfigService.validateActiveProfile();
      if (validation.valid) {
        console.log('   ✅ Profile valid');
      } else {
        console.log('   ⚠️  Validation errors:', validation.errors);
      }

      console.log('\n=== EXAMPLE COMPLETE ===\n');
    } catch (error) {
      console.error('Example error:', error);
    }
  }

  /**
   * Show how to handle profile switching during a task
   */
  async demonstrateProfileSwitching() {
    console.log('\n=== PROFILE SWITCHING EXAMPLE ===\n');

    try {
      const initialProfile = await agentRuntimeConfigService.getActiveProfile();
      console.log(`Initial profile: ${initialProfile.profile.id}`);

      // Simulate switching to staging profile for more aggressive testing
      console.log('\nSwitching to staging profile...');
      await agentRuntimeConfigService.setActiveProfile('staging');

      const newProfile = await agentRuntimeConfigService.getActiveProfile();
      console.log(`Updated profile: ${newProfile.profile.id}`);

      // Run decisions with new profile
      const shouldTrigger = await shouldLoadLibraryDocsRuntimeDriven('jest');
      console.log(`Jest library trigger (staging): ${shouldTrigger ? 'YES' : 'NO'}`);

      // Rollback to previous
      console.log('\nRolling back to previous profile...');
      await agentRuntimeConfigService.rollback('Demo rollback - switching back');

      const rolledBack = await agentRuntimeConfigService.getActiveProfile();
      console.log(`Rolled back to: ${rolledBack.profile.id}`);
    } catch (error) {
      console.error('Profile switching error:', error);
    }
  }

  /**
   * Show how decision logging works
   */
  async demonstrateDecisionLogging() {
    console.log('\n=== DECISION LOGGING EXAMPLE ===\n');

    try {
      // Check if logging is enabled
      const profile = await agentRuntimeConfigService.getActiveProfile();
      const loggingEnabled = await agentRuntimeConfigService.isDecisionSourceLoggingEnabled();

      console.log(`Decision logging enabled: ${loggingEnabled}`);

      if (loggingEnabled) {
        // Manually log a decision for demonstration
        await agentDecisionIntegrationService.logDecisionSource({
          decisionType: 'demonstration',
          source: 'static',
          value: true,
          reason: 'This is a demo decision for logging purposes',
        });
        console.log('✅ Decision logged successfully');

        // Show logging configuration
        const loggingConfig = await agentRuntimeConfigService.getLogLevel();
        console.log(`Log level: ${loggingConfig}`);
      }
    } catch (error) {
      console.error('Logging error:', error);
    }
  }
}

// ============================================================
// Usage from Agent Code
// ============================================================

/**
 * Example: How to use in your main agent execution loop
 *
 * // In your agent orchestrator or skill router:
 *
 * async function executeAgentTask(task) {
 *   // Decide which skills to load (runtime-driven)
 *   const skills = await selectSkillsRuntimeDriven(task.type);
 *
 *   // For each skill, check if we should auto-load docs
 *   for (const skillName of skills) {
 *     const skills = parseLibrariesFromSkill(skillName);
 *     for (const lib of skills) {
 *       if (await shouldLoadLibraryDocsRuntimeDriven(lib)) {
 *         await Context7Service.fetchLibraryDocs(lib);
 *       }
 *     }
 *   }
 *
 *   // Execute with decision logging
 *   const result = await executeSkills(skills, task);
 *   return result;
 * }
 */

export {
  selectSkillsTraditional,
  selectSkillsRuntimeDriven,
  shouldLoadLibraryDocsTraditional,
  shouldLoadLibraryDocsRuntimeDriven,
  getConfidenceThresholdTraditional,
  getConfidenceThresholdRuntimeDriven,
};
