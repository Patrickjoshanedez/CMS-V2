import { describe, it, expect, vi, beforeEach } from 'vitest';
import Project from '../../modules/projects/project.model.js';
import { invalidateProjectCache } from '../../modules/projects/project.controller.js';
import cacheService from '../../services/cache.service.js';

vi.mock('../../services/cache.service.js', () => ({
  default: {
    del: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
  },
}));

describe('Project Unison ADM Object & Cache Invalidation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides getUnisonADM method returning unified v1-v3 partitions with rows and signatures', () => {
    const project = new Project({
      title: 'Real-Time IoT Plant Monitoring',
      capstonePhase: 2,
      admStatus: 'pending_secretary_endorsement',
      admReviewType: 'internal',
      admSignatures: {
        secretary: { endorsed: true, signatoryName: 'Prof. Secretary' },
        adviser: { signed: true, signatoryName: 'Dr. Adviser' },
      },
      admSignaturesByMilestone: {
        CAPSTONE_1: {
          secretary: { endorsed: true, signatoryName: 'Prof. Sec v1' },
          adviser: { signed: true, signatoryName: 'Dr. Adv v1' },
          chair: { signed: true, signatoryName: 'Dr. Chair v1' },
        },
        CAPSTONE_2: {
          secretary: { endorsed: true, signatoryName: 'Prof. Sec v2' },
          adviser: { signed: true, signatoryName: 'Dr. Adv v2' },
          panelists: [
            { userId: '507f191e810c19729de860ea', signed: true, signatoryName: 'Panelist One' },
          ],
        },
        CAPSTONE_3: {
          secretary: { endorsed: false },
        },
      },
      actionDoneMatrix: [
        {
          panelName: 'Dr. Panelist A',
          suggestion: 'Fix Introduction scope',
          actionDone: 'Revised Chapter 1 background',
          pageNumbers: 'p. 12',
          milestone: 'CAPSTONE_1',
          status: 'verified',
        },
        {
          panelName: 'Dr. Panelist B',
          suggestion: 'Provide sensor schematics',
          actionDone: 'Added wiring diagrams in Section 3.4',
          pageNumbers: 'pp. 45-48',
          milestone: 'CAPSTONE_2',
          status: 'addressed',
        },
        {
          panelName: 'Dr. Panelist C',
          suggestion: 'Analyze power consumption',
          actionDone: 'Added battery drain graphs',
          pageNumbers: 'pp. 80-82',
          milestone: 'CAPSTONE_3',
          status: 'pending',
        },
      ],
    });

    expect(typeof project.getUnisonADM).toBe('function');
    const unison = project.getUnisonADM();

    expect(unison).toBeDefined();
    expect(unison.v1).toBeDefined();
    expect(unison.v2).toBeDefined();
    expect(unison.v3).toBeDefined();

    // Verify v1 partition (Capstone 1)
    expect(unison.v1.milestone).toBe('CAPSTONE_1');
    expect(unison.v1.rows).toHaveLength(1);
    expect(unison.v1.rows[0].suggestion).toBe('Fix Introduction scope');
    expect(unison.v1.signatures.secretary.endorsed).toBe(true);
    expect(unison.v1.signatures.adviser.signatoryName).toBe('Dr. Adv v1');
    expect(unison.v1.signatures.chair.signatoryName).toBe('Dr. Chair v1');

    // Verify v2 partition (Capstone 2)
    expect(unison.v2.milestone).toBe('CAPSTONE_2');
    expect(unison.v2.rows).toHaveLength(1);
    expect(unison.v2.rows[0].suggestion).toBe('Provide sensor schematics');
    expect(unison.v2.signatures.secretary.signatoryName).toBe('Prof. Sec v2');
    expect(unison.v2.signatures.panelists).toHaveLength(1);
    expect(unison.v2.signatures.panelists[0].signatoryName).toBe('Panelist One');

    // Verify v3 partition (Capstone 3)
    expect(unison.v3.milestone).toBe('CAPSTONE_3');
    expect(unison.v3.rows).toHaveLength(1);
    expect(unison.v3.rows[0].suggestion).toBe('Analyze power consumption');
    expect(unison.v3.signatures.secretary.endorsed).toBe(false);

    // Verify activeMilestone pointer
    expect(unison.activeMilestone).toBe('CAPSTONE_2');
  });

  it('invalidates project:meta cache in Redis on ADM changes', async () => {
    const testProjectId = '654321098765432109876543';
    await invalidateProjectCache(testProjectId);

    expect(cacheService.del).toHaveBeenCalledWith(`project:meta:${testProjectId}`);
  });
});
