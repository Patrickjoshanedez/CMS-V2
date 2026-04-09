/**
 * Historic Lesson Learning Mechanism (HLLM)
 *
 * Records failed repair attempts with structured lesson records,
 * maintains a failure blacklist to prevent hallucination loops,
 * and persists lessons to memories/repo/ for cross-session learning.
 *
 * @module orchestrator/hllm
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { toSafeTimestamp } from './utils.js';

// Get current directory for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Schema definition for lesson records
 * @constant {Object}
 */
export const LESSON_SCHEMA = {
  id: 'string', // UUID
  timestamp: 'ISO8601', // When the lesson was recorded
  failedCommand: 'string', // The command that failed
  attemptedFix: 'string', // What was tried to fix it
  failureTrace: 'string', // Stack trace or error output
  rootCause: 'string', // Analyzed root cause
  blacklistedPattern: 'string', // Regex pattern to block future attempts
  preventionRule: 'string', // Human-readable rule to prevent recurrence
};

/**
 * Path to the lessons storage directory
 */
const LESSONS_DIR = join(PROJECT_ROOT, 'memories', 'repo', 'lessons');

/**
 * In-memory cache of loaded lessons
 * @type {Map<string, Object>}
 */
const lessonsCache = new Map();

/**
 * Ensure the lessons directory exists
 */
function ensureLessonsDir() {
  if (!existsSync(LESSONS_DIR)) {
    mkdirSync(LESSONS_DIR, { recursive: true });
  }
}

/**
 * Check if a proposed fix matches any blacklisted pattern.
 * This prevents the system from repeating known-bad fixes.
 *
 * @param {string} proposedFix - The fix being considered
 * @param {Object[]} [lessons] - Array of lesson records to check against
 * @returns {Object} Result with isBlacklisted flag and matching lesson if found
 *
 * @example
 * const result = isBlacklisted("npm install --force", lessons);
 * if (result.isBlacklisted) {
 *   console.log(`Blocked by lesson: ${result.matchingLesson.id}`);
 * }
 */
export function isBlacklisted(proposedFix, lessons = null) {
  if (!proposedFix || typeof proposedFix !== 'string') {
    return { isBlacklisted: false, matchingLesson: null };
  }

  // Load lessons if not provided
  const lessonsToCheck = lessons || loadLessons();

  for (const lesson of lessonsToCheck) {
    if (!lesson.blacklistedPattern) continue;

    try {
      const pattern = new RegExp(lesson.blacklistedPattern, 'i');
      if (pattern.test(proposedFix)) {
        return {
          isBlacklisted: true,
          matchingLesson: lesson,
          reason: lesson.preventionRule || `Matches blacklisted pattern from lesson ${lesson.id}`,
        };
      }
    } catch (regexError) {
      // Invalid regex pattern, try literal match
      if (proposedFix.toLowerCase().includes(lesson.blacklistedPattern.toLowerCase())) {
        return {
          isBlacklisted: true,
          matchingLesson: lesson,
          reason:
            lesson.preventionRule || `Contains blacklisted substring from lesson ${lesson.id}`,
        };
      }
    }
  }

  return { isBlacklisted: false, matchingLesson: null };
}

/**
 * Create a lesson record from a failed repair attempt.
 *
 * @param {string} command - The command that was executed
 * @param {string} fix - The fix that was attempted
 * @param {string} trace - Error trace or failure output
 * @param {Object} analysis - Analysis of the failure
 * @param {string} analysis.rootCause - Determined root cause
 * @param {string} [analysis.blacklistedPattern] - Pattern to blacklist
 * @param {string} [analysis.preventionRule] - Rule to prevent recurrence
 * @returns {Object} Complete lesson record
 *
 * @example
 * const lesson = createLessonRecord(
 *   "npm test",
 *   "Changed import to require",
 *   "SyntaxError: Cannot use import statement",
 *   { rootCause: "Project uses CommonJS", blacklistedPattern: "import\\s+.*from" }
 * );
 */
