import { describe, expect, it } from 'vitest';
import { resolveProjectDefaultTab, mapStepToWorkflowTab } from './ProjectDetailPage';
import { TITLE_STATUSES, PROJECT_STATUSES, CAPSTONE_PHASES } from '@cms/shared';

describe('ProjectDetailPage Tab Synchronization Suite', () => {
  describe('resolveProjectDefaultTab', () => {
    it('returns capstone_1 for draft projects with unapproved title in Phase 1', () => {
      const project = {
        capstonePhase: 1,
        titleStatus: TITLE_STATUSES.DRAFT,
        projectStatus: PROJECT_STATUSES.PROPOSAL,
      };
      expect(resolveProjectDefaultTab(project)).toBe('capstone_1');
    });

    it('returns capstone_2 when titleStatus is approved even if capstonePhase is 1', () => {
      const project = {
        capstonePhase: 1,
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.IN_PROGRESS,
      };
      expect(resolveProjectDefaultTab(project)).toBe('capstone_2');
    });

    it('returns capstone_2 when capstonePhase is 2', () => {
      const project = {
        capstonePhase: 2,
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.IN_PROGRESS,
      };
      expect(resolveProjectDefaultTab(project)).toBe('capstone_2');
    });

    it('returns capstone_3 when capstonePhase is 3', () => {
      const project = {
        capstonePhase: 3,
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.IN_PROGRESS,
      };
      expect(resolveProjectDefaultTab(project)).toBe('capstone_3');
    });

    it('returns capstone_4 when capstonePhase is 4', () => {
      const project = {
        capstonePhase: 4,
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.IN_PROGRESS,
      };
      expect(resolveProjectDefaultTab(project)).toBe('capstone_4');
    });

    it('returns capstone_4 when project is defended or archived', () => {
      expect(
        resolveProjectDefaultTab({
          capstonePhase: 2,
          isArchived: true,
        }),
      ).toBe('capstone_4');

      expect(
        resolveProjectDefaultTab({
          capstonePhase: 2,
          projectStatus: PROJECT_STATUSES.DEFENDED,
        }),
      ).toBe('capstone_4');
    });
  });

  describe('mapStepToWorkflowTab', () => {
    it('maps stepper indices 0 and 1 to capstone_1', () => {
      expect(mapStepToWorkflowTab(0)).toBe('capstone_1');
      expect(mapStepToWorkflowTab(1)).toBe('capstone_1');
    });

    it('maps stepper index 2 to capstone_2', () => {
      expect(mapStepToWorkflowTab(2)).toBe('capstone_2');
    });

    it('maps stepper index 3 to capstone_3', () => {
      expect(mapStepToWorkflowTab(3)).toBe('capstone_3');
    });

    it('maps stepper index 4 to capstone_4', () => {
      expect(mapStepToWorkflowTab(4)).toBe('capstone_4');
    });

    it('maps archived steps correctly', () => {
      expect(mapStepToWorkflowTab(4, true)).toBe('capstone_4');
      expect(mapStepToWorkflowTab(2, true)).toBe('adm');
    });
  });
});
