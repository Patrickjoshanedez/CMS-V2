/**
 * Orchestrator Enhancement Module
 *
 * Main entry point for token optimization, HLLM, memory management,
 * skill scraping, hook enforcement, and ability management.
 * Provides a unified API for managing context windows, learning from failures,
 * routing data across memory tiers, and dynamically extending agent capabilities.
 *
 * @module orchestrator
 * @version 1.1.0
 */

// Token Optimization
import {
  boundOutput,
  compressToolOutput,
  countTokens,
  decodeTokens,
  truncateToTokenBudget,
  enforceBudget,
  getTokenStats,
  getAdaptiveBudgets,
  TOKEN_BUDGETS,
} from './token-optimizer.js';

// Historic Lesson Learning Mechanism
import {
  LESSON_SCHEMA,
  isBlacklisted,
  createLessonRecord,
  persistLesson,
  loadLessons,
  formatLessonXML,
  formatLessonMarkdown,
  searchLessons,
  getLessonStats,
  clearCache as clearLessonCache,
} from './hllm.js';

// Memory Tiers
import {
  TIERS,
  classifyData,
  routeToTier,
  retrieveFromTier,
  evictStale,
  promoteContext,
  persistFact,
  getAllFacts,
  getTierStats,
  clearTier,
} from './memory-tiers.js';

// Context Compactor
import {
  compactHistory,
  createCheckpoint,
  loadCheckpoint,
  getLatestCheckpoint,
  prepareForNewConversation,
  compactToolOutput,
} from './context-compactor.js';

// Skill Scraper - Dynamic ability fetching from trusted sources
import * as skillScraper from './skill-scraper.js';

// Hook Enforcer - Pipeline hooks and enforcement
import * as hookEnforcer from './hook-enforcer.js';

// Ability Manager - Skill lifecycle and instruction injection
import * as abilityManager from './ability-manager.js';

// Serena Integration - Semantic code exploration and symbol management
import {
  SerenaIntegrationManager,
  SerenaAbilityDiscovery,
  SerenaDispatcherRouter,
} from './serena-integration.js';

// Local AI fast-path - isolated opt-in route for low-complexity tasks
import {
  isClearlyLowComplexity,
  shouldUseLocalFastPath,
  runLocalFastPath,
} from './local-fast-path.js';

/**
 * Initialize the orchestrator module.
 * Creates required directories, loads existing lessons,
 * and registers builtin hooks.
 *
 * @returns {Promise<Object>} Initialization result
 */
export async function initialize() {
  const results = {
    lessons: 0,
    tiers: {},
    hooks: 0,
    skills: 0,
    errors: [],
  };

  try {
    // Load existing lessons
    const lessons = await loadLessons();
    results.lessons = lessons.length;

    // Get tier stats (also ensures directories exist)
    results.tiers = getTierStats();

    // Run stale eviction
    const evictionResult = evictStale();
    results.evicted = evictionResult.evicted;

    // Register builtin hooks
    const hookIds = hookEnforcer.registerBuiltinHooks();
    results.hooks = hookIds.length;

    // Load installed skills count
    const skills = await abilityManager.listSkills();
    results.skills = skills.length;
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Get a comprehensive status report.
 *
 * @returns {Promise<Object>} Status report
 */
export async function getStatus() {
  const registryStats = await abilityManager.getRegistryStats().catch(() => null);

  return {
    tokenBudgets: TOKEN_BUDGETS,
    tierStats: getTierStats(),
    lessonStats: getLessonStats(),
    latestCheckpoint: getLatestCheckpoint()?.checkpointId || null,
    hookStats: hookEnforcer.getHookStats(),
    abilityRegistry: registryStats,
  };
}

// Re-export everything for unified access
export {
  // Token Optimization
  boundOutput,
  compressToolOutput,
  countTokens,
  decodeTokens,
  truncateToTokenBudget,
  enforceBudget,
  getTokenStats,
  getAdaptiveBudgets,
  TOKEN_BUDGETS,

  // HLLM
  LESSON_SCHEMA,
  isBlacklisted,
  createLessonRecord,
  persistLesson,
  loadLessons,
  formatLessonXML,
  formatLessonMarkdown,
  searchLessons,
  getLessonStats,
  clearLessonCache,

  // Memory Tiers
  TIERS,
  classifyData,
  routeToTier,
  retrieveFromTier,
  evictStale,
  promoteContext,
  persistFact,
  getAllFacts,
  getTierStats,
  clearTier,

  // Context Compactor
  compactHistory,
  createCheckpoint,
  loadCheckpoint,
  getLatestCheckpoint,
  prepareForNewConversation,
  compactToolOutput,

  // Skill Scraper Module
  skillScraper,

  // Hook Enforcer Module
  hookEnforcer,

  // Ability Manager Module
  abilityManager,

  // Serena Integration
  SerenaIntegrationManager,
  SerenaAbilityDiscovery,
  SerenaDispatcherRouter,

  // Local AI fast-path
  isClearlyLowComplexity,
  shouldUseLocalFastPath,
  runLocalFastPath,
};

// Default export with all functionality
export default {
  // Initialization
  initialize,
  getStatus,

  // Token Optimization
  boundOutput,
  compressToolOutput,
  countTokens,
  decodeTokens,
  truncateToTokenBudget,
  enforceBudget,
  getTokenStats,
  getAdaptiveBudgets,
  TOKEN_BUDGETS,

  // HLLM
  LESSON_SCHEMA,
  isBlacklisted,
  createLessonRecord,
  persistLesson,
  loadLessons,
  formatLessonXML,
  formatLessonMarkdown,
  searchLessons,
  getLessonStats,
  clearLessonCache,

  // Memory Tiers
  TIERS,
  classifyData,
  routeToTier,
  retrieveFromTier,
  evictStale,
  promoteContext,
  persistFact,
  getAllFacts,
  getTierStats,
  clearTier,

  // Context Compactor
  compactHistory,
  createCheckpoint,
  loadCheckpoint,
  getLatestCheckpoint,
  prepareForNewConversation,
  compactToolOutput,

  // Skill Scraper Module
  skillScraper,

  // Hook Enforcer Module
  hookEnforcer,

  // Ability Manager Module
  abilityManager,

  // Serena Integration
  SerenaIntegrationManager,
  SerenaAbilityDiscovery,
  SerenaDispatcherRouter,

  // Local AI fast-path
  isClearlyLowComplexity,
  shouldUseLocalFastPath,
  runLocalFastPath,
};