export function createLessonRecord(command, fix, trace, analysis) {
  const lesson = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    failedCommand: String(command || '').slice(0, 1000),
    attemptedFix: String(fix || '').slice(0, 2000),
    // SECURITY: Apply sanitization to remove sensitive data from persisted traces
    failureTrace: sanitizeTrace(String(trace || '')).slice(0, 5000),
    rootCause: String(analysis?.rootCause || 'Unknown').slice(0, 1000),
    blacklistedPattern: analysis?.blacklistedPattern || null,
    preventionRule: analysis?.preventionRule || null,
    // Additional metadata
    _meta: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      source: 'hllm-auto',
    },
  };

  // Validate against schema
  for (const [key, type] of Object.entries(LESSON_SCHEMA)) {
    if (lesson[key] === undefined) {
      lesson[key] = type === 'string' ? '' : null;
    }
  }

  return lesson;
}

/**
 * Persist a lesson record to the memories/repo/lessons/ directory.
 *
 * @param {Object} lesson - The lesson record to persist
 * @returns {Object} Result with success flag and file path
 *
 * @example
 * const result = persistLesson(lesson);
 * console.log(`Saved to: ${result.filePath}`);
 */
export function persistLesson(lesson) {
  if (!lesson || !lesson.id) {
    return { success: false, error: 'Invalid lesson: missing id' };
  }

  try {
    ensureLessonsDir();

    // Create filename from timestamp and id
    // CROSS-PLATFORM: Use centralized utility for safe timestamp formatting
    const timestamp = lesson.timestamp
      ? toSafeTimestamp(lesson.timestamp)
      : toSafeTimestamp(new Date().toISOString());
    const filename = `lesson-${timestamp}-${lesson.id.slice(0, 8)}.json`;
    const filePath = join(LESSONS_DIR, filename);

    // Write lesson as formatted JSON
    writeFileSync(filePath, JSON.stringify(lesson, null, 2), 'utf-8');

    // Update cache
    lessonsCache.set(lesson.id, lesson);

    // CACHE CONSISTENCY: Invalidate hook-enforcer cache to force reload of new lessons
    import('./hook-enforcer.js').then((m) => m.invalidateLessonCache?.()).catch(() => {}); // Silently fail if module not available

    // Also create a human-readable markdown summary
    const mdPath = join(LESSONS_DIR, filename.replace('.json', '.md'));
    writeFileSync(mdPath, formatLessonMarkdown(lesson), 'utf-8');

    return { success: true, filePath, mdPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Load all lessons from the memories/repo/lessons/ directory.
 *
 * @param {Object} [options] - Load options
 * @param {boolean} [options.forceReload=false] - Bypass cache and reload from disk
 * @param {number} [options.maxAge] - Only load lessons newer than this (ms)
 * @returns {Object[]} Array of lesson records
 *
 * @example
 * const lessons = loadLessons();
 * const recentLessons = loadLessons({ maxAge: 86400000 }); // Last 24h
 */
export function loadLessons(options = {}) {
  const { forceReload = false, maxAge } = options;

  // Return cached lessons if available and not forcing reload
  if (!forceReload && lessonsCache.size > 0) {
    let lessons = Array.from(lessonsCache.values());
    if (maxAge) {
      const cutoff = Date.now() - maxAge;
      lessons = lessons.filter((l) => new Date(l.timestamp).getTime() > cutoff);
    }
    return lessons;
  }

  ensureLessonsDir();

  const lessons = [];

  try {
    const files = readdirSync(LESSONS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = join(LESSONS_DIR, file);
        const content = readFileSync(filePath, 'utf-8');
        const lesson = JSON.parse(content);

        // Validate it has required fields
        if (lesson.id && lesson.timestamp) {
          // Apply maxAge filter if specified
          if (maxAge) {
            const lessonTime = new Date(lesson.timestamp).getTime();
            if (Date.now() - lessonTime > maxAge) {
              continue;
            }
          }

          lessons.push(lesson);
          lessonsCache.set(lesson.id, lesson);
        }
      } catch (parseError) {
        console.warn(`Failed to parse lesson file ${file}:`, parseError.message);
      }
    }
  } catch (dirError) {
    console.warn('Failed to read lessons directory:', dirError.message);
  }

  // Sort by timestamp (newest first)
  lessons.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return lessons;
}

/**
 * Generate XML-formatted lesson record for embedding in prompts.
 *
 * @param {Object} lesson - The lesson record to format
 * @returns {string} XML-formatted lesson
 *
 * @example
 * const xml = formatLessonXML(lesson);
 * // Use in prompt: `${xml}`
 */
export function formatLessonXML(lesson) {
  if (!lesson) return '';

  // Escape XML special characters
  const escape = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  return `<lesson_record>
  <id>${escape(lesson.id)}</id>
  <timestamp>${escape(lesson.timestamp)}</timestamp>
  <failed_command>${escape(lesson.failedCommand)}</failed_command>
  <attempted_fix>${escape(lesson.attemptedFix)}</attempted_fix>
  <failure_trace>${escape(lesson.failureTrace?.slice(0, 1000))}</failure_trace>
  <root_cause>${escape(lesson.rootCause)}</root_cause>
  <blacklisted_pattern>${escape(lesson.blacklistedPattern)}</blacklisted_pattern>
  <prevention_rule>${escape(lesson.preventionRule)}</prevention_rule>
</lesson_record>`;
}

/**
 * Sanitize trace output by redacting sensitive information.
 * SECURITY: Prevents leaking credentials, tokens, and PII in lesson traces.
 *
 * @param {string} trace - Raw trace output
 * @returns {string} Sanitized trace
 */
function sanitizeTrace(trace) {
  if (!trace || typeof trace !== 'string') return '';

  let sanitized = trace;

  // Redact password patterns
  sanitized = sanitized.replace(/password\s*=\s*[^\s&;]+/gi, 'password=[REDACTED]');
  sanitized = sanitized.replace(/pwd\s*=\s*[^\s&;]+/gi, 'pwd=[REDACTED]');

  // Redact token patterns
  sanitized = sanitized.replace(/token\s*=\s*[^\s&;]+/gi, 'token=[REDACTED]');
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/api[_-]?key\s*=\s*[^\s&;]+/gi, 'api_key=[REDACTED]');

  // Redact connection strings
  sanitized = sanitized.replace(/mongodb:\/\/[^\s]+/gi, 'mongodb://[REDACTED]');
  sanitized = sanitized.replace(/postgres:\/\/[^\s]+/gi, 'postgres://[REDACTED]');
  sanitized = sanitized.replace(/mysql:\/\/[^\s]+/gi, 'mysql://[REDACTED]');

  // Redact email addresses
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL_REDACTED]',
  );

  // Redact IP addresses (except localhost)
  sanitized = sanitized.replace(
    /\b(?!127\.0\.0\.1|localhost)(?:\d{1,3}\.){3}\d{1,3}\b/g,
    '[IP_REDACTED]',
  );

  // Convert absolute paths to relative (Windows and Unix)
  // Match C:\path\to\file or /absolute/path/to/file
  sanitized = sanitized.replace(/[A-Z]:\\[^\s:*?"<>|]+/gi, (match) => {
    const parts = match.split('\\');
    // Keep only last 3 segments to maintain context
    return parts.length > 3 ? '...\\' + parts.slice(-3).join('\\') : match;
  });
  sanitized = sanitized.replace(/\/(?:home|Users|root)\/[^\s:*?"<>|]+/g, (match) => {
    const parts = match.split('/');
    // Keep only last 3 segments to maintain context
    return parts.length > 4 ? '.../' + parts.slice(-3).join('/') : match;
  });

  return sanitized;
}

