/**
 * Context Compactor
 *
 * Manages context window limits by compressing conversation history,
 * preserving critical instructions, and creating checkpoint summaries
 * for session continuity.
 *
 * @module orchestrator/context-compactor
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { countTokens, truncateToTokenBudget, boundOutput } from './token-optimizer.js';
import { persistFact, routeToTier } from './memory-tiers.js';
import { toSafeTimestamp } from './utils.js';

// Get current directory for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Checkpoints directory
 */
const CHECKPOINTS_DIR = join(PROJECT_ROOT, 'context', 'checkpoints');

/**
 * Message role priorities for retention during compaction
 * Higher priority = more likely to be kept
 */
const ROLE_PRIORITIES = {
  system: 100, // Always keep system prompts
  tool: 80, // Keep tool calls (essential for context)
  function: 80, // Keep function calls
  assistant: 50, // Compress assistant responses
  user: 60, // Keep user messages (higher than assistant)
};

/**
 * Patterns that indicate critical content to preserve
 */
const CRITICAL_PATTERNS = [
  /\b(?:error|exception|failed|failure)\b/i,
  /\b(?:important|critical|must|required)\b/i,
  /\b(?:do not|don't|never|always)\b/i,
  /\b(?:bug|fix|issue|problem)\b/i,
  /<(?:system|instruction|rule|constraint)>/i,
  /```[\s\S]*?```/, // Code blocks
];

/**
 * Compact conversation history to fit within token limits.
 * Preserves system prompts, recent messages, and tool calls.
 *
 * @param {Object[]} messages - Array of conversation messages
 * @param {number} maxTokens - Maximum tokens for the compacted result
 * @param {Object} [options] - Compaction options
 * @param {number} [options.keepLast=5] - Number of recent messages to always keep
 * @param {boolean} [options.preserveToolCalls=true] - Always keep tool call messages
 * @param {boolean} [options.summarizeCompressed=true] - Create summary of compressed content
 * @returns {Object} Compacted messages and metadata
 *
 * @example
 * const result = compactHistory(messages, 4000, { keepLast: 3 });
 * console.log(`Reduced from ${result.originalTokens} to ${result.compactedTokens}`);
 */
export function compactHistory(messages, maxTokens, options = {}) {
  const { keepLast = 5, preserveToolCalls = true, summarizeCompressed = true } = options;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      messages: [],
      originalTokens: 0,
      compactedTokens: 0,
      removedCount: 0,
    };
  }

  // Calculate original token count
  const originalTokens = messages.reduce((sum, msg) => {
    return sum + countTokens(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }, 0);

  // If already under budget, return as-is
  if (originalTokens <= maxTokens) {
    return {
      messages,
      originalTokens,
      compactedTokens: originalTokens,
      removedCount: 0,
    };
  }

  // Categorize messages
  const categorized = messages.map((msg, index) => {
    const role = msg.role || 'unknown';
    const content = msg.content || (typeof msg === 'string' ? msg : JSON.stringify(msg));
    const tokens = countTokens(content);

    return {
      original: msg,
      index,
      role,
      content,
      tokens,
      priority: calculatePriority(msg, index, messages.length, keepLast),
      isToolCall: role === 'tool' || role === 'function' || msg.tool_calls,
      isCritical: CRITICAL_PATTERNS.some((p) => p.test(content)),
      isRecent: index >= messages.length - keepLast,
    };
  });

  // Sort by priority (descending) while maintaining relative order for equal priorities
  const sortedByPriority = [...categorized].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.index - b.index;
  });

  // Select messages to keep within budget
  const kept = [];
  const removed = [];
  let currentTokens = 0;

  for (const msg of sortedByPriority) {
    // Always keep system messages, tool calls (if flag set), and critical content
    const mustKeep =
      msg.role === 'system' ||
      (preserveToolCalls && msg.isToolCall) ||
      msg.isCritical ||
      msg.isRecent;

    if (mustKeep || currentTokens + msg.tokens <= maxTokens) {
      kept.push(msg);
      currentTokens += msg.tokens;
    } else {
      removed.push(msg);
    }
  }

  // Sort kept messages back to original order
  kept.sort((a, b) => a.index - b.index);

  // Build result messages
  const resultMessages = kept.map((k) => k.original);

  // Create summary of removed content if requested
  if (summarizeCompressed && removed.length > 0) {
    const summary = createCompressedSummary(removed);
    const summaryTokens = countTokens(summary);

    // BUDGET VALIDATION: Ensure summary fits within remaining budget
    if (currentTokens + summaryTokens > maxTokens) {
      // Truncate summary to fit budget
      const availableTokens = maxTokens - currentTokens;
      if (availableTokens > 100) {
        const truncatedSummary = truncateToTokenBudget(summary, availableTokens - 50);
        const summaryMsg = {
          role: 'system',
          content: `[COMPACTED CONTEXT - ${removed.length} messages summarized]\n${truncatedSummary}`,
        };

        // Insert after system messages
        const systemEndIndex = resultMessages.findIndex((m) => m.role !== 'system');
        const insertIndex = systemEndIndex > 0 ? systemEndIndex : 0;
        resultMessages.splice(insertIndex, 0, summaryMsg);
        currentTokens += countTokens(summaryMsg.content);
      }
      // If not enough space, skip summary entirely
    } else {
      // Summary fits, insert it
      const summaryMsg = {
        role: 'system',
        content: `[COMPACTED CONTEXT - ${removed.length} messages summarized]\n${summary}`,
      };

      const systemEndIndex = resultMessages.findIndex((m) => m.role !== 'system');
      const insertIndex = systemEndIndex > 0 ? systemEndIndex : 0;
      resultMessages.splice(insertIndex, 0, summaryMsg);
      currentTokens += summaryTokens;
    }
  }

  return {
    messages: resultMessages,
    originalTokens,
    compactedTokens: currentTokens,
    removedCount: removed.length,
    keptCount: kept.length,
    compressionRatio: originalTokens > 0 ? (currentTokens / originalTokens).toFixed(2) : 1,
  };
}

