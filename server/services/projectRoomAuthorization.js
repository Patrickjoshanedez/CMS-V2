const normalizeId = (value) => (value?._id || value)?.toString();

const containsId = (values, userId) =>
  Array.isArray(values) && values.some((value) => normalizeId(value) === userId);

/** Decide whether the current account may receive private project-room events. */
export function canJoinProjectRoom(user, project, team, leader, section) {
  if (!user || !project || !user.isActive || !user.isVerified) return false;
  const userId = normalizeId(user._id);
  if (!userId) return false;
  if (user.role === 'admin') return true;

  const member =
    project.memberRoleAssignments?.some((entry) => normalizeId(entry.userId) === userId) ||
    containsId(team?.members, userId) ||
    normalizeId(team?.leaderId) === userId;
  if (user.role === 'student') return Boolean(member);

  if (user.role === 'instructor') {
    return (
      normalizeId(leader?.instructorId) === userId ||
      normalizeId(team?.instructorId) === userId ||
      normalizeId(team?.sectionInstructorId) === userId ||
      normalizeId(section?.createdBy) === userId
    );
  }

  if (['faculty', 'adviser', 'panelist', 'secretary'].includes(user.role)) {
    return [
      project.adviserId,
      project.secretaryId,
      ...(project.panelistIds || []),
      team?.adviserId,
      team?.secretaryId,
      ...(team?.panelistIds || []),
    ].some((appointment) => normalizeId(appointment) === userId);
  }

  return false;
}
