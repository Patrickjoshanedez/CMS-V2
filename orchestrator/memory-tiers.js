/**
 * Three-Tier Memory Router
 *
 * Routes data to appropriate storage tier based on volatility and persistence needs:
 * - Working: Volatile, immediate context with auto-eviction
 * - Session: Mid-term durable context within session
 * - LongTerm: Persistent facts across sessions
 *
 * @module orchestrator/memory-tiers
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  statSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { countTokens, TOKEN_BUDGETS, enforceBudget } from './token-optimizer.js';

// Get current directory for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Tier configuration with paths and TTL settings
 * @constant {Object}
 */
export const TIERS = {
  working: {
    path: join(PROJECT_ROOT, 'context', 'working'),
    ttl: 300000, // 5 minutes TTL
    maxEntries: 50, // Max entries before forced eviction
    tokenBudget: TOKEN_BUDGETS.working,
  },
  session: {
    path: join(PROJECT_ROOT, 'context', 'session'),
    ttl: null, // No automatic TTL
    maxEntries: 200,
    tokenBudget: TOKEN_BUDGETS.session,
  },
  longTerm: {
    path: join(PROJECT_ROOT, 'memories', 'repo'),
    ttl: null, // Persistent
    maxEntries: null, // No limit
    tokenBudget: TOKEN_BUDGETS.longTerm,
  },
};

/**
 * In-memory index of working context for fast access
 * @type {Map<string, {value: any, timestamp: number, tokens: number}>}
 */
const workingIndex = new Map();

/**
 * Classification rules for automatic tier routing
 */
const CLASSIFICATION_RULES = {
  // Patterns that indicate working (volatile) context
  working: [/^temp_/i, /^scratch_/i, /^debug_/i, /current_task/i, /intermediate_/i],
  // Patterns that indicate session context
  session: [/^task_/i, /^state_/i, /^progress_/i, /conversation_/i, /checkpoint_/i],
  // Patterns that indicate long-term memory
  longTerm: [
    /^fact_/i,
    /^rule_/i,
    /^lesson_/i,
    /^preference_/i,
    /^pattern_/i,
    /architecture/i,
    /convention/i,
  ],
};

/**
 * Ensure tier directory exists
 * @param {string} tier - Tier name
 * @returns {boolean} True if directory exists or was created successfully
 */