/**
 * Calculate priority score for a message.
 *
 * @param {Object} message - The message
 * @param {number} index - Message index
 * @param {number} total - Total message count
 * @param {number} keepLast - Number of recent messages to prioritize
 * @returns {number} Priority score
 */
function calculatePriority(message, index, total, keepLast) {
  let priority = ROLE_PRIORITIES[message.role] || 30;

  // Boost recent messages
  if (index >= total - keepLast) {
    priority += 50;
  }

  // Boost tool calls
  if (message.tool_calls || message.role === 'tool' || message.role === 'function') {
    priority += 30;
  }

  // Boost messages with critical content
  const content = message.content || '';
  if (CRITICAL_PATTERNS.some((p) => p.test(content))) {
    priority += 20;
  }

  // Slight boost based on position (recency)
  priority += (index / total) * 10;

  return priority;
}

/**
 * Create a compressed summary of removed messages.
 *
 * @param {Object[]} removed - Removed message metadata
 * @returns {string} Summary text
 */
function createCompressedSummary(removed) {
  const roleGroups = {};

  for (const msg of removed) {
    const role = msg.role || 'unknown';
    if (!roleGroups[role]) roleGroups[role] = [];

    // Extract key points from content
    const keyPoints = extractKeyPoints(msg.content);
    if (keyPoints.length > 0) {
      roleGroups[role].push(...keyPoints);
    }
  }

  const summaryParts = [];

  for (const [role, points] of Object.entries(roleGroups)) {
    if (points.length > 0) {
      const uniquePoints = [...new Set(points)].slice(0, 5);
      summaryParts.push(`${role}: ${uniquePoints.join('; ')}`);
    }
  }

  return summaryParts.join('\n') || 'Previous context compressed';
}

/**
 * Extract key points from message content.
 *
 * @param {string} content - Message content
 * @returns {string[]} Array of key points
 */
function extractKeyPoints(content) {
  if (!content || typeof content !== 'string') return [];

  const points = [];

  // Extract entities (files, URLs, functions)
  const fileMatches = content.match(/[\w.-]+\.(?:js|ts|py|json|md|txt)/g);
  if (fileMatches) points.push(`files: ${[...new Set(fileMatches)].slice(0, 3).join(', ')}`);

  // Extract action verbs with objects
  const actionMatches = content.match(
    /(?:created?|updated?|deleted?|modified?|fixed?|added?)\s+[\w.-]+/gi,
  );
  if (actionMatches) points.push(...actionMatches.slice(0, 2).map((m) => m.toLowerCase()));

  // Extract error indicators
  const errorMatches = content.match(/(?:error|failed|exception):\s*[^\n]+/gi);
  if (errorMatches) points.push(...errorMatches.slice(0, 1));

  return points;
}

/**
 * Generate a unique ID for checkpoints.
 *
 * @returns {string} Unique checkpoint ID
 */
function generateId() {
  return randomUUID().slice(0, 8);
}

/**
 * Compress state for checkpoint storage.
 *
 * @param {Object} state - State to compress
 * @returns {Object} Compressed state
 */
function compress(state) {
  if (typeof state !== 'object' || state === null) {
    return state;
  }

  const compressed = {};

  for (const [key, value] of Object.entries(state)) {
    // Skip internal metadata
    if (key.startsWith('_')) continue;

    if (typeof value === 'string' && value.length > 1000) {
      compressed[key] = boundOutput(value, 500);
    } else if (Array.isArray(value) && value.length > 20) {
      compressed[key] = {
        _type: 'truncated_array',
        first: value.slice(0, 5),
        last: value.slice(-5),
        totalLength: value.length,
      };
    } else if (typeof value === 'object' && value !== null) {
      compressed[key] = compress(value);
    } else {
      compressed[key] = value;
    }
  }

  return compressed;
}

