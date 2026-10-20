const toId = (value) => String(value?._id || value || '');

function hasRecordedSignatures(signatures = {}) {
  return Boolean(
    signatures.secretary?.endorsed ||
      signatures.adviser?.signed ||
      signatures.instructor?.signed ||
      signatures.chair?.signed ||
      signatures.panelists?.some((signature) => signature.signed),
  );
}

function resolveSignatures(project, milestone) {
  const candidates = [
    project?.admSignaturesByMilestone?.[milestone],
    ...(milestone === 'CAPSTONE_3'
      ? [project?.admSignaturesByMilestone?.CAPSTONE_4, project?.admSignaturesByMilestone?.FINAL]
      : []),
  ].filter(Boolean);

  // The legacy unversioned slot represents ADM v1 only. Reusing it at a later
  // milestone can make an unsigned ADM appear complete with stale signatures.
  if (milestone === 'CAPSTONE_1') candidates.push(project?.admSignatures);

  return candidates.find(hasRecordedSignatures) || candidates[0] || {};
}

export function getADMCompletion(project, milestone) {
  const signatures = resolveSignatures(project, milestone);
  const assignments = (project?.panelists || []).filter(
    (assignment) => String(assignment.role || '').toLowerCase() !== 'secretary',
  );
  const chairAssignments = assignments.filter(
    (assignment) => String(assignment.role || '').toLowerCase() === 'chair',
  );
  let memberAssignments = assignments.filter(
    (assignment) => String(assignment.role || '').toLowerCase() !== 'chair',
  );

  if (memberAssignments.length === 0 && assignments.length === 0) {
    const chairId = toId(signatures.chair?.userId);
    memberAssignments = (project?.panelistIds || [])
      .map((userId) => ({ userId }))
      .filter((assignment) => toId(assignment.userId) !== chairId);
  }

  const signedPanelistIds = new Set(
    (signatures.panelists || [])
      .filter((signature) => signature.signed)
      .map((signature) => toId(signature.userId)),
  );
  const missing = [];

  if (!signatures.secretary?.endorsed) missing.push('secretary');
  if (!signatures.adviser?.signed) missing.push('adviser');
  if (!signatures.instructor?.signed) missing.push('instructor');
  if (!signatures.chair?.signed || chairAssignments.length === 0) missing.push('chair');

  for (const assignment of memberAssignments) {
    const memberId = toId(assignment.userId);
    if (!memberId || !signedPanelistIds.has(memberId)) {
      missing.push(`panelist:${memberId || 'unassigned'}`);
    }
  }

  return { signatures, missing, complete: missing.length === 0 };
}

export function isADMComplete(project, milestone) {
  return getADMCompletion(project, milestone).complete;
}
