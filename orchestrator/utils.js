/**
 * Orchestrator Utilities
 *
 * Shared utility functions for the orchestrator system.
 * Provides centralized implementations for common operations
 * to ensure consistency and maintainability.
 *
 * @module orchestrator/utils
 */

/**
 * Generate a safe timestamp string for use in filenames.
 *
 * CROSS-PLATFORM: Removes characters that are invalid in filenames
 * on Windows (`:`, `-`, `.`) while maintaining uniqueness and sortability.
 *
 * Format: YYYYMMDDHHmmss (14 characters)
 * Example: 20240115143022 for 2024-01-15T14:30:22.123Z
 *
 * @returns {string} Filesystem-safe timestamp string
 *
 * @example
 * const ts = getSafeTimestamp();
 * const filename = `lesson-${ts}-${uuid}.json`;
 * // => lesson-20240115143022-a1b2c3d4.json
 */
export function getSafeTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[:\-T.]/g, '')
    .slice(0, 14);
}

/**
 * Convert an ISO timestamp string to a safe filename timestamp.
 *
 * @param {string} isoTimestamp - ISO 8601 timestamp string
 * @returns {string} Filesystem-safe timestamp string
 *
 * @example
 * const safe = toSafeTimestamp('2024-01-15T14:30:22.123Z');
 * // => 20240115143022
 */
export function toSafeTimestamp(isoTimestamp) {
  return new Date(isoTimestamp)
    .toISOString()
    .replace(/[:\-T.]/g, '')
    .slice(0, 14);
}

/**
 * Parse a safe timestamp back to an ISO string.
 *
 * @param {string} safeTimestamp - Safe timestamp (YYYYMMDDHHmmss)
 * @returns {string} ISO 8601 timestamp string
 *
 * @example
 * const iso = fromSafeTimestamp('20240115143022');
 * // => 2024-01-15T14:30:22.000Z
 */
export function fromSafeTimestamp(safeTimestamp) {
  if (!/^\d{14}$/.test(safeTimestamp)) {
    throw new Error(`Invalid safe timestamp format: ${safeTimestamp}`);
  }

  const year = safeTimestamp.slice(0, 4);
  const month = safeTimestamp.slice(4, 6);
  const day = safeTimestamp.slice(6, 8);
  const hour = safeTimestamp.slice(8, 10);
  const minute = safeTimestamp.slice(10, 12);
  const second = safeTimestamp.slice(12, 14);

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}
