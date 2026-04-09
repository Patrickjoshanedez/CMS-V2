/**
 * Token Optimization Engine
 *
 * Provides token counting, budget enforcement, and output compression
 * for managing context window limits in LLM-based agentic systems.
 *
 * @module orchestrator/token-optimizer
 */

import { encode, decode } from 'gpt-tokenizer';

/**
 * Token budgets for different context tiers (in tokens)
 * @constant {Object}
 */
export const TOKEN_BUDGETS = {
  working: 2000, // Volatile, immediate context
  session: 8000, // Mid-term durable context
  longTerm: 4000, // Persistent facts
  toolOutput: 1000, // Max tokens per tool response
};

/**
 * Bounded output with head and tail preservation.
 * When text exceeds the maximum character limit, preserves the first
 * and last portions while indicating how much was truncated.
 *
 * @param {string} text - The text to potentially truncate
 * @param {number} [maxChars=1000] - Maximum characters to allow
 * @returns {string} Original text if under limit, otherwise truncated with markers
 *
 * @example
 * const result = boundOutput(longText, 500);
 * // Returns: "First 250 chars...\n\n[...TRUNCATED X chars...]\n\n...last 250 chars"
 */
export function boundOutput(text, maxChars = 1000) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  if (text.length <= maxChars) {
    return text;
  }

  const half = Math.floor(maxChars / 2);
  const truncatedCount = text.length - maxChars;

  return `${text.slice(0, half)}\n\n[...TRUNCATED ${truncatedCount} chars...]\n\n${text.slice(-half)}`;
}

/**
 * Semantic compression strategies for different tool output types.
 * Extracts key information while discarding verbose details.
 *
 * @param {string} output - Raw tool output
 * @param {string} [type='generic'] - Type of output: 'test', 'lint', 'build', 'generic'
 * @returns {string|Object} Compressed output - returns object for 'test' type with structured data, string for others
 *
 * @example
 * const compressed = compressToolOutput(testOutput, 'test');
 * // Returns: { passed: 45, failed: 2, skipped: 0, failedTests: [...], errors: [...], summary: "..." }
 */
