import { describe, expect, it } from 'vitest';
import {
  getMilestoneDeadlineState,
  getProjectMilestoneScope,
  resolveConfiguredMilestoneDeadline,
  resolveProjectSubmissionDeadlines,
} from './milestoneDeadlines';

const batchDeadline = {
  _id: 'batch-ch1',
  batchYear: '2025-2026',
  targetType: 'batch',
  deliverable: 'chapter_1',
  deadlineDate: '2026-11-01T23:59:59.999Z',
  allowLateSubmission: true,
};

describe('milestone deadline resolution', () => {
  const project = {
    academicYear: '2025-2026',
    sectionId: { _id: 'section-a', academicYear: '2025-2026' },
    deadlines: { chapter1: '2026-12-01T23:59:59.999Z', chapter2: '2026-12-02T23:59:59.999Z' },
  };

  it('derives batch and section scope from the active project', () => {
    expect(getProjectMilestoneScope(project)).toEqual({
      batchYear: '2025-2026',
      sectionId: 'section-a',
    });
  });

  it('prefers the active section deadline over a batch default', () => {
    const sectionDeadline = {
      ...batchDeadline,
      _id: 'section-ch1',
      targetType: 'section',
      sectionId: { _id: 'section-a' },
      deadlineDate: '2026-10-15T23:59:59.999Z',
      allowLateSubmission: false,
    };

    expect(resolveConfiguredMilestoneDeadline([batchDeadline, sectionDeadline], project, 'chapter_1'))
      .toEqual(sectionDeadline);
  });

  it('ignores other sections and batches before falling back to the batch deadline', () => {
    const otherSection = {
      ...batchDeadline,
      targetType: 'section',
      sectionId: { _id: 'section-b' },
      deadlineDate: '2026-10-15T23:59:59.999Z',
    };
    const otherBatch = { ...batchDeadline, batchYear: '2026-2027' };

    expect(
      resolveConfiguredMilestoneDeadline(
        [otherBatch, otherSection, batchDeadline],
        project,
        'chapter_1',
      ),
    ).toEqual(batchDeadline);
  });

  it('uses scheduled dates and late policy while retaining the project mirror as fallback', () => {
    const sectionDeadline = {
      ...batchDeadline,
      targetType: 'section',
      sectionId: 'section-a',
      deadlineDate: '2026-10-15T23:59:59.999Z',
      allowLateSubmission: false,
    };
    const resolved = resolveProjectSubmissionDeadlines(project, [batchDeadline, sectionDeadline]);

    expect(resolved.deadlines.chapter1).toBe(sectionDeadline.deadlineDate);
    expect(resolved.deadlines.chapter2).toBe(project.deadlines.chapter2);
    expect(resolved.policies.chapter1).toEqual({
      deadlineDate: sectionDeadline.deadlineDate,
      allowLateSubmission: false,
      source: 'scheduler',
    });
    expect(resolved.policies.chapter2).toEqual({
      deadlineDate: project.deadlines.chapter2,
      allowLateSubmission: true,
      source: 'project',
    });
  });

  it('uses the scheduler boundary: a deadline is overdue only after its timestamp', () => {
    const due = Date.parse('2026-10-17T15:59:59.999Z');
    expect(getMilestoneDeadlineState(due, due)).toBe('upcoming');
    expect(getMilestoneDeadlineState(due, due + 1)).toBe('overdue');
    expect(getMilestoneDeadlineState('invalid-date', due)).toBe('unscheduled');
  });
});
