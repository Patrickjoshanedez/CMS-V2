import User from '../users/user.model.js';
import Section from './section.model.js';
import AppError from '../../utils/AppError.js';

/**
 * Require the actor to be the instructor assigned to a team's leader or section.
 *
 * @param {Object} team - Team document, optionally with populated leaderId
 * @param {string} instructorId - Authenticated instructor ID
 * @returns {Promise<void>}
 */
export async function assertAssignedInstructorForTeam(team, instructorId) {
  const leaderId = team?.leaderId?._id || team?.leaderId;
  const leader = team?.leaderId?.instructorId
    ? team.leaderId
    : leaderId
      ? await User.findById(leaderId).select('instructorId sectionId')
      : null;

  let assignedInstructorId = leader?.instructorId?._id || leader?.instructorId;
  if (!assignedInstructorId) {
    const sectionId = team?.sectionId || leader?.sectionId;
    if (sectionId) {
      const section = await Section.findById(sectionId).select('createdBy');
      assignedInstructorId = section?.createdBy?._id || section?.createdBy;
    }
  }

  if (!assignedInstructorId || String(assignedInstructorId) !== String(instructorId)) {
    throw new AppError(
      'Only the instructor assigned to this team can perform this action.',
      403,
      'NOT_ASSIGNED_INSTRUCTOR',
    );
  }
}
