/**
 * User roles for the Capstone Management System.
 * These map directly to the RBAC model defined in .instructions.md Rule 2.
 */
export const ROLES = Object.freeze({
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADVISER: 'adviser',
  PANELIST: 'panelist',
  INSTRUCTOR: 'instructor',
});

/**
 * Panel assignment roles for faculty on a specific capstone project.
 */
export const PANEL_ROLES = Object.freeze({
  CHAIR: 'chair',
  MEMBER: 'member',
  SECRETARY: 'secretary',
});

/**
 * All valid role values as an array (for Mongoose enum validation).
 */
export const ROLE_VALUES = Object.values(ROLES);
export const PANEL_ROLE_VALUES = Object.values(PANEL_ROLES);

