import { describe, expect, it } from 'vitest';
import { mergeMilestoneAdmRows } from '../../modules/submissions/secretary.controller.js';

describe('mergeMilestoneAdmRows', () => {
  const existing = [
    { _id: 'r1', panelName: 'Dr. Chair', milestone: 'CAPSTONE_1', suggestion: 'old cap1' },
    {
      _id: 'r2',
      panelName: 'Dr. Chair',
      milestone: 'CAPSTONE_2',
      suggestion: 'old cap2',
      actionDone: 'Student fixed it',
      pageNumbers: '12',
      status: 'addressed',
    },
  ];

  it('replaces only the target milestone and keeps other milestones intact', () => {
    const result = mergeMilestoneAdmRows(
      existing,
      [{ panelName: 'Dr. Chair', suggestion: 'new cap2', status: 'pending', actionDone: '' }],
      'CAPSTONE_2',
    );
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.milestone === 'CAPSTONE_1').suggestion).toBe('old cap1');
    const cap2 = result.find((r) => r.milestone === 'CAPSTONE_2');
    expect(cap2.suggestion).toBe('new cap2');
  });

  it('preserves student progress for the same panelist when minutes are re-synced', () => {
    const [, cap2] = mergeMilestoneAdmRows(
      existing,
      [{ panelName: 'dr. chair', suggestion: 'new', status: 'pending', actionDone: '' }],
      'CAPSTONE_2',
    );
    expect(cap2).toMatchObject({
      _id: 'r2',
      actionDone: 'Student fixed it',
      pageNumbers: '12',
      status: 'addressed',
    });
  });

  it('tags brand new rows with the milestone', () => {
    const result = mergeMilestoneAdmRows(
      [],
      [{ panelName: 'New Panel', suggestion: 's' }],
      'CAPSTONE_3',
    );
    expect(result).toEqual([{ panelName: 'New Panel', suggestion: 's', milestone: 'CAPSTONE_3' }]);
  });
});