/**
 * Format lesson as human-readable markdown.
 *
 * @param {Object} lesson - The lesson record
 * @returns {string} Markdown-formatted lesson
 */
export function formatLessonMarkdown(lesson) {
  if (!lesson) return '';

  // Sanitize trace before including in markdown
  const sanitizedTrace = sanitizeTrace(lesson.failureTrace);

  return `# Lesson: ${lesson.id.slice(0, 8)}

**Recorded:** ${lesson.timestamp}

## Failed Command
\`\`\`
${lesson.failedCommand}
\`\`\`

## Attempted Fix
${lesson.attemptedFix}

## Failure Trace
\`\`\`
${sanitizedTrace?.slice(0, 2000) || 'N/A'}
\`\`\`

## Root Cause Analysis
${lesson.rootCause}

## Prevention Rule
> ${lesson.preventionRule || 'No specific rule defined'}

## Blacklisted Pattern
\`${lesson.blacklistedPattern || 'None'}\`

---
*Auto-generated by HLLM*
`;
}

/**
 * Search lessons by various criteria.
 *
 * @param {Object} criteria - Search criteria
 * @param {string} [criteria.command] - Match against failed command
 * @param {string} [criteria.rootCause] - Match against root cause
 * @param {string} [criteria.text] - Full-text search across all fields
 * @param {Date} [criteria.after] - Only lessons after this date
 * @param {Date} [criteria.before] - Only lessons before this date
 * @returns {Object[]} Matching lessons
 */