/**
 * Extract critical facts from state for checkpoint.
 *
 * @param {Object} state - State to extract from
 * @returns {Object} Critical facts
 */
function extractCriticalFacts(state) {
  const facts = {};

  if (!state || typeof state !== 'object') {
    return facts;
  }

  // Extract task-related facts
  if (state.currentTask) facts.task = state.currentTask;
  if (state.goal) facts.goal = state.goal;
  if (state.progress) facts.progress = state.progress;

  // Extract error/issue facts
  if (state.errors)
    facts.errors = Array.isArray(state.errors) ? state.errors.slice(-5) : state.errors;
  if (state.blockers) facts.blockers = state.blockers;

  // Extract file-related facts
  if (state.modifiedFiles) facts.modifiedFiles = state.modifiedFiles;
  if (state.currentFile) facts.currentFile = state.currentFile;

  // Extract decisions and rationale
  if (state.decisions) facts.decisions = state.decisions;
  if (state.rationale) facts.rationale = state.rationale;

  return facts;
}

/**
 * Generate a prompt for resuming from checkpoint.
 *
 * @param {Object} state - State to resume from
 * @returns {string} Resumption prompt
 */
function generateResumptionPrompt(state) {
  const parts = ['Resuming from checkpoint.'];

  if (state.currentTask) {
    parts.push(`\nTask: ${state.currentTask}`);
  }

  if (state.progress) {
    parts.push(`\nProgress: ${JSON.stringify(state.progress)}`);
  }

  if (state.nextSteps) {
    parts.push(
      `\nNext steps: ${Array.isArray(state.nextSteps) ? state.nextSteps.join(', ') : state.nextSteps}`,
    );
  }

  if (state.modifiedFiles) {
    parts.push(
      `\nModified files: ${Array.isArray(state.modifiedFiles) ? state.modifiedFiles.join(', ') : state.modifiedFiles}`,
    );
  }

  if (state.blockers) {
    parts.push(
      `\nBlockers: ${Array.isArray(state.blockers) ? state.blockers.join(', ') : state.blockers}`,
    );
  }

  return parts.join('');
}

/**
 * Create a checkpoint summary for session continuity.
 * Checkpoints allow resuming work after context limits are hit.
 *
 * @param {Object} state - Current session state
 * @param {Object} [options] - Checkpoint options
 * @returns {Object} Checkpoint record
 *
 * @example
 * const checkpoint = createCheckpoint({
 *   currentTask: 'Implement auth module',
 *   progress: { completed: ['login'], pending: ['logout'] },
 *   modifiedFiles: ['auth.js', 'routes.js']
 * });
 */
export function createCheckpoint(state, options = {}) {
  const checkpoint = {
    checkpointId: generateId(),
    timestamp: new Date().toISOString(),
    compressedState: compress(state),
    criticalFacts: extractCriticalFacts(state),
    resumptionPrompt: generateResumptionPrompt(state),
    _meta: {
      originalStateSize: JSON.stringify(state).length,
      compressedSize: 0,
      tokenCount: 0,
    },
  };

  // Calculate compressed size and tokens
  const compressedJson = JSON.stringify(checkpoint.compressedState);
  checkpoint._meta.compressedSize = compressedJson.length;
  checkpoint._meta.tokenCount = countTokens(compressedJson);

  // Persist checkpoint
  ensureCheckpointsDir();
  // CROSS-PLATFORM: Use centralized utility for safe timestamp formatting
  const safeTimestamp = toSafeTimestamp(checkpoint.timestamp);
  const filename = `checkpoint-${safeTimestamp}-${checkpoint.checkpointId}.json`;
  const filePath = join(CHECKPOINTS_DIR, filename);

  try {
    writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    checkpoint.filePath = filePath;
  } catch (error) {
    checkpoint.saveError = error.message;
  }

  return checkpoint;
}

/**
 * Ensure checkpoints directory exists.
 */
function ensureCheckpointsDir() {
  if (!existsSync(CHECKPOINTS_DIR)) {
    mkdirSync(CHECKPOINTS_DIR, { recursive: true });
  }
}

/**
 * Load a checkpoint by ID.
 *
 * @param {string} checkpointId - Checkpoint ID
 * @returns {Object|null} Checkpoint or null if not found
 */
export function loadCheckpoint(checkpointId) {
  ensureCheckpointsDir();

  const files = readdirSync(CHECKPOINTS_DIR);

  for (const file of files) {
    if (file.includes(checkpointId) && file.endsWith('.json')) {
      try {
        const filePath = join(CHECKPOINTS_DIR, file);
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.warn(`Failed to load checkpoint ${file}:`, error.message);
      }
    }
  }

  return null;
}

