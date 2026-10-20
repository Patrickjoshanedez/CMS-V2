import { describe, expect, it } from 'vitest';
import { resolveDashboardCapstonePhase } from '../../modules/dashboard/dashboard.service.js';

describe('dashboard capstone phase projection', () => {
  it('reports the persisted course without inferring advancement from title or chapter state', () => {
    const project = {
      capstonePhase: 1,
      titleStatus: 'approved',
      stage: 'capstone_1',
      projectStatus: 'proposal_approved',
    };

    expect(resolveDashboardCapstonePhase(project)).toBe(1);
    expect(project.capstonePhase).toBe(1);
  });

  it('normalizes legacy phase 4 to the third and final Capstone course', () => {
    expect(resolveDashboardCapstonePhase({ capstonePhase: 4, stage: 'final' })).toBe(3);
    expect(resolveDashboardCapstonePhase({ stage: 'final' })).toBe(3);
  });

  it('keeps valid persisted Capstone course numbers unchanged', () => {
    expect(
      [1, 2, 3].map((capstonePhase) => resolveDashboardCapstonePhase({ capstonePhase })),
    ).toEqual([1, 2, 3]);
  });
});
