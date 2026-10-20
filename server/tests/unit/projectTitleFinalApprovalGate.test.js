import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELIVERABLE_TYPES, PROJECT_STATUSES } from '@cms/shared';
import Project from '../../modules/projects/project.model.js';
import Evaluation from '../../modules/evaluations/evaluation.model.js';
import projectTitleService from '../../modules/projects/services/projectTitle.service.js';

describe('projectTitleService.evaluatePostApprovalUnlocks', () => {
  const projectId = '65e000000000000000000002';
  const chairId = '65e000000000000000000020';
  const memberId = '65e000000000000000000021';
  let project;

  beforeEach(() => {
    vi.restoreAllMocks();
    project = {
      _id: projectId,
      projectStatus: PROJECT_STATUSES.ACTIVE,
      stage: 'capstone_3',
      admStatus: 'approved',
      defenseSchedule: { verdict: 'passed' },
      panelists: [
        { userId: chairId, role: 'chair' },
        { userId: memberId, role: 'member' },
      ],
      admSignaturesByMilestone: {
        CAPSTONE_3: {
          secretary: { endorsed: true },
          adviser: { signed: true },
          instructor: { signed: true },
          chair: { signed: true, userId: chairId },
          panelists: [{ userId: memberId, signed: true }],
        },
      },
      unlockedDeliverables: [],
      save: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(Project, 'findById').mockResolvedValue(project);
    vi.spyOn(Evaluation, 'find').mockImplementation(() => ({
      select: vi.fn().mockResolvedValue([]),
    }));
  });

  it('does not let a schedule verdict or legacy approved status replace missing final evaluations and ADM', async () => {
    vi.spyOn(Evaluation, 'find').mockImplementation(() => ({
      select: vi.fn().mockResolvedValue([{ panelistId: chairId, decision: 'passed' }]),
    }));
    project.admSignaturesByMilestone.CAPSTONE_3 = { secretary: { endorsed: false } };

    const result = await projectTitleService.evaluatePostApprovalUnlocks(projectId);

    expect(result.isUnlocked).toBe(false);
    expect(project.save).not.toHaveBeenCalled();
    expect(project.projectStatus).toBe(PROJECT_STATUSES.ACTIVE);
  });

  it('rejects final approval unlock mutations after archival', async () => {
    project.isArchived = true;

    await expect(projectTitleService.evaluatePostApprovalUnlocks(projectId)).rejects.toMatchObject({
      code: 'PROJECT_ARCHIVED',
      statusCode: 409,
    });

    expect(Evaluation.find).not.toHaveBeenCalled();
    expect(project.save).not.toHaveBeenCalled();
  });

  it('unlocks only the final approved paper after every final sign-off is complete', async () => {
    vi.spyOn(Evaluation, 'find').mockImplementation(() => ({
      select: vi.fn().mockResolvedValue([
        { panelistId: chairId, decision: 'passed' },
        { panelistId: memberId, decision: 'passed_with_revision' },
      ]),
    }));

    const result = await projectTitleService.evaluatePostApprovalUnlocks(projectId);

    expect(result.isUnlocked).toBe(true);
    expect(project.projectStatus).toBe(PROJECT_STATUSES.FINAL_APPROVED);
    expect(project.stage).toBe('final');
    expect(project.unlockedDeliverables).toContain(DELIVERABLE_TYPES.FINAL_APPROVED_PAPER);
    expect(project.unlockedDeliverables).not.toContain(DELIVERABLE_TYPES.FULL_ACADEMIC_PAPER);
    expect(project.unlockedDeliverables).not.toContain(DELIVERABLE_TYPES.CONDENSED_JOURNAL_PAPER);
    expect(project.save).toHaveBeenCalledOnce();
  });
});
