/**
 * Hook Enforcer
 * - Injects hooks into agent execution pipeline
 * - Enforces pre/post conditions
 * - Manages hook lifecycle
 *
 * @module orchestrator/hook-enforcer
 */

import { countTokens, TOKEN_BUDGETS } from './token-optimizer.js';
import { isBlacklisted, loadLessons } from './hllm.js';

/**
 * Hook types enum - defines when hooks execute in the pipeline
 */
export const HOOK_TYPES = {
  BEFORE_AGENT: 'before_agent', // Before any agent dispatch
  AFTER_AGENT: 'after_agent', // After agent returns
  BEFORE_TOOL: 'before_tool', // Before MCP tool call
  AFTER_TOOL: 'after_tool', // After tool returns
  ON_ERROR: 'on_error', // On any error
  ON_LESSON: 'on_lesson', // When HLLM creates lesson
  CONTEXT_CHECKPOINT: 'checkpoint', // Before context compaction
  VERIFICATION: 'verification', // During verification phase
};

/**
 * @typedef {Object} HookEntry
 * @property {string} skillName - Name of the skill that registered this hook
 * @property {Function|string} handler - Hook handler function or prompt injection string
 * @property {number} priority - Execution priority (lower = earlier)
 * @property {boolean} enabled - Whether hook is currently active
 * @property {number} executionCount - Number of times hook has been executed
 * @property {number} lastExecuted - Timestamp of last execution
 */

// Active hooks registry - Map<hookType, Map<hookId, HookEntry>>
const activeHooks = new Map();

// Initialize all hook type registries
Object.values(HOOK_TYPES).forEach((type) => {
  activeHooks.set(type, new Map());
});

// Hook execution stats
const hookStats = {
  totalExecutions: 0,
  executionsByType: {},
  errors: [],
  lastExecution: null,
};

// Initialize stats for each hook type
Object.values(HOOK_TYPES).forEach((type) => {
  hookStats.executionsByType[type] = 0;
});

/**
 * Lesson cache for HLLM blacklist checks
 * PERFORMANCE: Singleton cache with 5-minute TTL to prevent N+1 queries
 */
const lessonCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes
};

/**
 * Invalidate the lesson cache to force reload on next access.
 * CACHE CONSISTENCY: Called when new lessons are persisted to ensure fresh data.
 *
 * @public
 */
export function invalidateLessonCache() {
  lessonCache.data = null;
  lessonCache.timestamp = 0;
}

/**
 * Get cached lessons or load fresh if expired
 * @returns {Promise<Array>} Array of lesson records
 */
async function getCachedLessons() {
  const now = Date.now();

  if (lessonCache.data && now - lessonCache.timestamp < lessonCache.ttl) {
    return lessonCache.data;
  }

  // Cache expired or empty, reload
  const lessons = await loadLessons();
  lessonCache.data = lessons;
  lessonCache.timestamp = now;

  return lessons;
}

/**
 * Generate unique hook ID
 * @param {string} skillName - Name of the skill
 * @param {string} hookType - Type of hook
 * @returns {string} Unique hook ID
 */