export function compressToolOutput(output, type = 'generic') {
  if (!output || typeof output !== 'string') {
    return type === 'test'
      ? { passed: 0, failed: 0, skipped: 0, failedTests: [], errors: [], summary: '' }
      : output || '';
  }

  const strategies = {
    /**
     * Test output compression:
     * - Extract pass/fail counts
     * - List failing test names
     * - Include error messages and stack traces (truncated)
     * - Returns structured object with { passed, failed, skipped, failedTests, errors, summary }
     */
    test: (text) => {
      const results = {
        passed: 0,
        failed: 0,
        skipped: 0,
        failedTests: [],
        errors: [],
        summary: '',
      };

      // Common test framework patterns
      const passPatterns = [
        /(\d+)\s*(?:tests?\s+)?pass(?:ed|ing)?/i,
        /✓\s*(\d+)/,
        /PASS(?:ED)?[:\s]+(\d+)/i,
      ];

      const failPatterns = [
        /(\d+)\s*(?:tests?\s+)?fail(?:ed|ing|ure)?/i,
        /✗\s*(\d+)/,
        /FAIL(?:ED)?[:\s]+(\d+)/i,
      ];

      const skipPatterns = [/(\d+)\s*(?:tests?\s+)?skip(?:ped)?/i, /⊘\s*(\d+)/];

      // Extract counts
      for (const pattern of passPatterns) {
        const match = text.match(pattern);
        if (match) {
          results.passed = parseInt(match[1], 10);
          break;
        }
      }

      for (const pattern of failPatterns) {
        const match = text.match(pattern);
        if (match) {
          results.failed = parseInt(match[1], 10);
          break;
        }
      }

      for (const pattern of skipPatterns) {
        const match = text.match(pattern);
        if (match) {
          results.skipped = parseInt(match[1], 10);
          break;
        }
      }

      // Extract failing test names
      const failingTestPatterns = [
        /FAIL\s+(.+\.(?:test|spec)\.[jt]sx?)/gi,
        /✗\s+(.+)/g,
        /×\s+(.+)/g,
        /(?:FAILED|FAIL):\s*(.+)/gi,
      ];

      for (const pattern of failingTestPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (results.failedTests.length < 10) {
            results.failedTests.push(match[1].trim());
          }
        }
      }

      // Extract error messages
      const errorPatterns = [
        /Error:\s*(.+?)(?:\n|$)/gi,
        /AssertionError:\s*(.+?)(?:\n|$)/gi,
        /Expected\s+(.+?)\s+(?:to\s+)?(?:equal|be|match)\s+(.+?)(?:\n|$)/gi,
      ];

      for (const pattern of errorPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (results.errors.length < 5) {
            results.errors.push(match[0].trim().slice(0, 200));
          }
        }
      }

      // Build summary string
      let summary = `Tests: ${results.passed} passed`;
      if (results.failed > 0) summary += `, ${results.failed} failed`;
      if (results.skipped > 0) summary += `, ${results.skipped} skipped`;

      if (results.failedTests.length > 0) {
        summary += `\nFailed: ${results.failedTests.slice(0, 5).join(', ')}`;
        if (results.failedTests.length > 5) {
          summary += ` (+${results.failedTests.length - 5} more)`;
        }
      }

      if (results.errors.length > 0) {
        summary += `\nErrors:\n${results.errors.slice(0, 3).join('\n')}`;
      }

      results.summary = summary || boundOutput(text, 500);

      // Return structured object for 'test' type
      return results;
    },

    /**
     * Lint output compression:
     * - Extract error/warning counts
     * - List file:line references
     * - Group by rule if possible
     */
    lint: (text) => {
      const results = {
        errors: 0,
        warnings: 0,
        issues: [],
      };

      // Extract counts
      const errorMatch = text.match(/(\d+)\s*errors?/i);
      const warningMatch = text.match(/(\d+)\s*warnings?/i);

      if (errorMatch) results.errors = parseInt(errorMatch[1], 10);
      if (warningMatch) results.warnings = parseInt(warningMatch[1], 10);

      // Extract file:line references with messages
      const issuePatterns = [
        /([^\s:]+):(\d+):(\d+):\s*(\w+):\s*(.+)/g, // ESLint format
        /([^\s:]+)\((\d+),(\d+)\):\s*(\w+)\s+(.+)/g, // TypeScript format
        /\s+(\d+):(\d+)\s+(\w+)\s+(.+?)\s{2,}(\S+)/g, // ESLint table format
      ];

      for (const pattern of issuePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (results.issues.length < 15) {
            results.issues.push({
              file: match[1],
              line: match[2],
              type: match[4] || 'error',
              message: (match[5] || match[4]).slice(0, 100),
            });
          }
        }
      }

      // Build compressed output
      let compressed = `Lint: ${results.errors} errors, ${results.warnings} warnings`;

      if (results.issues.length > 0) {
        const grouped = {};
        for (const issue of results.issues) {
          const file = issue.file || 'unknown';
          if (!grouped[file]) grouped[file] = [];
          grouped[file].push(`L${issue.line}: ${issue.message}`);
        }

        compressed +=
          '\n' +
          Object.entries(grouped)
            .slice(0, 5)
            .map(([file, issues]) => `${file}:\n  ${issues.slice(0, 3).join('\n  ')}`)
            .join('\n');
      }

      return compressed || boundOutput(text, 500);
    },

    /**
     * Build output compression:
     * - Extract success/fail status
     * - Include error messages
     * - Show build time if available
     */
    build: (text) => {
      const results = {
        success: false,
        duration: null,
        errors: [],
        warnings: [],
      };

      // Check for success indicators
      const successPatterns = [
        /build\s+(?:completed\s+)?success(?:fully)?/i,
        /compiled\s+success(?:fully)?/i,
        /✓\s*(?:built|compiled|done)/i,
        /webpack.+compiled/i,
        /Build succeeded/i,
      ];

      const failPatterns = [
        /build\s+failed/i,
        /compilation?\s+failed/i,
        /error\s+during\s+build/i,
        /✗\s*(?:built|compiled)/i,
      ];

      results.success = successPatterns.some((p) => p.test(text));
      if (failPatterns.some((p) => p.test(text))) {
        results.success = false;
      }

      // Extract duration
      const durationMatch = text.match(
        /(?:in|took|duration:?)\s*(\d+(?:\.\d+)?)\s*(ms|s|seconds?|minutes?)/i,
      );
      if (durationMatch) {
        results.duration = `${durationMatch[1]}${durationMatch[2]}`;
      }

      // Extract errors
      const errorPatterns = [
        /error[:\s]+(.+?)(?:\n|$)/gi,
        /ERROR\s+in\s+(.+?)(?:\n|$)/gi,
        /Cannot\s+(?:find|resolve)\s+(.+?)(?:\n|$)/gi,
        /Module\s+not\s+found:\s*(.+?)(?:\n|$)/gi,
      ];

      for (const pattern of errorPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (results.errors.length < 5) {
            results.errors.push(match[1].trim().slice(0, 150));
          }
        }
      }

      // Build compressed output
      let compressed = `Build: ${results.success ? 'SUCCESS' : 'FAILED'}`;
      if (results.duration) compressed += ` (${results.duration})`;

      if (results.errors.length > 0) {
        compressed += `\nErrors:\n- ${results.errors.join('\n- ')}`;
      }

      return compressed;
    },

    /**
     * Generic compression:
     * - Head+tail preservation
     * - Entity extraction (files, URLs, numbers)
     */
    generic: (text) => {
      // Extract key entities
      const entities = {
        files: [],
        urls: [],
        numbers: [],
      };

      // File paths
      const fileMatches = text.match(
        /(?:\/[\w.-]+)+\.\w+|[\w.-]+\.(?:js|ts|py|json|md|txt|yml|yaml)/g,
      );
      if (fileMatches) {
        entities.files = [...new Set(fileMatches)].slice(0, 10);
      }

      // URLs
      const urlMatches = text.match(/https?:\/\/[^\s<>"]+/g);
      if (urlMatches) {
        entities.urls = [...new Set(urlMatches)].slice(0, 5);
      }

      // Key numbers (percentages, counts)
      const numberMatches = text.match(
        /\d+(?:\.\d+)?%|\d+\s*(?:files?|items?|errors?|warnings?)/gi,
      );
      if (numberMatches) {
        entities.numbers = [...new Set(numberMatches)].slice(0, 10);
      }

      // Build compressed output
      let compressed = boundOutput(text, 800);

      if (entities.files.length > 0 || entities.urls.length > 0) {
        compressed += '\n\n--- Extracted Entities ---';
        if (entities.files.length > 0) {
          compressed += `\nFiles: ${entities.files.join(', ')}`;
        }
        if (entities.urls.length > 0) {
          compressed += `\nURLs: ${entities.urls.join(', ')}`;
        }
        if (entities.numbers.length > 0) {
          compressed += `\nMetrics: ${entities.numbers.join(', ')}`;
        }
      }

      return compressed;
    },
  };

  const strategy = strategies[type] || strategies.generic;
  return strategy(output);
}