function ensureTierDir(tier) {
  const tierConfig = TIERS[tier];
  if (!tierConfig) {
    console.warn(`Unknown tier: ${tier}`);
    return false;
  }

  try {
    if (!existsSync(tierConfig.path)) {
      mkdirSync(tierConfig.path, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Failed to create tier directory ${tierConfig.path}:`, error.message);
    return false;
  }
}

/**
 * Classify data to determine appropriate tier.
 * Uses key patterns, data characteristics, and explicit hints.
 *
 * @param {string} key - Data key
 * @param {any} data - Data to classify
 * @param {Object} [hints] - Optional classification hints
 * @returns {string} Tier name: 'working', 'session', or 'longTerm'
 */
export function classifyData(key, data, hints = {}) {
  // Ensure hints is an object
  const safeHints = hints || {};

  // Explicit tier hint takes precedence
  if (safeHints.tier && TIERS[safeHints.tier]) {
    return safeHints.tier;
  }

  // Check key against classification rules
  for (const [tier, patterns] of Object.entries(CLASSIFICATION_RULES)) {
    for (const pattern of patterns) {
      if (pattern.test(key)) {
        return tier;
      }
    }
  }

  // Check data characteristics
  if (typeof data === 'object' && data !== null) {
    // Has TTL hint
    if (data._ttl !== undefined) {
      return data._ttl < 600000 ? 'working' : 'session';
    }

    // Has persistence flag
    if (data._persistent === true) {
      return 'longTerm';
    }

    // Large data goes to session (not working)
    const tokens = countTokens(JSON.stringify(data));
    if (tokens > TOKEN_BUDGETS.working / 2) {
      return 'session';
    }
  }

  // Default to working for transient data
  return 'working';
}

/**
 * Route data to appropriate tier based on classification.
 *
 * @param {string} key - Unique key for the data
 * @param {any} data - Data to store
 * @param {string|Object} classification - Tier name or classification hints
 * @returns {Object} Result with tier, path, and success status
 *
 * @example
 * // Auto-classify
 * routeToTier('temp_calculation', { result: 42 });
 *
 * // Explicit tier
 * routeToTier('user_preference', { theme: 'dark' }, 'longTerm');
 */
export function routeToTier(key, data, classification = null) {
  // Determine tier
  let tier;
  if (typeof classification === 'string' && TIERS[classification]) {
    tier = classification;
  } else {
    const hints = typeof classification === 'object' ? classification : {};
    tier = classifyData(key, data, hints);
  }

  // Ensure tier directory exists
  const dirCreated = ensureTierDir(tier);
  if (!dirCreated) {
    return {
      success: false,
      tier,
      error: `Failed to create directory for tier: ${tier}`,
    };
  }

  const tierConfig = TIERS[tier];
  const timestamp = Date.now();

  // Prepare data envelope
  const envelope = {
    key,
    value: data,
    timestamp,
    tier,
    _meta: {
      storedAt: new Date(timestamp).toISOString(),
      tokens: countTokens(JSON.stringify(data)),
      ttl: tierConfig.ttl,
    },
  };

  try {
    // Write to tier storage
    const filename = `${sanitizeKey(key)}.json`;
    const filePath = join(tierConfig.path, filename);

    // Ensure parent directory exists (additional safety)
    const parentDir = dirname(filePath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    writeFileSync(filePath, JSON.stringify(envelope, null, 2), 'utf-8');

    // Verify file was written
    if (!existsSync(filePath)) {
      return {
        success: false,
        tier,
        error: 'File was not created after write operation',
      };
    }

    // Update in-memory index for working tier
    if (tier === 'working') {
      workingIndex.set(key, {
        value: data,
        timestamp,
        tokens: envelope._meta.tokens,
        filePath,
      });
    }

    return {
      success: true,
      tier,
      filePath,
      tokens: envelope._meta.tokens,
    };
  } catch (error) {
    return {
      success: false,
      tier,
      error: error.message,
    };
  }
}

/**
 * Retrieve data from any tier.
 *
 * @param {string} key - Data key
 * @param {string} [tier] - Specific tier to search (searches all if not specified)
 * @returns {Object|null} Data envelope or null if not found
 */
export function retrieveFromTier(key, tier = null) {
  const tiersToSearch = tier ? [tier] : ['working', 'session', 'longTerm'];
  const filename = `${sanitizeKey(key)}.json`;

  for (const t of tiersToSearch) {
    ensureTierDir(t);
    const filePath = join(TIERS[t].path, filename);

    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const envelope = JSON.parse(content);

        // Check TTL for working tier
        if (t === 'working' && TIERS.working.ttl) {
          const age = Date.now() - envelope.timestamp;
          if (age > TIERS.working.ttl) {
            // Expired, remove it
            unlinkSync(filePath);
            workingIndex.delete(key);
            continue;
          }
        }

        return envelope;
      } catch (error) {
        console.warn(`Failed to read ${filePath}:`, error.message);
      }
    }
  }

  return null;
}

/**
 * Evict stale (expired) entries from the working context.
 *
 * @param {Object} [options] - Eviction options
 * @param {boolean} [options.force=false] - Force eviction regardless of TTL
 * @param {number} [options.maxAge] - Custom max age in ms
 * @returns {Object} Eviction results
 *
 * @example
 * const result = evictStale();
 * console.log(`Evicted ${result.evicted} entries`);
 */
export function evictStale(options = {}) {
  const { force = false, maxAge } = options;
  const ttl = maxAge || TIERS.working.ttl;
  const now = Date.now();

  ensureTierDir('working');

  const results = {
    checked: 0,
    evicted: 0,
    kept: 0,
    errors: [],
  };

  try {
    const files = readdirSync(TIERS.working.path);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      results.checked++;
      const filePath = join(TIERS.working.path, file);

      try {
        const content = readFileSync(filePath, 'utf-8');
        const envelope = JSON.parse(content);
        const age = now - (envelope.timestamp || 0);

        if (force || age > ttl) {
          unlinkSync(filePath);
          workingIndex.delete(envelope.key);
          results.evicted++;
        } else {
          results.kept++;
        }
      } catch (error) {
        results.errors.push({ file, error: error.message });
      }
    }
  } catch (dirError) {
    results.errors.push({ error: dirError.message });
  }

  return results;
}

/**
 * Compress and promote data from working to session tier.
 * Useful when working context is valuable but should survive longer.
 *
 * @param {string} key - Key of data to promote
 * @param {Object} [options] - Promotion options
 * @param {boolean} [options.compress=true] - Apply compression
 * @param {boolean} [options.removeFromWorking=true] - Remove from working after promotion
 * @returns {Object} Promotion result
 *
 * @example
 * const result = promoteContext('important_task_state');
 */
export function promoteContext(key, options = {}) {
  const { compress = true, removeFromWorking = true } = options;

  // Retrieve from working tier
  const envelope = retrieveFromTier(key, 'working');

  if (!envelope) {
    return { success: false, error: 'Key not found in working tier' };
  }

  let promotedValue = envelope.value;

  // Apply compression if enabled
  if (compress && typeof promotedValue === 'object') {
    promotedValue = compressForPromotion(promotedValue);
  }

  // Route to session tier
  const sessionKey = `promoted_${key}`;
  const result = routeToTier(sessionKey, promotedValue, 'session');

  // Remove from working tier if requested
  if (result.success && removeFromWorking) {
    const workingPath = join(TIERS.working.path, `${sanitizeKey(key)}.json`);
    if (existsSync(workingPath)) {
      unlinkSync(workingPath);
      workingIndex.delete(key);
    }
  }

  return {
    ...result,
    originalKey: key,
    promotedKey: sessionKey,
    compressed: compress,
  };
}

/**
 * Compress object data for promotion.
 * Removes verbose fields, truncates long strings, etc.
 *
 * @param {Object} data - Data to compress
 * @returns {Object} Compressed data
 */
function compressForPromotion(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const compressed = {};
  const verboseKeys = ['trace', 'stackTrace', 'rawOutput', 'debug', '_internal', 'verbose'];
  const maxStringLength = 500;

  for (const [key, value] of Object.entries(data)) {
    // Skip verbose keys
    if (verboseKeys.some((vk) => key.toLowerCase().includes(vk.toLowerCase()))) {
      continue;
    }

    // Truncate long strings
    if (typeof value === 'string' && value.length > maxStringLength) {
      compressed[key] = value.slice(0, maxStringLength) + '...[truncated]';
    }
    // Recursively compress nested objects
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      compressed[key] = compressForPromotion(value);
    }
    // Limit array length
    else if (Array.isArray(value) && value.length > 10) {
      compressed[key] = [...value.slice(0, 10), `...+${value.length - 10} more`];
    } else {
      compressed[key] = value;
    }
  }

  return compressed;
}

/**
 * Extract and persist a fact to long-term memory.
 * Facts are durable knowledge that should survive across sessions.
 *
 * @param {string} key - Fact key
 * @param {any} value - Fact value
 * @param {Object} [metadata] - Optional metadata
 * @returns {Object} Persistence result
 *
 * @example
 * persistFact('project_language', 'typescript', { confidence: 'high' });
 */
export function persistFact(key, value, metadata = {}) {
  const factKey = key.startsWith('fact_') ? key : `fact_${key}`;

  const factEnvelope = {
    value,
    metadata: {
      ...metadata,
      recordedAt: new Date().toISOString(),
      type: 'fact',
    },
  };

  return routeToTier(factKey, factEnvelope, 'longTerm');
}

/**
 * Get all facts from long-term memory.
 *
 * @param {Object} [options] - Query options
 * @param {string} [options.prefix] - Filter by key prefix
 * @returns {Object[]} Array of fact records
 */
export function getAllFacts(options = {}) {
  const { prefix } = options;

  ensureTierDir('longTerm');

  const facts = [];

  try {
    const files = readdirSync(TIERS.longTerm.path);

    for (const file of files) {
      if (!file.startsWith('fact_') || !file.endsWith('.json')) continue;

      if (prefix && !file.startsWith(`fact_${prefix}`)) continue;

      try {
        const filePath = join(TIERS.longTerm.path, file);
        const content = readFileSync(filePath, 'utf-8');
        const envelope = JSON.parse(content);
        facts.push(envelope);
      } catch (error) {
        console.warn(`Failed to read fact ${file}:`, error.message);
      }
    }
  } catch (dirError) {
    console.warn('Failed to read long-term memory:', dirError.message);
  }

  return facts;
}

/**
 * Get tier statistics including token usage.
 *
 * @returns {Object} Statistics for all tiers
 */
export function getTierStats() {
  const stats = {};

  for (const [tierName, tierConfig] of Object.entries(TIERS)) {
    ensureTierDir(tierName);

    let totalTokens = 0;
    let fileCount = 0;
    let totalSize = 0;

    try {
      const files = readdirSync(tierConfig.path);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        fileCount++;

        try {
          const filePath = join(tierConfig.path, file);
          const fileStat = statSync(filePath);
          totalSize += fileStat.size;

          const content = readFileSync(filePath, 'utf-8');
          const envelope = JSON.parse(content);
          totalTokens += envelope._meta?.tokens || countTokens(JSON.stringify(envelope.value));
        } catch (error) {
          // Skip unreadable files
        }
      }
    } catch (dirError) {
      // Directory doesn't exist or unreadable
    }

    stats[tierName] = {
      files: fileCount,
      totalTokens,
      tokenBudget: tierConfig.tokenBudget,
      budgetUsage: tierConfig.tokenBudget
        ? Math.round((totalTokens / tierConfig.tokenBudget) * 100)
        : null,
      totalSizeBytes: totalSize,
      ttl: tierConfig.ttl,
    };
  }

  return stats;
}

/**
 * Sanitize key for use as filename.
 *
 * @param {string} key - Key to sanitize
 * @returns {string} Safe filename
 */
function sanitizeKey(key) {
  return String(key)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 200);
}

/**
 * Clear all data from a specific tier.
 * Use with caution!
 *
 * @param {string} tier - Tier to clear
 * @param {Object} [options] - Clear options
 * @param {boolean} [options.confirm=false] - Must be true to actually clear
 * @returns {Object} Clear result
 */
export function clearTier(tier, options = {}) {
  if (!options.confirm) {
    return { success: false, error: 'Must set confirm: true to clear tier' };
  }

  if (!TIERS[tier]) {
    return { success: false, error: `Invalid tier: ${tier}` };
  }

  ensureTierDir(tier);

  let cleared = 0;
  const errors = [];

  try {
    const files = readdirSync(TIERS[tier].path);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        unlinkSync(join(TIERS[tier].path, file));
        cleared++;
      } catch (error) {
        errors.push({ file, error: error.message });
      }
    }
  } catch (dirError) {
    return { success: false, error: dirError.message };
  }

  // Clear working index if clearing working tier
  if (tier === 'working') {
    workingIndex.clear();
  }

  return { success: true, cleared, errors };
}

export default {
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
};