/**
 * Get the most recent checkpoint.
 *
 * @returns {Object|null} Most recent checkpoint or null
 */
export function getLatestCheckpoint() {
  ensureCheckpointsDir();

  const files = readdirSync(CHECKPOINTS_DIR)
    .filter((f) => f.startsWith('checkpoint-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  try {
    const filePath = join(CHECKPOINTS_DIR, files[0]);
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('Failed to load latest checkpoint:', error.message);
    return null;
  }
}

/**
 * Prepare state for a new conversation (Serena pattern).
 * Saves current state and returns minimal bootstrap context.
 *
 * @param {Object} currentState - Current session state
 * @param {Object} [options] - Preparation options
 * @param {boolean} [options.persistFacts=true] - Persist critical facts to long-term memory
 * @returns {Object} Bootstrap context for new conversation
 *
 * @example
 * const bootstrap = prepareForNewConversation({
 *   task: 'Build API',
 *   progress: { endpoints: ['GET /users'] },
 *   discoveries: { uses_typescript: true }
 * });
 */
export function prepareForNewConversation(currentState, options = {}) {
  const { persistFacts = true } = options;

  // Create checkpoint of current state
  const checkpoint = createCheckpoint(currentState);

  // Persist critical facts to long-term memory if requested
  if (persistFacts && checkpoint.criticalFacts) {
    for (const [key, value] of Object.entries(checkpoint.criticalFacts)) {
      if (value !== null && value !== undefined) {
        persistFact(`session_${key}`, value, { checkpointId: checkpoint.checkpointId });
      }
    }
  }

  // Build minimal bootstrap context
  const bootstrap = {
    previousCheckpointId: checkpoint.checkpointId,
    resumptionPrompt: checkpoint.resumptionPrompt,
    criticalFacts: checkpoint.criticalFacts,
    continuationInstructions: buildContinuationInstructions(checkpoint),
    _meta: {
      preparedAt: new Date().toISOString(),
      checkpointFile: checkpoint.filePath,
      tokenCount: countTokens(JSON.stringify(checkpoint.criticalFacts)),
    },
  };

  // Also save to session tier for quick retrieval
  routeToTier('latest_bootstrap', bootstrap, 'session');

  return bootstrap;
}

/**
 * Build continuation instructions from checkpoint.
 *
 * @param {Object} checkpoint - Checkpoint to build from
 * @returns {string} Continuation instructions
 */
function buildContinuationInstructions(checkpoint) {
  const lines = [
    '## Session Continuation',
    '',
    `Previous session checkpoint: ${checkpoint.checkpointId}`,
    `Saved at: ${checkpoint.timestamp}`,
    '',
  ];

  if (checkpoint.criticalFacts.task) {
    lines.push(`### Task: ${checkpoint.criticalFacts.task}`);
  }

  if (checkpoint.criticalFacts.progress) {
    lines.push('### Progress:');
    lines.push('```json');
    lines.push(JSON.stringify(checkpoint.criticalFacts.progress, null, 2));
    lines.push('```');
  }

  if (checkpoint.criticalFacts.modifiedFiles) {
    lines.push('### Modified Files:');
    const files = checkpoint.criticalFacts.modifiedFiles;
    lines.push(Array.isArray(files) ? files.map((f) => `- ${f}`).join('\n') : `- ${files}`);
  }

  if (checkpoint.criticalFacts.errors) {
    lines.push('### Previous Errors:');
    const errors = checkpoint.criticalFacts.errors;
    lines.push(Array.isArray(errors) ? errors.map((e) => `- ${e}`).join('\n') : `- ${errors}`);
  }

  lines.push('');
  lines.push('Please continue from where the previous session left off.');

  return lines.join('\n');
}

/**
 * Compact tool output for context efficiency.
 * Specialized compaction for tool call results.
 *
 * @param {Object} toolResult - Tool call result
 * @param {number} [maxTokens=500] - Maximum tokens for output
 * @returns {Object} Compacted tool result
 */
export function compactToolOutput(toolResult, maxTokens = 500) {
  if (!toolResult) return toolResult;

  const content = toolResult.content || toolResult.output || toolResult;
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const currentTokens = countTokens(contentStr);

  if (currentTokens <= maxTokens) {
    return toolResult;
  }

  // Truncate to budget
  const truncated = truncateToTokenBudget(contentStr, maxTokens);

  if (typeof toolResult === 'string') {
    return truncated;
  }

  return {
    ...toolResult,
    content: truncated,
    _compacted: {
      originalTokens: currentTokens,
      truncatedTokens: maxTokens,
    },
  };
}

export default {
  compactHistory,
  createCheckpoint,
  loadCheckpoint,
  getLatestCheckpoint,
  prepareForNewConversation,
  compactToolOutput,
};
