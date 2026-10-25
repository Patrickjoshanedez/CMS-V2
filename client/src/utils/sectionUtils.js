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

import { inferCapstoneCourseFromSection, resolveCapstoneCurriculumMeta } from '@cms/shared';

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
 * Extract the Section Code (e.g. "T65", "T76", "T89") distinctly from the Section Block ("BSIT-4B").
 * Prevents legacy records where `code` was saved as "BSIT-4B" from displaying the block name as a T-code.
 */
export function extractSectionCode(section) {
  if (!section || typeof section !== 'object') return '';
  const rawCode = String(section.code || '')
    .trim()
    .toUpperCase();
  if (!rawCode) return '';

  const courseCode = section.courseId?.code || section.courseCode || 'BSIT';
  const canonicalBlock = formatCanonicalSectionName(section, courseCode).toUpperCase();
  const normalizedName = String(section.name || '')
    .trim()
    .toUpperCase();

  // If the stored code is identical to the section block (e.g. "BSIT-4B" or "4B"), it is not a T-code
  if (rawCode === canonicalBlock || rawCode === normalizedName) {
    return '';
  }
  return rawCode;
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
  const code = extractSectionCode(section);

  if (code && code !== canonicalName) {
    return `${canonicalName} (${code})`;
  }
  return canonicalName;
}

/**
 * Resolve the Capstone course & semester metadata for a section object.
 * Returns { capstoneCourse, courseTitle, yearLabel, academicTerm, curriculumLabel } or null.
 */
export function resolveSectionCapstoneMeta(section, fallbackTerm = '') {
  if (!section || typeof section !== 'object') return null;
  const term = section.academicTerm || fallbackTerm || '1st Semester';
  const courseNum =
    section.capstoneCourse ?? inferCapstoneCourseFromSection(section.name || '', term);
  const meta = resolveCapstoneCurriculumMeta(courseNum);
  if (!meta) {
    return {
      capstoneCourse: null,
      courseTitle: null,
      yearLabel: null,
      academicTerm: term,
      curriculumLabel: term,
    };
  }
  return {
    ...meta,
    academicTerm: section.academicTerm || meta.academicTerm,
  };
}