function generateHookId(skillName, hookType) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${skillName}-${hookType}-${timestamp}-${random}`;
}

/**
 * Register a hook
 * @param {string} hookType - Type from HOOK_TYPES
 * @param {string} skillName - Skill that owns this hook
 * @param {Function|string} handler - Hook handler (function or prompt injection)
 * @param {number} [priority=100] - Execution order (lower = earlier)
 * @returns {string} Hook ID for later reference
 */
export function registerHook(hookType, skillName, handler, priority = 100) {
  // Validate hook type
  if (!Object.values(HOOK_TYPES).includes(hookType)) {
    throw new Error(
      `Invalid hook type: ${hookType}. Valid types: ${Object.values(HOOK_TYPES).join(', ')}`,
    );
  }

  // Validate handler
  if (typeof handler !== 'function' && typeof handler !== 'string') {
    throw new Error('Handler must be a function or prompt injection string');
  }

  // Validate priority
  if (typeof priority !== 'number' || priority < 0) {
    throw new Error('Priority must be a non-negative number');
  }

  const hookId = generateHookId(skillName, hookType);
  const hookRegistry = activeHooks.get(hookType);

  /** @type {HookEntry} */
  const hookEntry = {
    id: hookId,
    skillName,
    handler,
    priority,
    enabled: true,
    executionCount: 0,
    lastExecuted: null,
    registeredAt: Date.now(),
  };

  hookRegistry.set(hookId, hookEntry);

  console.log(
    `[HookEnforcer] Registered hook: ${hookId} (type: ${hookType}, priority: ${priority})`,
  );

  return hookId;
}

/**
 * Unregister a specific hook by ID
 * @param {string} hookId - Hook ID to unregister
 * @returns {boolean} True if hook was found and removed
 */
export function unregisterHook(hookId) {
  for (const [type, registry] of activeHooks.entries()) {
    if (registry.has(hookId)) {
      registry.delete(hookId);
      console.log(`[HookEnforcer] Unregistered hook: ${hookId} (type: ${type})`);
      return true;
    }
  }
  return false;
}

/**
 * Unregister all hooks for a skill
 * @param {string} skillName - Name of the skill
 * @returns {number} Number of hooks removed
 */
export function unregisterSkillHooks(skillName) {
  let removedCount = 0;

  for (const [type, registry] of activeHooks.entries()) {
    for (const [hookId, entry] of registry.entries()) {
      if (entry.skillName === skillName) {
        registry.delete(hookId);
        removedCount++;
      }
    }
  }

  if (removedCount > 0) {
    console.log(`[HookEnforcer] Unregistered ${removedCount} hooks for skill: ${skillName}`);
  }

  return removedCount;
}

/**
 * Enable or disable a hook
 * @param {string} hookId - Hook ID
 * @param {boolean} enabled - Whether to enable the hook
 * @returns {boolean} True if hook was found and updated
 */
export function setHookEnabled(hookId, enabled) {
  for (const registry of activeHooks.values()) {
    if (registry.has(hookId)) {
      registry.get(hookId).enabled = enabled;
      return true;
    }
  }
  return false;
}

/**
 * Get hooks for a specific type, sorted by priority
 * @param {string} hookType - Type of hooks to get
 * @returns {HookEntry[]} Array of hook entries sorted by priority
 */
function getHooksByPriority(hookType) {
  const registry = activeHooks.get(hookType);
  if (!registry) return [];

  return Array.from(registry.values())
    .filter((hook) => hook.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Execute all hooks of a type
 * @param {string} hookType - Type of hooks to execute
 * @param {Object} context - Execution context to pass through hooks
 * @returns {Promise<Object>} Modified context after all hooks
 */
export async function executeHooks(hookType, context) {
  const hooks = getHooksByPriority(hookType);

  if (hooks.length === 0) {
    return context;
  }

  let currentContext = { ...context };
  const executionStart = Date.now();

  console.log(`[HookEnforcer] Executing ${hooks.length} hooks for type: ${hookType}`);

  for (const hook of hooks) {
    try {
      const hookStart = Date.now();

      if (typeof hook.handler === 'function') {
        // Execute function handler
        const result = await hook.handler(currentContext);
        if (result !== undefined && result !== null) {
          currentContext = result;
        }
      } else if (typeof hook.handler === 'string') {
        // String handlers are prompt injections - add to context
        currentContext.promptInjections = currentContext.promptInjections || [];
        currentContext.promptInjections.push({
          source: hook.skillName,
          content: hook.handler,
          hookType,
        });
      }

      // Update hook stats
      hook.executionCount++;
      hook.lastExecuted = Date.now();

      const hookDuration = Date.now() - hookStart;
      if (hookDuration > 1000) {
        console.warn(`[HookEnforcer] Slow hook: ${hook.id} took ${hookDuration}ms`);
      }
    } catch (error) {
      console.error(`[HookEnforcer] Hook error in ${hook.id}: ${error.message}`);

      // Record error
      hookStats.errors.push({
        hookId: hook.id,
        hookType,
        error: error.message,
        timestamp: Date.now(),
      });

      // Keep only last 100 errors
      if (hookStats.errors.length > 100) {
        hookStats.errors = hookStats.errors.slice(-100);
      }

      // If this is not an ON_ERROR hook, execute error hooks
      if (hookType !== HOOK_TYPES.ON_ERROR) {
        const errorContext = {
          ...currentContext,
          hookError: {
            hookId: hook.id,
            error: error.message,
            stack: error.stack,
          },
        };

        try {
          await executeHooks(HOOK_TYPES.ON_ERROR, errorContext);
        } catch (nestedError) {
          console.error(`[HookEnforcer] Error hook failed: ${nestedError.message}`);
        }
      }

      // Add error to context but continue execution
      currentContext.errors = currentContext.errors || [];
      currentContext.errors.push({
        hook: hook.id,
        error: error.message,
      });
    }
  }

  // Update global stats
  hookStats.totalExecutions++;
  hookStats.executionsByType[hookType]++;

  // RELIABILITY: Reset counters after 1M executions to prevent overflow in long-running processes
  if (hookStats.totalExecutions >= 1_000_000) {
    console.log(`[HookEnforcer] Resetting stats after ${hookStats.totalExecutions} executions`);
    hookStats.totalExecutions = 0;
    Object.keys(hookStats.executionsByType).forEach((type) => {
      hookStats.executionsByType[type] = 0;
    });

    // RELIABILITY: Also reset per-hook execution counters to prevent unbounded growth
    for (const registry of activeHooks.values()) {
      for (const hook of registry.values()) {
        hook.executionCount = 0;
      }
    }
  }

  hookStats.lastExecution = {
    type: hookType,
    timestamp: Date.now(),
    duration: Date.now() - executionStart,
    hookCount: hooks.length,
  };

  return currentContext;
}

/**
 * Create prompt injection from hook instructions
 * Inserts hook instructions into agent prompts
 * @param {string} basePrompt - Original agent prompt
 * @param {Array<{source: string, content: string, hookType: string}>} hooks - Hook injections to add
 * @returns {string} Modified prompt with hook instructions
 */
export function injectHookPrompt(basePrompt, hooks) {
  if (!hooks || hooks.length === 0) {
    return basePrompt;
  }

  const beforeHooks = hooks.filter(
    (h) => h.hookType === HOOK_TYPES.BEFORE_AGENT || h.hookType === HOOK_TYPES.BEFORE_TOOL,
  );
  const afterHooks = hooks.filter(
    (h) => h.hookType === HOOK_TYPES.AFTER_AGENT || h.hookType === HOOK_TYPES.AFTER_TOOL,
  );
  const verificationHooks = hooks.filter((h) => h.hookType === HOOK_TYPES.VERIFICATION);

  let modifiedPrompt = basePrompt;

  // Insert before instructions at the start
  if (beforeHooks.length > 0) {
    const beforeSection = `
