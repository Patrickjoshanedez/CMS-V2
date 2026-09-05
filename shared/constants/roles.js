/**
 * User roles for the Capstone Management System.
 *
 * Primary roles: student, faculty, adviser, panelist, instructor
 * "faculty" is the unified account type that also supports sub-role tagging (facultyRole).
 */
export const ROLES = Object.freeze({
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADVISER: 'adviser',
  PANELIST: 'panelist',
  INSTRUCTOR: 'instructor',
});

/**
 * Faculty sub-role types — stored on the User document as `facultyRole`.
 * A single Faculty user may serve as adviser on one project and panelist on another
 * (differentiated per-project via panelistAssignmentSchema).
 */
export const FACULTY_ROLES = Object.freeze({
  ADVISER: 'adviser',
  PANELIST: 'panelist',
});

/**
 * Panel assignment roles for faculty on a specific capstone project.
 * Used in panelistAssignmentSchema on the Project document.
 */
export const PANEL_ROLES = Object.freeze({
  CHAIR: 'chair',
  MEMBER: 'member',
  SECRETARY: 'secretary',
});

export const ROLE_VALUES = Object.values(ROLES);
export const PANEL_ROLE_VALUES = Object.values(PANEL_ROLES);
export const FACULTY_ROLE_VALUES = Object.values(FACULTY_ROLES);

/**
 * Primary user account roles visible in user management dropdowns and registration.
 * Adviser, Panelist, Secretary, and Chair roles are committee/faculty appointments under the Faculty umbrella.
 */
export const PRIMARY_ROLES = Object.freeze({
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  FACULTY: 'faculty',
});

export const PRIMARY_ROLE_VALUES = Object.values(PRIMARY_ROLES);

/**
 * Capability set scoped to the Committee Secretary role during oral defenses.
 */
export const SECRETARY_CAPABILITIES = Object.freeze({
  MINUTES_WRITE: 'defense.minutes:create/update',
  VERDICT_FINALIZE: 'defense.verdict:finalize',
  RUBRICS_AGGREGATE: 'rubrics.composite:view/aggregate',
  MATRIX_PUBLISH: 'revisions.matrix:publish',
  MATRIX_ENDORSE: 'revisions.matrix:endorse',
});

export const SECRETARY_CAPABILITY_VALUES = Object.values(SECRETARY_CAPABILITIES);