/**
 * Count tokens in text using GPT-4's cl100k_base encoding.
 *
 * @param {string} text - Text to count tokens for
 * @returns {number} Number of tokens
 *
 * @example
 * const tokens = countTokens("Hello, world!");
 * // Returns: 4
 */
export function countTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  try {
    const tokens = encode(text);
    return tokens.length;
  } catch (error) {
    // Fallback: rough estimate (1 token ≈ 4 chars for English)
    console.warn('Token counting fallback used:', error.message);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Decode tokens back to text.
 *
 * @param {number[]} tokens - Array of token IDs
 * @returns {string} Decoded text
 */
export function decodeTokens(tokens) {
  if (!tokens || !Array.isArray(tokens)) {
    return '';
  }

  try {
    return decode(tokens);
  } catch (error) {
    console.warn('Token decoding failed:', error.message);
    return '';
  }
}

/**
 * Truncate text to fit within a token budget.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxTokens - Maximum tokens allowed
 * @returns {string} Truncated text
 */
export function truncateToTokenBudget(text, maxTokens) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  const tokens = encode(text);
  if (tokens.length <= maxTokens) {
    return text;
  }

  const truncatedTokens = tokens.slice(0, maxTokens);
  return decode(truncatedTokens) + '...[truncated]';
}

/**
 * Enforce token budget on a context object.
 * Trims oldest entries if the total exceeds the tier's budget.
 *
 * @param {Object} context - Context object with entries to manage
 * @param {string} context.entries - Array of {key, value, timestamp} objects
 * @param {string} tier - Context tier: 'working', 'session', 'longTerm', 'toolOutput'
 * @returns {Object} Context with entries trimmed to fit budget
 *
 * @example
 * const trimmed = enforceBudget({ entries: [...] }, 'working');
 */