export function searchLessons(criteria) {
  const lessons = loadLessons();

  return lessons.filter((lesson) => {
    // Command filter
    if (criteria.command) {
      if (!lesson.failedCommand?.toLowerCase().includes(criteria.command.toLowerCase())) {
        return false;
      }
    }

    // Root cause filter
    if (criteria.rootCause) {
      if (!lesson.rootCause?.toLowerCase().includes(criteria.rootCause.toLowerCase())) {
        return false;
      }
    }

    // Date filters
    if (criteria.after) {
      if (new Date(lesson.timestamp) < new Date(criteria.after)) {
        return false;
      }
    }

    if (criteria.before) {
      if (new Date(lesson.timestamp) > new Date(criteria.before)) {
        return false;
      }
    }

    // Full-text search
    if (criteria.text) {
      const searchText = criteria.text.toLowerCase();
      const lessonText = JSON.stringify(lesson).toLowerCase();
      if (!lessonText.includes(searchText)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get lesson statistics.
 *
 * @returns {Object} Statistics about stored lessons
 */
export function getLessonStats() {
  const lessons = loadLessons();

  const stats = {
    total: lessons.length,
    byMonth: {},
    topRootCauses: {},
    blacklistedPatterns: 0,
  };

  for (const lesson of lessons) {
    // Group by month
    const month = lesson.timestamp?.slice(0, 7) || 'unknown';
    stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;

    // Count root causes
    const cause = lesson.rootCause?.slice(0, 50) || 'unknown';
    stats.topRootCauses[cause] = (stats.topRootCauses[cause] || 0) + 1;

    // Count blacklisted patterns
    if (lesson.blacklistedPattern) {
      stats.blacklistedPatterns++;
    }
  }

  // Sort root causes by frequency
  stats.topRootCauses = Object.fromEntries(
    Object.entries(stats.topRootCauses)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10),
  );

  return stats;
}

/**
 * Clear the lessons cache.
 * Useful for testing or when lessons have been modified externally.
 */
export function clearCache() {
  lessonsCache.clear();
}

export default {
  LESSON_SCHEMA,
  isBlacklisted,
  createLessonRecord,
  persistLesson,
  loadLessons,
  formatLessonXML,
  formatLessonMarkdown,
  searchLessons,
  getLessonStats,
  clearCache,
};
