import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScheduleDefenseModal from './ScheduleDefenseModal';
import { projectService } from '@/services/authService';
import { toast } from 'sonner';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/services/authService', () => ({
  projectService: {
    scheduleDefense: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useProjects', () => ({
  projectKeys: {
    all: ['projects'],
  },
}));

describe('ScheduleDefenseModal', () => {
  let container;
  let root;
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    // Clean up any elements rendered into document.body by portals
    document.body.querySelectorAll('.fixed').forEach((el) => el.remove());
  });

  const renderModal = (props) => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ScheduleDefenseModal {...props} />
        </QueryClientProvider>,
      );
    });
  };

  it('associates form labels with controls and names the close button', () => {
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project: { _id: 'proj-123', title: 'CMS Project', defenseSchedule: null },
    });

    const labeledControls = [
      ['defense-type', 'Defense Type'],
      ['defense-round', 'Defense Round'],
      ['defense-date', 'Defense Date'],
      ['defense-time', 'Time Slot'],
      ['defense-venue', 'Venue & Location'],
      ['defense-client', 'Target Client / Industry Partner'],
    ];

    for (const [id, label] of labeledControls) {
      expect(document.getElementById(id)).toBeInTheDocument();
      expect(document.querySelector(`label[for="${id}"]`)).toHaveTextContent(label);
    }
    expect(document.getElementById('defense-date')).toHaveAttribute('type', 'date');
    expect(document.querySelector('[aria-label="Close schedule dialog"]')).toBeInTheDocument();
  });

  it('does not render "Remove Schedule" button when there is no existing schedule', () => {
    const project = {
      _id: 'proj-123',
      title: 'CMS Project',
      defenseSchedule: null,
    };

    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
    });

    const removeBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Remove Schedule'),
    );
    expect(removeBtn).toBeUndefined();
  });

  it('renders "Remove Schedule" button when project.defenseSchedule.date is present', () => {
    const project = {
      _id: 'proj-123',
      title: 'CMS Project',
      defenseSchedule: {
        date: '2026-10-15T09:00:00.000Z',
        time: '09:00 AM - 09:30 AM',
        status: 'scheduled',
      },
    };

    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
    });

    const removeBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Remove Schedule'),
    );
    expect(removeBtn).toBeDefined();
    expect(removeBtn?.textContent).toContain('Remove Schedule');
  });

  it('renders "Remove Schedule" button when project.defenseSchedule.status is "scheduled"', () => {
    const project = {
      _id: 'proj-123',
      title: 'CMS Project',
      defenseSchedule: {
        status: 'scheduled',
      },
    };

    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
    });

    const removeBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Remove Schedule'),
    );
    expect(removeBtn).toBeDefined();
  });

  it('calls projectService.scheduleDefense with unscheduled payload when clicking "Remove Schedule"', async () => {
    projectService.scheduleDefense.mockResolvedValueOnce({ success: true });
    const onClose = vi.fn();
    const onScheduled = vi.fn();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const project = {
      _id: 'proj-123',
      title: 'CMS Project',
      teamId: { name: 'Team Alpha' },
      defenseSchedule: {
        date: '2026-10-15T09:00:00.000Z',
        time: '09:00 AM - 09:30 AM',
        status: 'scheduled',
      },
    };

    renderModal({
      isOpen: true,
      onClose,
      onScheduled,
      project,
    });

    const removeBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Remove Schedule'),
    );
    expect(removeBtn).toBeDefined();

    await act(async () => {
      removeBtn.click();
    });

    expect(projectService.scheduleDefense).toHaveBeenCalledWith('proj-123', {
      status: 'unscheduled',
      date: null,
      time: '',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
    expect(onScheduled).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles error when projectService.scheduleDefense rejects during scheduling', async () => {
    const errorMsg = 'Schedule conflict detected';
    projectService.scheduleDefense.mockRejectedValueOnce({
      response: { data: { message: errorMsg } },
    });
    const onClose = vi.fn();
    const onScheduled = vi.fn();

    const project = {
      _id: 'proj-123',
      title: 'CMS Project',
      teamId: { name: 'Team Alpha' },
    };

    renderModal({
      isOpen: true,
      onClose,
      onScheduled,
      project,
      initialDate: '2026-10-20',
      initialTime: '09:00 AM - 09:30 AM',
    });

    const submitBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Confirm & Notify Hearing Committee'),
    );
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn.click();
    });

    expect(projectService.scheduleDefense).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(errorMsg);
    expect(onScheduled).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(submitBtn.disabled).toBe(false);
  });

  it('handles error when projectService.scheduleDefense rejects during unscheduling', async () => {
    const errorMsg = 'Failed to remove defense schedule';
    projectService.scheduleDefense.mockRejectedValueOnce({
      response: { data: { message: errorMsg } },
    });
    const onClose = vi.fn();
    const onScheduled = vi.fn();

    const project = {
      _id: 'proj-123',
      title: 'CMS Project',
      teamId: { name: 'Team Alpha' },
      defenseSchedule: {
        date: '2026-10-15T09:00:00.000Z',
        time: '09:00 AM - 09:30 AM',
        status: 'scheduled',
      },
    };

    renderModal({
      isOpen: true,
      onClose,
      onScheduled,
      project,
    });

    const removeBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Remove Schedule'),
    );
    expect(removeBtn).toBeDefined();

    await act(async () => {
      removeBtn.click();
    });

    expect(projectService.scheduleDefense).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(errorMsg);
    expect(onScheduled).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(removeBtn.disabled).toBe(false);
  });

  it('renders project workspace redirection button and link with correct href and target', () => {
    const project = {
      _id: 'proj-456',
      title: 'CMS Portal Capstone',
      teamId: { name: 'Team Gamma' },
    };

    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
    });

    const links = Array.from(document.body.querySelectorAll('a'));

    // Header redirection button link
    const workspaceBtnLink = links.find((a) => a.textContent.includes('View Project Workspace'));
    expect(workspaceBtnLink).toBeDefined();
    expect(workspaceBtnLink?.getAttribute('href')).toBe('/projects/proj-456');
    expect(workspaceBtnLink?.getAttribute('target')).toBe('_blank');
    expect(workspaceBtnLink?.getAttribute('rel')).toBe('noopener noreferrer');

    // Subheader team link
    const teamWorkspaceLink = links.find((a) =>
      a.textContent.includes('View Linked Project Workspace'),
    );
    expect(teamWorkspaceLink).toBeDefined();
    expect(teamWorkspaceLink?.getAttribute('href')).toBe('/projects/proj-456');
    expect(teamWorkspaceLink?.getAttribute('target')).toBe('_blank');
    expect(teamWorkspaceLink?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('falls back to project.id when _id is not present for workspace links', () => {
    const project = {
      id: 'proj-789',
      title: 'CMS Alternative ID',
    };

    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
    });

    const links = Array.from(document.body.querySelectorAll('a'));
    const workspaceBtnLink = links.find((a) => a.textContent.includes('View Project Workspace'));
    expect(workspaceBtnLink?.getAttribute('href')).toBe('/projects/proj-789');

    const teamWorkspaceLink = links.find((a) =>
      a.textContent.includes('View Linked Project Workspace'),
    );
    expect(teamWorkspaceLink?.getAttribute('href')).toBe('/projects/proj-789');
  });

  it('labels and schedules a pre-course title proposal hearing separately from a defense', async () => {
    projectService.scheduleDefense.mockResolvedValueOnce({ success: true });
    const project = {
      _id: 'proj-title-review',
      title: 'Synthetic title review project',
      titleStatus: 'submitted',
      workflowPhase: 1,
      capstonePhase: 1,
      stage: 'proposal',
      adviserId: { firstName: 'Maria', lastName: 'Santos' },
      secretaryId: { firstName: 'Arnel', lastName: 'Dela Cruz' },
      panelistIds: [
        { firstName: 'Grace', lastName: 'Villanueva' },
        { firstName: 'Jonathan', lastName: 'Bautista' },
        { firstName: 'Catherine', lastName: 'Mendoza' },
      ],
    };
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
      initialDate: '2026-10-26',
      initialTime: '10:00 AM - 10:30 AM',
    });

    const titleDialog = document.querySelector('[role="dialog"]');
    const titleId = titleDialog?.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId)).toHaveTextContent('Schedule Title Hearing');
    expect(document.getElementById('defense-type')).not.toBeInTheDocument();
    expect(document.querySelector('label[for="defense-date"]')).toHaveTextContent('Hearing Date');

    const submitButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Confirm & Notify Title Review Committee'),
    );
    expect(submitButton).toBeDefined();

    await act(async () => {
      submitButton.click();
    });

    expect(projectService.scheduleDefense).toHaveBeenCalledWith(
      'proj-title-review',
      expect.objectContaining({
        date: '2026-10-26',
        time: '10:00 AM - 10:30 AM',
        defenseType: 'proposal',
        status: 'scheduled',
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Title hearing scheduled for Synthetic title review project on 2026-10-26 at 10:00 AM - 10:30 AM.',
    );
  });

  it('allows scheduling title proposal hearing with vacant adviser when secretary and 3 panelists are appointed', async () => {
    projectService.scheduleDefense.mockResolvedValueOnce({ success: true });
    const project = {
      _id: 'proj-title-review-no-adviser',
      title: 'Vacant Adviser Proposal Review Project',
      titleStatus: 'submitted',
      workflowPhase: 1,
      capstonePhase: 1,
      stage: 'proposal',
      adviserId: null, // Vacant adviser!
      secretaryId: { firstName: 'Arnel', lastName: 'Dela Cruz' },
      panelistIds: [
        { firstName: 'Grace', lastName: 'Villanueva' },
        { firstName: 'Jonathan', lastName: 'Bautista' },
        { firstName: 'Catherine', lastName: 'Mendoza' },
      ],
    };
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
      initialDate: '2026-10-26',
      initialTime: '10:00 AM - 10:30 AM',
    });

    expect(document.body.textContent).toContain('Committee Complete');
    expect(document.body.textContent).toContain('To be chosen after approval based on field');
    expect(document.body.textContent).not.toContain('Institutional Notice: Committee Incomplete');

    const submitButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Confirm & Notify Title Review Committee'),
    );
    expect(submitButton).toBeDefined();

    await act(async () => {
      submitButton.click();
    });

    expect(projectService.scheduleDefense).toHaveBeenCalledWith(
      'proj-title-review-no-adviser',
      expect.objectContaining({
        date: '2026-10-26',
        time: '10:00 AM - 10:30 AM',
        defenseType: 'proposal',
        status: 'scheduled',
      }),
    );
  });

  it('warns when secretary is missing for title proposal hearing even if adviser is vacant', () => {
    const project = {
      _id: 'proj-title-review-no-sec',
      title: 'Missing Secretary Proposal Review Project',
      titleStatus: 'submitted',
      workflowPhase: 1,
      capstonePhase: 1,
      stage: 'proposal',
      adviserId: null,
      secretaryId: null, // Missing secretary!
      panelistIds: [
        { firstName: 'Grace', lastName: 'Villanueva' },
        { firstName: 'Jonathan', lastName: 'Bautista' },
        { firstName: 'Catherine', lastName: 'Mendoza' },
      ],
    };
    renderModal({
      isOpen: true,
      onClose: vi.fn(),
      project,
      initialDate: '2026-10-26',
      initialTime: '10:00 AM - 10:30 AM',
    });

    expect(document.body.textContent).toContain('Institutional Notice: Committee Incomplete');
    expect(document.body.textContent).toContain('Committee Secretary is unassigned');
    expect(document.body.textContent).toContain('Missing Secretary');
  });
});
