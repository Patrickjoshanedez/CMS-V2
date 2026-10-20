import { describe, it, expect, vi, beforeEach } from 'vitest';
import projectArchiveService from '../../modules/projects/services/projectArchive.service.js';
import teamService from '../../modules/teams/team.service.js';
import Project from '../../modules/projects/project.model.js';
import Team from '../../modules/teams/team.model.js';
import User from '../../modules/users/user.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import { ROLES, PROJECT_STATUSES } from '@cms/shared';

vi.mock('../../modules/projects/project.model.js');
vi.mock('../../modules/teams/team.model.js');
vi.mock('../../modules/users/user.model.js');
vi.mock('../../modules/submissions/submission.model.js');
vi.mock('../../modules/system/services/settings.service.js', () => ({
  default: {
    getPlagiarismThreshold: vi.fn().mockResolvedValue(75),
  },
}));

describe('Institutional Workflow Enforcement & Reliability Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Archival Phase Gate (projectArchive.service.js)', () => {
    it('rejects archival of Phase 1 projects with PHASE_PREREQUISITE_UNMET', async () => {
      Project.findById.mockResolvedValue({
        _id: 'proj-phase-1',
        title: 'Title Proposal Project',
        capstonePhase: 1,
        projectStatus: PROJECT_STATUSES.ACTIVE,
      });

      await expect(
        projectArchiveService.archiveProject('proj-phase-1', 'inst-1', {}),
      ).rejects.toThrowError(/Only projects in the final capstone phase.*eligible for archival/i);

      try {
        await projectArchiveService.archiveProject('proj-phase-1', 'inst-1', {});
      } catch (err) {
        expect(err.code).toBe('PHASE_PREREQUISITE_UNMET');
        expect(err.statusCode).toBe(400);
      }
    });

    it('rejects archival of Phase 2 projects with PHASE_PREREQUISITE_UNMET', async () => {
      Project.findById.mockResolvedValue({
        _id: 'proj-phase-2',
        title: 'Midterm Manuscript Project',
        capstonePhase: 2,
        projectStatus: PROJECT_STATUSES.ACTIVE,
      });

      await expect(
        projectArchiveService.archiveProject('proj-phase-2', 'inst-1', {}),
      ).rejects.toThrowError(/Only projects in the final capstone phase.*eligible for archival/i);
    });

    it('uses Capstone 3 as the archival authority when legacy labels are stale', async () => {
      Project.findById.mockResolvedValue({
        _id: 'proj-phase-3-stale-labels',
        title: 'Final Phase Project',
        capstonePhase: 3,
        capstoneCourse: 'Capstone 1',
        stage: 'capstone_1',
        projectStatus: PROJECT_STATUSES.ACTIVE,
      });

      await expect(
        projectArchiveService.archiveProject('proj-phase-3-stale-labels', 'inst-1', {}),
      ).rejects.toMatchObject({ code: 'SECRETARY_ENDORSEMENT_REQUIRED' });
    });

    it('rejects archival when defense verdict is non-passing with DEFENSE_VERDICT_UNMET', async () => {
      Project.findById.mockResolvedValue({
        _id: 'proj-failed-defense',
        title: 'Failed Defense Project',
        capstonePhase: 4,
        stage: 'final',
        projectStatus: PROJECT_STATUSES.ACTIVE,
        defenseSchedule: { verdict: 'Failed' },
      });

      await expect(
        projectArchiveService.archiveProject('proj-failed-defense', 'inst-1', {}),
      ).rejects.toThrowError(/Project defense must have a passing verdict/i);

      try {
        await projectArchiveService.archiveProject('proj-failed-defense', 'inst-1', {});
      } catch (err) {
        expect(err.code).toBe('DEFENSE_VERDICT_UNMET');
      }
    });

    it('rejects archival when ADM remarks exist without secretary endorsement with SECRETARY_ENDORSEMENT_REQUIRED', async () => {
      Project.findById.mockResolvedValue({
        _id: 'proj-unendorsed-adm',
        title: 'Unendorsed ADM Project',
        capstonePhase: 4,
        stage: 'final',
        projectStatus: PROJECT_STATUSES.ACTIVE,
        defenseSchedule: { verdict: 'Passed' },
        actionDoneMatrix: [{ item: 'Fix citations' }],
        admSignatures: { secretary: { endorsed: false } },
      });

      await expect(
        projectArchiveService.archiveProject('proj-unendorsed-adm', 'inst-1', {}),
      ).rejects.toThrowError(
        /final Action Done Matrix must be endorsed by the committee secretary/i,
      );

      try {
        await projectArchiveService.archiveProject('proj-unendorsed-adm', 'inst-1', {});
      } catch (err) {
        expect(err.code).toBe('SECRETARY_ENDORSEMENT_REQUIRED');
      }
    });

    it('rejects archival until every final ADM signatory has signed', async () => {
      Project.findById.mockResolvedValue({
        _id: 'proj-final-adm-incomplete',
        title: 'Final ADM Awaiting Instructor Signature',
        capstonePhase: 3,
        stage: 'capstone_3',
        projectStatus: PROJECT_STATUSES.ACTIVE,
        defenseSchedule: { verdict: 'Passed' },
        panelists: [{ userId: 'chair-1', role: 'chair' }],
        actionDoneMatrix: [
          { milestone: 'CAPSTONE_3', status: 'verified', suggestion: 'Final correction' },
        ],
        admSignaturesByMilestone: {
          CAPSTONE_3: {
            secretary: { endorsed: true },
            adviser: { signed: true },
            instructor: { signed: false },
            chair: { signed: true },
            panelists: [],
          },
        },
      });

      await expect(
        projectArchiveService.archiveProject('proj-final-adm-incomplete', 'inst-1', {}),
      ).rejects.toMatchObject({ code: 'FINAL_ADM_SIGNATURES_INCOMPLETE' });
    });

    it('rejects archival if already archived with ALREADY_ARCHIVED', async () => {
      Project.findById.mockResolvedValue({
        _id: 'proj-archived',
        title: 'Archived Project',
        capstonePhase: 4,
        stage: 'final',
        projectStatus: PROJECT_STATUSES.ARCHIVED,
      });

      await expect(
        projectArchiveService.archiveProject('proj-archived', 'inst-1', {}),
      ).rejects.toThrowError(/already archived/i);
    });
  });

  describe('Committee Appointment Validation (team.service.js)', () => {
    beforeEach(() => {
      User.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: 'inst-1',
          firstName: 'Instructor',
          lastName: 'BukSU',
          role: ROLES.INSTRUCTOR,
        }),
      });
    });

    it('rejects non-existent panelist ID with INVALID_PANELIST', async () => {
      const mockTeam = {
        _id: 'team-1',
        save: vi.fn().mockResolvedValue(true),
      };
      Team.findById.mockResolvedValue(mockTeam);

      // 3 IDs requested, but only 2 found in database
      const panelistIds = ['panelist-1', 'panelist-2', 'panelist-missing'];
      User.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([
          { _id: 'panelist-1', firstName: 'Alice', lastName: 'Prof', role: ROLES.FACULTY },
          { _id: 'panelist-2', firstName: 'Bob', lastName: 'Prof', role: ROLES.FACULTY },
        ]),
      });

      await expect(
        teamService.assignCommittee('team-1', 'inst-1', { panelistIds }),
      ).rejects.toThrowError(/One or more specified panelists were not found/i);

      try {
        await teamService.assignCommittee('team-1', 'inst-1', { panelistIds });
      } catch (err) {
        expect(err.code).toBe('INVALID_PANELIST');
      }
    });

    it('rejects course instructor appointed as panelist with INVALID_COMMITTEE_ROLE', async () => {
      const mockTeam = {
        _id: 'team-2',
        save: vi.fn().mockResolvedValue(true),
      };
      Team.findById.mockResolvedValue(mockTeam);

      const panelistIds = ['inst-user-1'];
      User.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([
          {
            _id: 'inst-user-1',
            firstName: 'Prof',
            lastName: 'Instructor',
            role: ROLES.INSTRUCTOR,
          },
        ]),
      });

      await expect(
        teamService.assignCommittee('team-2', 'inst-1', { panelistIds }),
      ).rejects.toThrowError(/Course instructors cannot serve as defense panelists/i);

      try {
        await teamService.assignCommittee('team-2', 'inst-1', { panelistIds });
      } catch (err) {
        expect(err.code).toBe('INVALID_COMMITTEE_ROLE');
      }
    });

    it('rejects duplicate panelists with DUPLICATE_PANELISTS', async () => {
      const mockTeam = { _id: 'team-3' };
      Team.findById.mockResolvedValue(mockTeam);

      const duplicatePanelistIds = ['panelist-1', 'panelist-1'];

      await expect(
        teamService.assignCommittee('team-3', 'inst-1', { panelistIds: duplicatePanelistIds }),
      ).rejects.toThrowError(/duplicate faculty members/i);
    });
  });
});
