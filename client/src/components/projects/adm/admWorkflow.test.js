import { describe, it, expect } from 'vitest';
import {
  getActiveAdmMilestone,
  isAppointedSecretary,
  resolveAdmStatus,
  resolveMinutesPermissions,
} from './admWorkflow';

const baseProject = {
  capstonePhase: 2,
  secretaryId: 'sec-1',
  actionDoneMatrix: [
    { _id: 'a', milestone: 'CAPSTONE_2', status: 'addressed' },
    { _id: 'b', milestone: 'CAPSTONE_2', status: 'pending' },
    { _id: 'c', milestone: 'CAPSTONE_1', status: 'verified' },
  ],
  admSignaturesByMilestone: {
    CAPSTONE_1: {
      secretary: { endorsed: true },
      adviser: { signed: true },
      chair: { signed: true },
    },
    CAPSTONE_2: {},
  },
};

describe('admWorkflow', () => {
  it('derives the active milestone from the capstone phase', () => {
    expect(getActiveAdmMilestone({ capstonePhase: 1 })).toBe('CAPSTONE_1');
    expect(getActiveAdmMilestone({ capstonePhase: 2 })).toBe('CAPSTONE_2');
    expect(getActiveAdmMilestone({ capstonePhase: 4 })).toBe('CAPSTONE_3');
  });

  it('resolves status per milestone without leaking the active milestone state', () => {
    const cap2 = resolveAdmStatus(baseProject, 'CAPSTONE_2');
    expect(cap2).toMatchObject({ key: 'awaiting_student', total: 2, addressed: 1 });
    const cap1 = resolveAdmStatus(baseProject, 'CAPSTONE_1');
    expect(cap1.key).toBe('approved');
  });

  it('reports awaiting endorsement only from the server status, never a phantom "submitted"', () => {
    const status = resolveAdmStatus(
      { ...baseProject, admStatus: 'pending_secretary_endorsement' },
      'CAPSTONE_2',
    );
    expect(status.key).toBe('awaiting_endorsement');
  });

  it('only recognises the appointed secretary', () => {
    expect(isAppointedSecretary(baseProject, { _id: 'sec-1' })).toBe(true);
    expect(isAppointedSecretary(baseProject, { _id: 'other' })).toBe(false);
    expect(
      isAppointedSecretary(
        { panelists: [{ userId: 'p-9', role: 'secretary' }] },
        { _id: 'p-9', role: 'faculty' },
      ),
    ).toBe(true);
    expect(isAppointedSecretary({}, { _id: 'x' })).toBe(false);
  });

  it('limits minutes permissions: students read-only, instructor edits but cannot sign', () => {
    expect(resolveMinutesPermissions(baseProject, { _id: 'sec-1', role: 'faculty' })).toMatchObject(
      {
        canEdit: true,
        canSign: true,
      },
    );
    expect(
      resolveMinutesPermissions(baseProject, { _id: 'i-1', role: 'instructor' }),
    ).toMatchObject({
      canEdit: true,
      canSign: false,
    });
    expect(resolveMinutesPermissions(baseProject, { _id: 'f-1', role: 'faculty' })).toMatchObject({
      canEdit: false,
      canSign: false,
    });
    expect(resolveMinutesPermissions(baseProject, { _id: 'sec-1', role: 'student' }).canEdit).toBe(
      false,
    );
  });
});
