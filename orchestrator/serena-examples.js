/**
 * Serena Integration Examples
 *
 * Practical examples showing how to leverage Serena's capabilities
 * within the orchestrator's agent coordination workflows.
 *
 * @module orchestrator/serena-examples
 * @version 1.0.0
 */

import SerenaEnhancedDispatcher from './serena-dispatcher.js';
import { SerenaIntegrationManager } from './serena-integration.js';

// Example 1: Symbol-Based Feature Implementation
// ================================================
// Scenario: Need to implement a feature that extends an existing class

export async function exampleExtendExistingClass() {
  const serena = new SerenaIntegrationManager();
  const dispatcher = new SerenaEnhancedDispatcher();

  // Step 1: Understand the existing class structure
  console.log('Step 1: Analyzing UserService class...');
  const userServiceSymbols = await serena.getSymbolsOverview(
    'server/services/UserService.ts',
    2
  );

  // Step 2: Identify which methods to extend
  const implementTask = await dispatcher.route(
    'extend UserService with new authentication methods',
    {
      filePath: 'server/services/UserService.ts',
      symbolName: 'UserService',
      extension: 'authentication',
      context: userServiceSymbols, // Rich context for coder agent
    }
  );

  // Step 3: Delegate to coder with context
  // return orchestrator.delegateTo('coder', implementTask);
  return implementTask;
}

// Example 2: Safe Refactoring with Validation
// =============================================
// Scenario: Rename a function used across multiple files

export async function exampleSafeRenaming() {
  const serena = new SerenaIntegrationManager();
  const dispatcher = new SerenaEnhancedDispatcher();

  const oldName = 'parseUserInput';
  const filePath = 'server/utils/validation.ts';

  // Step 1: Find all references
  console.log('Step 1: Finding all references...');
  const references = await serena.findReferencingSymbols(oldName, filePath);

  // Step 2: Validate it's safe to rename
  if (references.error === 'No references found') {
    console.log('Safe to rename - no external references');
  } else {
    console.log(`Found ${references.count} references. Preparing safe rename...`);
  }

  // Step 3: Route safe refactoring
  const refactorTask = await dispatcher.route(
    `rename ${oldName} to validateUserInput`,
    {
      operation: 'rename',
      symbolName: oldName,
      filePath: filePath,
      newName: 'validateUserInput',
    }
  );

  // Step 4: Delegate with validation context
  // return orchestrator.delegateTo('coder', refactorTask);
  return refactorTask;
}

// Example 3: Architecture Discovery for Code Review
// ==================================================
// Scenario: Analyze architecture before implementing a major feature

export async function exampleArchitectureReview() {
  const serena = new SerenaIntegrationManager();

  const keyFiles = [
    'server/services/AuthService.ts',
    'server/models/User.ts',
    'server/routes/auth.ts',
    'server/middleware/authMiddleware.ts',
  ];

  // Get comprehensive architecture summary
  console.log('Analyzing architecture...');
  const archSummary = await serena.generateCodebaseSummary(keyFiles);

  // Each file's symbols are ready for parallel MCP execution
  return {
    type: 'architecture-review',
    files: keyFiles,
    toolBatch: archSummary.tools,
    description: 'Parallel symbol discovery for architecture analysis',
  };
}

// Example 4: Pattern-Based Bulk Refactoring
// ==========================================
// Scenario: Find all old-style imports and schedule bulk conversion

export async function exampleBulkRefactoring() {
  const serena = new SerenaIntegrationManager();
  const dispatcher = new SerenaEnhancedDispatcher();

  // Find all CommonJS requires
  console.log('Step 1: Finding all CommonJS require() calls...');
  const requirePatterns = await serena.searchForPattern(
    'const\\s+(\\w+)\\s*=\\s*require\\s*\\(',
    {
      isRegex: true,
      codeFilesOnly: true,
    }
  );

  // Schedule refactoring for each match
  const refactorTasks = [];
  for (const match of requirePatterns.results || []) {
    const task = await dispatcher.route('convert to ESM import', {
      filePath: match.file,
      operation: 'convert-import',
      pattern: match.pattern,
    });
    refactorTasks.push(task);
  }

  return {
    type: 'bulk-refactoring',
    totalMatches: requirePatterns.results?.length || 0,
    tasks: refactorTasks,
    description: 'Parallel refactoring tasks for import conversion',
  };
}

// Example 5: Lesson Learning and Memory Integration
// =================================================
// Scenario: Persist lessons learned and make them discoverable

export async function exampleLessonPersistence() {
  const serena = new SerenaIntegrationManager();

  // Sample lesson from a failed fix
  const lessonRecord = {
    id: 'race-condition-usestate-2026-04-12',
    failed_command: 'npm test -- src/components/__tests__/Form.test.ts',
    attempted_fix: 'Added null check in handleSubmit',
    root_cause: 'Race condition between state update and async operation',
    blacklisted_pattern: 'null.*check.*setState.*async',
    prevention_rule: 'Use useEffect cleanup function or AbortController for async operations',
  };

  // Persist as both HLLM lesson and Serena memory
  console.log('Step 1: Persisting lesson as Serena memory...');
  const memoryResult = await serena.persistLessonAsMemory(lessonRecord);

  // Also write a pattern-specific memory
  console.log('Step 2: Writing pattern-specific guidance...');
  const patternMemory = await serena.writeMemory(
    'patterns/react-async-state-sync',
    `
# React Async State Synchronization Pattern

## Problem
State updates from async operations can race with component unmounting or re-renders.

## Solution
Use useEffect cleanup or AbortController to prevent stale updates.

## Example
\`\`\`javascript
useEffect(() => {
  let isMounted = true;
  
  async function fetchData() {
    const result = await fetch(...);
    if (isMounted) {
      setState(result);
    }
  }
  
  fetchData();
  return () => { isMounted = false; };
}, [dependencies]);
\`\`\`

## Reference
- Lesson: race-condition-usestate-2026-04-12
- Prevention Rule: Use useEffect cleanup function
    `
  );

  return {
    type: 'lesson-persistence',
    lesson: lessonRecord,
    memoryResults: { lesson: memoryResult, pattern: patternMemory },
  };
}

