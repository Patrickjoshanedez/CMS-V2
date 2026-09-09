/**
 * sectionUtils.js
 *
 * Institutional BukSU Capstone Section Formatting Utilities.
 * Enforces canonical academic hierarchy representation:
 * - Course: BSIT
 * - Year & Cluster: 4A (4 is Year, A is Cluster)
 * - Section Code: T87
 * - Canonical Section Name: "BSIT-4A" (strictly eliminating legacy "BSIT 4-A")
 * - Combined Display Label: "BSIT-4A (T87)"
 */

/**
 * Format a section name to canonical BukSU convention.
 * Converts "BSIT 4-A", "BSIT 4A", "4-A" -> "BSIT-4A"
 * Guarantees zero "BSIT 4-A" text.
 */
export function formatCanonicalSectionName(section, courseCode = '') {
  if (!section) return '';
  const rawName = typeof section === 'string' ? section : section.name || section.code || '';
  if (!rawName) return '';

  let cleaned = String(rawName).trim();

  // Normalize variants of BSIT 4-A, BSIT 4A, BSIT-4-A -> BSIT-4A
  cleaned = cleaned
    .replace(/^BSIT[\s_-]*4[\s_-]*A$/i, 'BSIT-4A')
    .replace(/^BSIT[\s_-]+(\d{1,2})[\s_-]*([A-Za-z])$/i, 'BSIT-$1$2')
    .replace(/\b(\d{1,2})[\s_-]+([A-Za-z])\b/g, '$1$2')
    .replace(/^BSIT\s+/i, 'BSIT-');

  // If section is just year+cluster (e.g. "4A" or "4-A")
  const yearClusterMatch = cleaned.match(/^(\d{1,2})[\s_-]*([A-Za-z])$/);
  if (yearClusterMatch) {
    const c = courseCode || (typeof section === 'object' && section.courseId?.code) || 'BSIT';
    cleaned = `${c}-${yearClusterMatch[1]}${yearClusterMatch[2].toUpperCase()}`;
  }

  // Remove any legacy "BSIT 4-A" or "4-A" occurrences
  cleaned = cleaned
    .replace(/BSIT\s+4-A/gi, 'BSIT-4A')
    .replace(/BSIT-4-A/gi, 'BSIT-4A')
    .replace(/4-A/gi, '4A');

  return cleaned;
}

/**
 * Format section with Section Code for comboboxes & selectors.
 * e.g. "BSIT-4A (T87)"
 */
export function formatSectionWithCode(section) {
  if (!section) return '';
  const courseCode =
    (typeof section === 'object' && (section.courseId?.code || section.courseCode)) || '';
  const canonicalName = formatCanonicalSectionName(section, courseCode);
  const code = (typeof section === 'object' ? section.code : '')?.trim() || '';

  if (code && code !== canonicalName) {
    return `${canonicalName} (${code})`;
  }
  return canonicalName;
}
