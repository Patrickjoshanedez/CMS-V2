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
});
