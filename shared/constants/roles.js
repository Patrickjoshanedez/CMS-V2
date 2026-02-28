/**
 * User roles for the Capstone Management System.
 * These map directly to the RBAC model defined in .instructions.md Rule 2.
 */
export const ROLES = Object.freeze({
  STUDENT: 'student',
  ADVISER: 'adviser',
  PANELIST: 'panelist',
  INSTRUCTOR: 'instructor',
});

/**
 * All valid role values as an array (for Mongoose enum validation).
 */
export const ROLE_VALUES = Object.values(ROLES);
