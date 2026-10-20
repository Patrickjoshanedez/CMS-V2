const SUBMISSION_DEADLINE_FIELDS = Object.freeze({
  chapter1: 'chapter_1',
  chapter2: 'chapter_2',
  chapter3: 'chapter_3',
  chapter4: 'chapter_4',
  chapter5: 'chapter_5',
  proposal: 'capstone_1_proposal',
  finalAcademic: 'full_academic_paper',
  finalJournal: 'condensed_journal_paper',
});

function toId(value) {
  const id = value?._id ?? value?.id ?? value;
  return id === null || id === undefined ? '' : String(id).trim();
}

/** Resolve the academic batch and section used by the milestone deadline API. */
export function getProjectMilestoneScope(project) {
  const team = project?.teamId || project?.team || {};
  const projectSection = project?.sectionId;
  const section =
    (projectSection && typeof projectSection === 'object' ? projectSection : null) ||
    (team.sectionId && typeof team.sectionId === 'object' ? team.sectionId : null) ||
    {};

  return {
    batchYear: String(
      project?.academicYear || team.academicYear || section.academicYear || '',
    ).trim(),
    sectionId: toId(projectSection) || toId(team.sectionId),
  };
}

/**
 * Resolve a single configured deadline, preferring a section override over its batch default.
 */
export function resolveConfiguredMilestoneDeadline(records, project, deliverable) {
  if (!Array.isArray(records) || !deliverable) return null;

  const { batchYear, sectionId } = getProjectMilestoneScope(project);
  if (!batchYear) return null;

  const matching = records.filter(
    (record) =>
      String(record?.batchYear || '').trim() === batchYear &&
      record?.deliverable === deliverable &&
      record?.deadlineDate,
  );

  if (sectionId) {
    const sectionDeadline = matching.find(
      (record) =>
        record?.targetType === 'section' && toId(record?.sectionId) === sectionId,
    );
    if (sectionDeadline) return sectionDeadline;
  }

  return matching.find((record) => record?.targetType === 'batch') || null;
}

/**
 * Resolve canonical scheduler records for student submissions while retaining the
 * existing project deadline projection as a fallback during API outages or legacy data.
 */
export function resolveProjectSubmissionDeadlines(project, records = []) {
  const deadlines = { ...(project?.deadlines || {}) };
  const policies = {};

  Object.entries(SUBMISSION_DEADLINE_FIELDS).forEach(([field, deliverable]) => {
    const configured = resolveConfiguredMilestoneDeadline(records, project, deliverable);
    const deadlineDate = configured?.deadlineDate || deadlines[field];
    if (!deadlineDate) return;

    deadlines[field] = deadlineDate;
    policies[field] = {
      deadlineDate,
      allowLateSubmission: configured?.allowLateSubmission !== false,
      source: configured ? 'scheduler' : 'project',
    };
  });

  return { deadlines, policies };
}

/** Keep the same strict due-date boundary used by the instructor scheduler. */
export function getMilestoneDeadlineState(deadlineDate, now = Date.now()) {
  if (!deadlineDate) return 'unscheduled';
  const timestamp = new Date(deadlineDate).getTime();
  if (!Number.isFinite(timestamp)) return 'unscheduled';
  return now > timestamp ? 'overdue' : 'upcoming';
}