export function enforceBudget(context, tier) {
  if (!context || !context.entries || !Array.isArray(context.entries)) {
    return context || { entries: [] };
  }

  const budget = TOKEN_BUDGETS[tier] || TOKEN_BUDGETS.working;

  // Sort by timestamp (oldest first for eviction)
  const sortedEntries = [...context.entries].sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeA - timeB;
  });

  // Calculate current token usage
  let totalTokens = 0;
  const entriesWithTokens = sortedEntries.map((entry) => {
    const tokens = countTokens(JSON.stringify(entry.value || entry));
    totalTokens += tokens;
    return { ...entry, _tokens: tokens };
  });

  // If under budget, return as-is
  if (totalTokens <= budget) {
    return context;
  }

  // Evict oldest entries until under budget
  const keptEntries = [];
  let keptTokens = 0;

  // Process from newest to oldest (reverse)
  for (let i = entriesWithTokens.length - 1; i >= 0; i--) {
    const entry = entriesWithTokens[i];
    if (keptTokens + entry._tokens <= budget) {
      keptEntries.unshift(entry);
      keptTokens += entry._tokens;
    }
  }

  // Remove internal token counts
  const cleanedEntries = keptEntries.map(({ _tokens, ...rest }) => rest);

  return {
    ...context,
    entries: cleanedEntries,
    _meta: {
      originalCount: context.entries.length,
      keptCount: cleanedEntries.length,
      evictedCount: context.entries.length - cleanedEntries.length,
      tokenUsage: keptTokens,
      budget: budget,
    },
  };
}

/**
 * Calculate token usage statistics for a context.
 *
 * @param {Object} context - Context object
 * @returns {Object} Statistics including total tokens, per-entry breakdown
 */
export function getTokenStats(context) {
  if (!context) {
    return { total: 0, entries: [] };
  }

  const entries = context.entries || [context];
  const breakdown = [];
  let total = 0;

  for (const entry of entries) {
    const text = typeof entry === 'string' ? entry : JSON.stringify(entry);
    const tokens = countTokens(text);
    total += tokens;
    breakdown.push({
      key: entry.key || 'unknown',
      tokens,
      percentage: 0, // Will be calculated after total
    });
  }

  // Calculate percentages
  for (const item of breakdown) {
    item.percentage = total > 0 ? Math.round((item.tokens / total) * 100) : 0;
  }

  return {
    total,
    entries: breakdown,
    budgetStatus: {
      working: {
        used: total,
        budget: TOKEN_BUDGETS.working,
        remaining: TOKEN_BUDGETS.working - total,
      },
      session: {
        used: total,
        budget: TOKEN_BUDGETS.session,
        remaining: TOKEN_BUDGETS.session - total,
      },
      longTerm: {
        used: total,
        budget: TOKEN_BUDGETS.longTerm,
        remaining: TOKEN_BUDGETS.longTerm - total,
      },
    },
  };
}

export default {
  boundOutput,
  compressToolOutput,
  countTokens,
  decodeTokens,
  truncateToTokenBudget,
  enforceBudget,
  getTokenStats,
  TOKEN_BUDGETS,
};
