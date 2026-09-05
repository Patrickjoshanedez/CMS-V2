import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamFormationNotificationItem } from './TeamFormationNotificationItem';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseTeamById = vi.fn();

vi.mock('@/hooks/useTeams', () => ({
  useTeamById: (...args) => mockUseTeamById(...args),
}));

// Mock AssignCommitteeDialog to isolate notification card tests
vi.mock('./AssignCommitteeDialog', () => ({
  AssignCommitteeDialog: ({ open }) =>
    open ? <div data-testid="assign-committee-dialog" /> : null,
  default: ({ open }) => (open ? <div data-testid="assign-committee-dialog" /> : null),
}));

describe('TeamFormationNotificationItem', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamById.mockReturnValue({ data: null, isLoading: false });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = (props = {}) => {
    act(() => {
      root.render(<TeamFormationNotificationItem {...props} />);
    });
  };

  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };

  it('renders default metadata pills and content correctly', () => {
    renderComponent();

    expect(container.textContent).toContain('Team Formation Completed');
    expect(container.textContent).toContain('Action Required');
    expect(container.textContent).toContain('Team "Team Patrick"');
    expect(container.textContent).toContain('BSIT 3C');
    expect(container.textContent).toContain('(T87)');
    expect(container.textContent).toContain('Code:');
    expect(container.textContent).toContain('#10A80B');
    expect(container.textContent).toContain('Leader: Patrick Josh S. Añedez');
    expect(container.textContent).toContain('1 of 4 members');

    cleanup();
  });

  it('renders discrete badge pills separating academic location from team identifiers', () => {
    renderComponent({
      section: 'BSCS 4A',
      sectionCode: 'C99',
      groupCode: '#20B91C',
      teamName: 'Alpha Squad',
      leaderName: 'Maria Clara',
      memberCount: 3,
      maxMembers: 4,
    });

    // Academic section pill
    expect(container.textContent).toContain('BSCS 4A');
    expect(container.textContent).toContain('(C99)');

    // Team code pill
    expect(container.textContent).toContain('#20B91C');

    // Leader info
    expect(container.textContent).toContain('Leader: Maria Clara');

    // Member count
    expect(container.textContent).toContain('3 of 4 members');

    cleanup();
  });

  it('renders enriched metadata correctly when passed a notification object', () => {
    const notification = {
      _id: 'notif_67bc901aef',
      title: 'Team Formation Completed',
      message:
        'Team "Team Patrick" has locked their roster (2 members) and is awaiting faculty committee appointments.',
      isRead: false,
      createdAt: '2026-09-03T14:54:00.000Z',
      metadata: {
        teamId: 'team_patrick_2026',
        teamName: 'Team Patrick',
        groupCode: '#10A80B',
        academicYear: '2025-2026',
        section: 'BSIT 3C',
        sectionCode: 'T87',
        leaderName: 'Patrick Josh S. Añedez',
        memberCount: 2,
        maxMembers: 4,
      },
    };

    renderComponent({ notification });

    expect(container.textContent).toContain('BSIT 3C');
    expect(container.textContent).toContain('(T87)');
    expect(container.textContent).toContain('#10A80B');
    expect(container.textContent).toContain('Leader: Patrick Josh S. Añedez');
    expect(container.textContent).toContain('2 of 4 members');

    cleanup();
  });

  it('triggers action callbacks when interaction buttons are clicked', () => {
    const onInspectRoster = vi.fn();
    const onAssignCommittee = vi.fn();
    const onMarkRead = vi.fn();
    const onDelete = vi.fn();

    const notification = {
      _id: 'notif-123',
      isRead: false,
      metadata: {
        teamId: 'team-xyz',
        teamName: 'Innovators',
      },
    };

    renderComponent({
      notification,
      onInspectRoster,
      onAssignCommittee,
      onMarkRead,
      onDelete,
    });

    // Inspect Roster
    const inspectBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Inspect Roster'),
    );
    expect(inspectBtn).toBeTruthy();
    act(() => {
      inspectBtn.click();
    });
    expect(onInspectRoster).toHaveBeenCalledWith('team-xyz');

    // Assign Committee
    const assignBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Assign Committee'),
    );
    expect(assignBtn).toBeTruthy();
    act(() => {
      assignBtn.click();
    });
    expect(onAssignCommittee).toHaveBeenCalledWith({
      teamId: 'team-xyz',
      teamName: 'Innovators',
    });

    // Mark as read
    const markReadBtn = container.querySelector('button[title="Mark as read"]');
    expect(markReadBtn).toBeTruthy();
    act(() => {
      markReadBtn.click();
    });
    expect(onMarkRead).toHaveBeenCalledWith('notif-123');

    // Delete
    const deleteBtn = container.querySelector('button[title="Delete notification"]');
    expect(deleteBtn).toBeTruthy();
    act(() => {
      deleteBtn.click();
    });
    expect(onDelete).toHaveBeenCalledWith('notif-123');

    cleanup();
  });

  it('handles missing section or section code gracefully without rendering empty parens', () => {
    renderComponent({
      section: 'BSIT 3C',
      sectionCode: '',
    });

    expect(container.textContent).toContain('BSIT 3C');
    expect(container.textContent).not.toContain('()');

    cleanup();
  });

  it('swaps Action Required for Committee Assigned badge and renders Edit Committee when fully assigned', () => {
    const onAssignCommittee = vi.fn();
    const notification = {
      _id: 'notif-completed',
      isRead: true,
      metadata: {
        teamId: 'team-fully-assigned',
        teamName: 'Innovators',
        status: 'completed',
        isFullyAssigned: true,
      },
    };

    renderComponent({
      notification,
      onAssignCommittee,
    });

    expect(container.textContent).toContain('Committee Assigned');
    expect(container.textContent).not.toContain('Action Required');
    expect(container.textContent).toContain(
      'roster is locked and faculty committee appointments are complete',
    );
    expect(container.textContent).toContain('Assigned');

    const editBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Edit Committee'),
    );
    expect(editBtn).toBeTruthy();

    act(() => {
      editBtn.click();
    });

    expect(onAssignCommittee).toHaveBeenCalledWith({
      teamId: 'team-fully-assigned',
      teamName: 'Innovators',
    });

    cleanup();
  });

  it('swaps UI to Assigned when liveTeam has full committee even if notification was pending', () => {
    mockUseTeamById.mockReturnValue({
      data: {
        _id: 'team-live',
        adviserId: 'adv-1',
        secretaryId: 'sec-1',
        panelistIds: ['p-1', 'p-2', 'p-3'],
      },
      isLoading: false,
    });

    const notification = {
      _id: 'notif-pending',
      isRead: false,
      metadata: {
        teamId: 'team-live',
        teamName: 'Dynamic Duo',
      },
    };

    renderComponent({
      notification,
    });

    expect(container.textContent).toContain('Committee Assigned');
    expect(container.textContent).toContain('Edit Committee');

    cleanup();
  });
});
