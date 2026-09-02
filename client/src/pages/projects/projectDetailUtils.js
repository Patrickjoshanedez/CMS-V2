export function getProjectResolveErrorMessage(
  error,
  fallbackMessage = 'Failed to resolve modification.',
) {
  const apiMessage = error?.response?.data?.error?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  const responseMessage = error?.response?.data?.message;
  if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
    return responseMessage;
  }

  if (typeof error?.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function getFullName(person) {
  if (!person) return '';
  if (typeof person === 'string') return person;
  const parts = [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .map((part) => String(part).trim());
  return parts.length ? parts.join(' ') : person.email || '';
}

export function getProjectAuthors(project) {
  const assignmentAuthors = (project?.memberRoleAssignments || [])
    .map((assignment) => assignment?.userId)
    .map(getFullName)
    .filter(Boolean);
  if (assignmentAuthors.length > 0) return assignmentAuthors;
  const teamName = project?.teamId?.name;
  return teamName ? [teamName] : [];
}