// Example 6: Dynamic Hook Discovery
// ==================================
// Scenario: Automatically discover and register custom hooks

export async function exampleHookDiscovery() {
  const serena = new SerenaIntegrationManager();

  // Find all hook implementations
  console.log('Discovering custom hooks...');
  const hooksSearch = await serena.searchForPattern(
    'function\\s+(use[A-Z]\\w*)\\s*\\([^)]*\\)',
    {
      isRegex: true,
      relativePath: 'client/src/hooks',
    }
  );

  // Get detailed symbol info for each hook
  const hooks = [];
  for (const match of hooksSearch.results || []) {
    const hookName = match.captured[0];
    const symbol = await serena.findSymbol(
      hookName,
      match.file,
      true // Include body for understanding
    );
    
    hooks.push({
      name: hookName,
      file: match.file,
      symbol: symbol,
    });
  }

  return {
    type: 'hook-discovery',
    discoveredHooks: hooks,
    description: 'Auto-discovered custom React hooks for registration',
  };
}

// Example 7: Code Quality Analysis
// =================================
// Scenario: Analyze code complexity and identify refactoring opportunities

export async function exampleCodeQualityAnalysis() {
  const serena = new SerenaIntegrationManager();
  const dispatcher = new SerenaEnhancedDispatcher();

  const filePath = 'server/services/PaymentService.ts';

  // Get comprehensive symbol structure
  console.log('Analyzing code structure...');
  const symbols = await serena.getSymbolsOverview(filePath, 3);

  // Find long methods (>50 lines)
  const longMethodSearch = await serena.searchForPattern(
    'async\\s+\\w+\\s*\\(.*?\\)\\s*\\{[\\s\\S]{50,}\\}',
    {
      isRegex: true,
      relativePath: filePath,
      contextBefore: 1,
      contextAfter: 1,
    }
  );

  // Route to Thinker pro for strategic analysis
  const analysisTask = await dispatcher.route(
    'analyze code quality and suggest refactorings',
    {
      filePath,
      depth: 3,
      codeContext: { symbols },
      longMethods: longMethodSearch.results,
    }
  );

  return {
    type: 'quality-analysis',
    file: filePath,
    analysisTask,
    description: 'Comprehensive code quality analysis with refactoring suggestions',
  };
}

// Example 8: Feature Integration with Codebase
// =============================================
// Scenario: Before implementing a new feature, understand integration points

export async function exampleFeatureIntegration() {
  const serena = new SerenaIntegrationManager();

  // Feature: Add email notifications
  const featureName = 'email-notifications';

  // Find existing event systems
  console.log('Finding event/hook integration points...');
  const eventPatterns = await serena.searchForPattern(
    '(emit|on|subscribe|listener|handler)',
    {
      isRegex: true,
      codeFilesOnly: true,
    }
  );

  // Find existing notification patterns
  const notificationPatterns = await serena.searchForPattern(
    '(notification|alert|message|notify)',
    {
      isRegex: true,
      codeFilesOnly: true,
    }
  );

  // Find middleware/plugin architecture
  const middlewareSymbols = await serena.getSymbolsOverview(
    'server/middleware',
    2
  );

  return {
    type: 'feature-integration',
    feature: featureName,
    integrationPoints: {
      eventSystems: eventPatterns.results,
      existingNotifications: notificationPatterns.results,
      middleware: middlewareSymbols,
    },
    description: 'Integration points for new feature implementation',
  };
}

// Main orchestration example
// ==========================
export async function orchestrateWithSerena() {
  console.log('=== Orchestrator with Serena Integration ===\n');

  const examples = [
    { name: 'Extend Existing Class', fn: exampleExtendExistingClass },
    { name: 'Safe Refactoring', fn: exampleSafeRenaming },
    { name: 'Architecture Review', fn: exampleArchitectureReview },
    { name: 'Bulk Refactoring', fn: exampleBulkRefactoring },
    { name: 'Lesson Persistence', fn: exampleLessonPersistence },
    { name: 'Hook Discovery', fn: exampleHookDiscovery },
    { name: 'Code Quality Analysis', fn: exampleCodeQualityAnalysis },
    { name: 'Feature Integration', fn: exampleFeatureIntegration },
  ];

  for (const example of examples) {
    try {
      console.log(`\n>>> ${example.name}`);
      const result = await example.fn();
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`Error in ${example.name}:`, error.message);
    }
  }
}

// Export for testing
export default {
  exampleExtendExistingClass,
  exampleSafeRenaming,
  exampleArchitectureReview,
  exampleBulkRefactoring,
  exampleLessonPersistence,
  exampleHookDiscovery,
  exampleCodeQualityAnalysis,
  exampleFeatureIntegration,
  orchestrateWithSerena,
};
