import { afterEach, describe, expect, it, vi } from 'vitest';
import AppError from '../../utils/AppError.js';
import MilestoneDeadline from '../../modules/settings/milestoneDeadline.model.js';
import submissionService from '../../modules/submissions/submission.service.js';

const pastDeadline = new Date(Date.now() - 60_000);

describe('SubmissionService scheduled deadline policy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses a section deadline override and blocks late uploads when policy closes them', async () => {
    const sectionRecord = {
      deadlineDate: pastDeadline,
      allowLateSubmission: false,
    };
    const findOne = vi.spyOn(MilestoneDeadline, 'findOne').mockImplementation((query) => ({
      lean: async () => (query.targetType === 'section' ? sectionRecord : null),
    }));

    await expect(
      submissionService._detectLateSubmission(
        {
          academicYear: '2025-2026',
          sectionId: 'section-a',
          deadlines: { finalAcademic: new Date(Date.now() + 60_000) },
        },
        'finalAcademic',
        'Synthetic late-submission reason',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'LATE_SUBMISSION_CLOSED',
    });

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({
      batchYear: '2025-2026',
      deliverable: 'full_academic_paper',
      targetType: 'section',
      sectionId: 'section-a',
    });
  });

  it('uses the batch scheduler policy and still requires remarks when late uploads are allowed', async () => {
    const findOne = vi.spyOn(MilestoneDeadline, 'findOne').mockImplementation((query) => ({
      lean: async () =>
        query.targetType === 'batch'
          ? { deadlineDate: pastDeadline, allowLateSubmission: true }
          : null,
    }));

    await expect(
      submissionService._detectLateSubmission(
        {
          academicYear: '2025-2026',
          teamId: { sectionId: 'section-a', academicYear: '2025-2026' },
          deadlines: { finalJournal: new Date(Date.now() + 60_000) },
        },
        'finalJournal',
        '',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'LATE_REMARKS_REQUIRED',
    });

    expect(findOne).toHaveBeenCalledTimes(2);
    expect(findOne).toHaveBeenNthCalledWith(2, {
      batchYear: '2025-2026',
      deliverable: 'condensed_journal_paper',
      targetType: 'batch',
    });
  });

  it('preserves project deadline enforcement when no scheduled record exists', async () => {
    vi.spyOn(MilestoneDeadline, 'findOne').mockReturnValue({ lean: async () => null });

    const error = await submissionService
      ._detectLateSubmission({ deadlines: { chapter4: pastDeadline } }, 'chapter4', '', null, true)
      .catch((caughtError) => caughtError);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'LATE_REMARKS_REQUIRED' });
  });
});
