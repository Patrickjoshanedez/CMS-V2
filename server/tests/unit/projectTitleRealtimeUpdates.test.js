import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';
import Project from '../../modules/projects/project.model.js';
import projectTitleService from '../../modules/projects/services/projectTitle.service.js';
import projectCoreService from '../../modules/projects/services/projectCore.service.js';
import * as socketService from '../../services/socket.service.js';
import cacheService from '../../services/cache.service.js';

describe('ProjectTitleService — Real-time Cache Eviction & Socket Broadcast', () => {
  const projectId = '65e000000000000000000001';
  const teamId = '65e000000000000000000010';
  const userId = '65e000000000000000000020';

  let mockProject;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockProject = {
      _id: projectId,
      teamId,
      title: 'Old Capstone Title',
      titleStatus: TITLE_STATUSES.DRAFT,
      projectStatus: PROJECT_STATUSES.PENDING_FOR_SUBMISSION,
      workflowPhase: 1,
      titleProposals: ['Old Capstone Title'],
      titleProposalMetadata: [
        {
          _id: '65e000000000000000000099',
          title: 'Old Capstone Title',
          description: 'Description',
        },
      ],
      keywords: ['iot'],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(projectTitleService, '_getProjectOrFail').mockResolvedValue(mockProject);
    vi.spyOn(projectTitleService, '_assertTeamLeader').mockResolvedValue(true);
    vi.spyOn(projectCoreService, '_assertProjectWritable').mockReturnValue(true);
    vi.spyOn(Project, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });

    vi.spyOn(cacheService, 'del').mockResolvedValue(true);
    vi.spyOn(socketService, 'emitToRoom').mockReturnValue(true);
    vi.spyOn(socketService, 'emitToAll').mockReturnValue(true);
  });

  it('updateTitle evicts Redis cache and broadcasts project:updated to room and all clients', async () => {
    const updatePayload = {
      title: 'Brand New AI System',
      titleProposals: [
        {
          title: 'Brand New AI System',
          description: 'An AI-powered capstone',
          pitchDeck: { objectives: 'Build AI' },
          capstoneType: ['Web Application'],
          sdgTags: ['SDG 9'],
        },
      ],
    };

    const result = await projectTitleService.updateTitle(projectId, userId, updatePayload);

    expect(mockProject.title).toBe('Brand New AI System');
    expect(mockProject.save).toHaveBeenCalledOnce();

    // Verify Redis cache eviction
    expect(cacheService.del).toHaveBeenCalledWith(`project:meta:${projectId}`);
    expect(cacheService.del).toHaveBeenCalledWith(`project:detail:${projectId}`);

    // Verify Socket.IO broadcast to room and all clients
    expect(socketService.emitToRoom).toHaveBeenCalledWith(
      `project:${projectId}`,
      'project:updated',
      expect.objectContaining({
        projectId,
        title: 'Brand New AI System',
        action: 'title_updated',
      }),
    );
    expect(socketService.emitToAll).toHaveBeenCalledWith(
      'project:updated',
      expect.objectContaining({
        projectId,
        title: 'Brand New AI System',
        action: 'title_updated',
      }),
    );

    expect(result.project.title).toBe('Brand New AI System');
  });

  it('submitTitle evicts cache and emits project:updated with action title_submitted', async () => {
    vi.spyOn(projectTitleService, 'checkTitleSimilarity').mockResolvedValue({
      similarProjects: [],
      threshold: 0.7,
    });
    vi.spyOn(projectTitleService, '_notifyInstructors').mockResolvedValue(true);

    await projectTitleService.submitTitle(projectId, userId);

    expect(mockProject.titleStatus).toBe(TITLE_STATUSES.SUBMITTED);
    expect(mockProject.save).toHaveBeenCalledOnce();

    expect(cacheService.del).toHaveBeenCalledWith(`project:meta:${projectId}`);
    expect(cacheService.del).toHaveBeenCalledWith(`project:detail:${projectId}`);

    expect(socketService.emitToRoom).toHaveBeenCalledWith(
      `project:${projectId}`,
      'project:updated',
      expect.objectContaining({
        projectId,
        action: 'title_submitted',
      }),
    );
    expect(socketService.emitToAll).toHaveBeenCalledWith(
      'project:updated',
      expect.objectContaining({
        projectId,
        action: 'title_submitted',
      }),
    );
  });
});
