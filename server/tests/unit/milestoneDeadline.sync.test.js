import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  upsertMilestoneDeadline,
  deleteMilestoneDeadline,
} from '../../modules/settings/milestoneDeadline.controller.js';
import MilestoneDeadline from '../../modules/settings/milestoneDeadline.model.js';
import Project from '../../modules/projects/project.model.js';
import * as socketService from '../../services/socket.service.js';

vi.mock('../../modules/settings/milestoneDeadline.model.js');
vi.mock('../../modules/projects/project.model.js');
vi.mock('../../services/socket.service.js', () => ({
  emitToAll: vi.fn(),
}));
vi.mock('../../modules/settings/deadlineNotification.service.js', () => ({
  default: {
    notifyDeadlineScheduled: vi.fn().mockResolvedValue(true),
    checkAndDispatchDueDeadlines: vi.fn().mockResolvedValue(true),
  },
}));

describe('MilestoneDeadline Synchronization (moved & removed tracking)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upsertMilestoneDeadline tracks moved when date is updated and pulls from removed', async () => {
    const oldDate = new Date('2026-10-15T00:00:00.000Z');
    const newDate = new Date('2026-10-25T00:00:00.000Z');

    MilestoneDeadline.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ deadlineDate: oldDate }),
      }),
    });

    const mockDeadlineDoc = {
      _id: 'm-1',
      batchYear: '2026-2027',
      stage: 'midterm',
      deliverable: 'oral_defense',
      title: 'Oral Defense',
      deadlineDate: newDate,
      populate: vi.fn().mockResolvedValue({
        _id: 'm-1',
        deliverable: 'oral_defense',
        deadlineDate: newDate,
      }),
    };
    MilestoneDeadline.findOneAndUpdate.mockReturnValue(mockDeadlineDoc);
    Project.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 5 });

    const req = {
      body: {
        batchYear: '2026-2027',
        stage: 'midterm',
        deliverable: 'oral_defense',
        title: 'Oral Defense',
        deadlineDate: newDate.toISOString(),
      },
      user: { _id: 'u-1' },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await upsertMilestoneDeadline(req, res, () => {});

    expect(Project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([{ academicYear: '2026-2027' }]),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          'deadlines.defense': newDate,
          'deadlines.moved.defense': expect.objectContaining({
            oldDate,
            newDate,
          }),
        }),
        $pull: { 'deadlines.removed': 'defense' },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deleteMilestoneDeadline sets deadline to null and adds key to removed', async () => {
    MilestoneDeadline.findByIdAndDelete.mockResolvedValue({
      _id: 'm-1',
      batchYear: '2026-2027',
      deliverable: 'chapter_1',
    });
    Project.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 5 });

    const req = {
      params: { id: 'm-1' },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await deleteMilestoneDeadline(req, res, () => {});

    expect(Project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([{ academicYear: '2026-2027' }]),
      }),
      expect.objectContaining({
        $unset: {
          'deadlines.chapter1': '',
          'deadlines.moved.chapter1': '',
        },
        $addToSet: { 'deadlines.removed': 'chapter1' },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
