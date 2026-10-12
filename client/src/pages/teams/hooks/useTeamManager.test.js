import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTeamManager } from './useTeamManager.js';

describe('useTeamManager Hook', () => {
  it('should initialize modal states to closed and search query to empty', () => {
    const { result } = renderHook(() => useTeamManager({ user: { _id: 'u1' } }));
    expect(result.current.isInviteModalOpen).toBe(false);
    expect(result.current.isTransferLeaderModalOpen).toBe(false);
    expect(result.current.isBulkInviteOpen).toBe(false);
    expect(result.current.isInspectRosterOpen).toBe(false);
    expect(result.current.isTemplateConfigOpen).toBe(false);
    expect(result.current.isAssignCommitteeOpen).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toBe('all');
  });

  it('should toggle invite modal state correctly', () => {
    const { result } = renderHook(() => useTeamManager({ user: { _id: 'u1' } }));
    act(() => {
      result.current.setIsInviteModalOpen(true);
    });
    expect(result.current.isInviteModalOpen).toBe(true);

    act(() => {
      result.current.closeInviteModal();
    });
    expect(result.current.isInviteModalOpen).toBe(false);
  });

  it('should update search query correctly', () => {
    const { result } = renderHook(() => useTeamManager({ user: { _id: 'u1' } }));
    act(() => {
      result.current.setSearchQuery('Capstone Team');
    });
    expect(result.current.searchQuery).toBe('Capstone Team');
    expect(result.current.search).toBe('Capstone Team');
  });

  it('should toggle transfer leader and bulk invite modals', () => {
    const { result } = renderHook(() => useTeamManager({ user: { _id: 'u1' } }));
    act(() => {
      result.current.openTransferLeaderModal();
      result.current.openBulkInvite();
    });
    expect(result.current.isTransferLeaderModalOpen).toBe(true);
    expect(result.current.isBulkInviteOpen).toBe(true);

    act(() => {
      result.current.closeTransferLeaderModal();
      result.current.closeBulkInvite();
    });
    expect(result.current.isTransferLeaderModalOpen).toBe(false);
    expect(result.current.isBulkInviteOpen).toBe(false);
  });

  it('should handle inspect roster and assign committee with target teams', () => {
    const { result } = renderHook(() => useTeamManager({ user: { _id: 'u1' } }));
    const mockTeam = { _id: 't-123', name: 'Alpha Team' };

    act(() => {
      result.current.openInspectRoster(mockTeam);
    });
    expect(result.current.isInspectRosterOpen).toBe(true);
    expect(result.current.inspectingTeam).toEqual(mockTeam);
    expect(result.current.selectedTeamId).toBe('t-123');

    act(() => {
      result.current.closeInspectRoster();
    });
    expect(result.current.isInspectRosterOpen).toBe(false);
    expect(result.current.inspectingTeam).toBeNull();

    act(() => {
      result.current.openAssignCommittee(mockTeam);
    });
    expect(result.current.isAssignCommitteeOpen).toBe(true);
    expect(result.current.committeeModalTeam).toEqual(mockTeam);

    act(() => {
      result.current.closeAssignCommittee();
    });
    expect(result.current.isAssignCommitteeOpen).toBe(false);
    expect(result.current.committeeModalTeam).toBeNull();
  });

  it('should reset filters properly', () => {
    const { result } = renderHook(() => useTeamManager({ user: { _id: 'u1' } }));
    act(() => {
      result.current.setSearchQuery('Test');
      result.current.setAcademicYear('2025-2026');
      result.current.setSectionId('sec-1');
      result.current.setStatusFilter('forming');
    });

    expect(result.current.searchQuery).toBe('Test');
    expect(result.current.statusFilter).toBe('forming');

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.academicYear).toBe('');
    expect(result.current.sectionId).toBe('');
  });
});