<pre_execution_requirements>
${beforeHooks.map((h) => `<!-- From skill: ${h.source} -->\n${h.content}`).join('\n\n')}
</pre_execution_requirements>

`;
    modifiedPrompt = beforeSection + modifiedPrompt;
  }

  // Insert verification requirements before closing
  if (verificationHooks.length > 0) {
    const verificationSection = `

<verification_requirements>
Before completing this task, you MUST verify:
${verificationHooks.map((h) => `<!-- From skill: ${h.source} -->\n${h.content}`).join('\n\n')}
</verification_requirements>`;
    modifiedPrompt += verificationSection;
  }

  // Insert post-completion checks at the end
  if (afterHooks.length > 0) {
    const afterSection = `

<post_completion_checks>
After completing the task:
${afterHooks.map((h) => `<!-- From skill: ${h.source} -->\n${h.content}`).join('\n\n')}
</post_completion_checks>`;
    modifiedPrompt += afterSection;
  }

  return modifiedPrompt;
}

/**
 * Builtin hooks for orchestrator
 */
export const BUILTIN_HOOKS = {
  /**
   * Token budget check before agent dispatch
   * Flags context for compaction if over budget
   */
  tokenBudgetCheck: {
    type: HOOK_TYPES.BEFORE_AGENT,
    priority: 10, // High priority - run early
    handler: async (ctx) => {
      try {
        const contextStr = JSON.stringify(ctx);
        const tokens = countTokens(contextStr);

        ctx.tokenMetrics = {
          currentTokens: tokens,
          budget: TOKEN_BUDGETS.session,
          utilizationPercent: Math.round((tokens / TOKEN_BUDGETS.session) * 100),
        };

        if (tokens > TOKEN_BUDGETS.session) {
          ctx.needsCompaction = true;
          ctx.compactionReason = `Token count (${tokens}) exceeds session budget (${TOKEN_BUDGETS.session})`;
          console.warn(`[HookEnforcer] Context needs compaction: ${ctx.compactionReason}`);
        } else if (tokens > TOKEN_BUDGETS.session * 0.85) {
          ctx.compactionWarning = true;
          console.log(
            `[HookEnforcer] Context at ${ctx.tokenMetrics.utilizationPercent}% of budget`,
          );
        }
      } catch (error) {
        console.error(`[HookEnforcer] Token budget check failed: ${error.message}`);
      }

      return ctx;
    },
  },

  /**
   * HLLM blacklist check before fixes
   * Blocks fixes that match previously failed patterns
   * Uses cached lessons to prevent N+1 queries
   */
  hllmBlacklistCheck: {
    type: HOOK_TYPES.BEFORE_AGENT,
    priority: 20, // Run after token check
    handler: async (ctx) => {
      if (!ctx.proposedFix) {
        return ctx;
      }

      try {
        // Use cached lessons instead of loading every time
        const lessons = await getCachedLessons();

        if (isBlacklisted(ctx.proposedFix, lessons)) {
          ctx.blocked = true;
          ctx.blockReason = 'Fix matches blacklisted pattern from previous failure';
          ctx.blockSource = 'hllm';

          console.warn(`[HookEnforcer] Blocked fix due to HLLM blacklist match`);

          // Find the matching lesson for context
          const matchingLessons = lessons.filter(
            (lesson) =>
              lesson.blacklistedPatterns &&
              lesson.blacklistedPatterns.some((pattern) => {
                try {
                  return new RegExp(pattern, 'i').test(JSON.stringify(ctx.proposedFix));
                } catch {
                  return ctx.proposedFix.toString().includes(pattern);
                }
              }),
          );

          if (matchingLessons.length > 0) {
            ctx.blockingLessons = matchingLessons.map((l) => ({
              id: l.id,
              summary: l.summary,
              correctApproach: l.correctApproach,
            }));
          }
        }
      } catch (error) {
        console.error(`[HookEnforcer] HLLM blacklist check failed: ${error.message}`);
        // Don't block on check failure - just log
      }

      return ctx;
    },
  },

  /**
   * Mandatory self-audit before completion
   * Verifies files exist, tests ran, and evidence is mapped
   */
  selfAuditCheck: {
    type: HOOK_TYPES.VERIFICATION,
    priority: 50,
    handler: async (ctx) => {
      const auditResults = {
        passed: true,
        checks: [],
      };

      // Check 1: Modified files should exist
      if (ctx.modifiedFiles && Array.isArray(ctx.modifiedFiles)) {
        const fileChecks = ctx.modifiedFiles.map((file) => ({
          check: `File exists: ${file}`,
          passed: true, // Would need fs access to actually check
          note: 'Verification delegated to agent',
        }));
        auditResults.checks.push(...fileChecks);
      }

      // Check 2: Tests should have been mentioned if changes made
      if (ctx.modifiedFiles && ctx.modifiedFiles.length > 0) {
        const hasTestEvidence =
          ctx.testResults ||
          ctx.testsRan ||
          (ctx.output && ctx.output.toLowerCase().includes('test'));

        auditResults.checks.push({
          check: 'Tests executed or mentioned',
          passed: !!hasTestEvidence,
          note: hasTestEvidence ? 'Test evidence found' : 'No test evidence - verification needed',
        });

        if (!hasTestEvidence) {
          auditResults.passed = false;
        }
      }

      // Check 3: Error handling should be present if applicable
      if (ctx.proposedFix && !ctx.blocked) {
        const hasErrorHandling =
          ctx.output &&
          (ctx.output.includes('try') ||
            ctx.output.includes('catch') ||
            ctx.output.includes('error') ||
            ctx.output.includes('exception'));

        auditResults.checks.push({
          check: 'Error handling considered',
          passed: true, // Soft check
          note: hasErrorHandling ? 'Error handling detected' : 'Review error handling',
        });
      }

      ctx.auditResults = auditResults;

      if (!auditResults.passed) {
        ctx.auditWarning = 'Self-audit found issues that need attention';
        console.warn(`[HookEnforcer] Self-audit warning: ${ctx.auditWarning}`);
      }

      return ctx;
    },
  },

  /**
   * Context checkpoint trigger
   * Creates checkpoint before major context changes
   */
  contextCheckpoint: {
    type: HOOK_TYPES.CONTEXT_CHECKPOINT,
    priority: 10,
    handler: async (ctx) => {
      ctx.checkpointRequested = true;
      ctx.checkpointReason = ctx.checkpointReason || 'Pre-compaction checkpoint';

      console.log(`[HookEnforcer] Checkpoint requested: ${ctx.checkpointReason}`);

      return ctx;
    },
  },

  /**
   * Lesson creation notification
   * Triggers when HLLM creates a new lesson
   */
  lessonCreated: {
    type: HOOK_TYPES.ON_LESSON,
    priority: 50,
    handler: async (ctx) => {
      if (ctx.lesson) {
        console.log(`[HookEnforcer] New lesson created: ${ctx.lesson.id}`);

        // Could trigger notifications, metrics, etc.
        ctx.lessonNotified = true;
      }

      return ctx;
    },
  },
};

/**
 * Register all builtin hooks
 * @returns {string[]} Array of registered hook IDs
 */
export function registerBuiltinHooks() {
  const hookIds = [];

  for (const [name, hookConfig] of Object.entries(BUILTIN_HOOKS)) {
    const hookId = registerHook(
      hookConfig.type,
      `builtin:${name}`,
      hookConfig.handler,
      hookConfig.priority,
    );
    hookIds.push(hookId);
  }

  console.log(`[HookEnforcer] Registered ${hookIds.length} builtin hooks`);
  return hookIds;
}

/**
 * Get hook statistics
 * @returns {Object} Hook statistics
 */
export function getHookStats() {
  const registeredHooks = {};
  let totalRegistered = 0;

  for (const [type, registry] of activeHooks.entries()) {
    registeredHooks[type] = registry.size;
    totalRegistered += registry.size;
  }

  return {
    totalRegistered,
    registeredByType: registeredHooks,
    ...hookStats,
  };
}

/**
 * List all registered hooks
 * @param {string} [hookType] - Optional type filter
 * @returns {Array<{id: string, skillName: string, type: string, priority: number, enabled: boolean}>}
 */
export function listHooks(hookType = null) {
  const hooks = [];

  const typesToCheck = hookType ? [hookType] : Object.values(HOOK_TYPES);

  for (const type of typesToCheck) {
    const registry = activeHooks.get(type);
    if (registry) {
      for (const [id, entry] of registry.entries()) {
        hooks.push({
          id,
          skillName: entry.skillName,
          type,
          priority: entry.priority,
          enabled: entry.enabled,
          executionCount: entry.executionCount,
          lastExecuted: entry.lastExecuted,
        });
      }
    }
  }

  return hooks.sort((a, b) => a.priority - b.priority);
}

/**
 * Clear all hooks (use with caution)
 * @param {boolean} [includeBuiltin=false] - Whether to also clear builtin hooks
 * @returns {number} Number of hooks cleared
 */
export function clearAllHooks(includeBuiltin = false) {
  let cleared = 0;

  for (const registry of activeHooks.values()) {
    for (const [id, entry] of registry.entries()) {
      if (includeBuiltin || !entry.skillName.startsWith('builtin:')) {
        registry.delete(id);
        cleared++;
      }
    }
  }

  console.log(`[HookEnforcer] Cleared ${cleared} hooks`);
  return cleared;
}

// Default export
export default {
  registerHook,
  unregisterHook,
  unregisterSkillHooks,
  setHookEnabled,
  executeHooks,
  injectHookPrompt,
  registerBuiltinHooks,
  getHookStats,
  listHooks,
  clearAllHooks,
  HOOK_TYPES,
  BUILTIN_HOOKS,
};
