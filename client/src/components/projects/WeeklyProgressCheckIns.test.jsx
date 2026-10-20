import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WeeklyProgressCheckIns from './WeeklyProgressCheckIns';

const mocks = vi.hoisted(() => ({
  user: { _id: 'student-1', role: 'student' },
  service: {
    updateWeeklyCheckIn: vi.fn(),
    reviewWeeklyCheckIn: vi.fn(),
    reviewWeeklyCheckInWaiver: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mocks.user }),
}));

vi.mock('@/services/authService', () => ({ projectService: mocks.service }));

const makeProject = (status = 'scheduled') => ({
  _id: 'project-1',
  capstonePhase: 2,
  adviserId: 'adviser-1',
  ganttApproval: { approved: true, scheduleHash: 'hash-1' },
  ganttPlan: {
    tasks: [{ id: 'task-1', title: 'Build prototype' }],
  },
  teamId: { leaderId: { instructorId: 'instructor-1' } },
  weeklyCheckIns: [
    {
      _id: 'check-in-1',
      scheduleHash: 'hash-1',
      weekStart: '2026-10-19T00:00:00.000Z',
      dueAt: '2026-10-26T00:00:00.000Z',
      taskIds: ['task-1'],
      status,
      progressPct: 20,
      adviserReview: { remarks: '' },
      instructorWaiver: { remarks: '' },
    },
  ],
});

const renderWithQueryClient = (project, isReadOnly = false) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WeeklyProgressCheckIns project={project} isReadOnly={isReadOnly} />
    </QueryClientProvider>,
  );
};

describe('WeeklyProgressCheckIns', () => {
  beforeEach(() => {
    mocks.user = { _id: 'student-1', role: 'student' };
    Object.values(mocks.service).forEach((method) => method.mockReset().mockResolvedValue({}));
  });

  afterEach(() => cleanup());

  it('lets a student submit progress and completed tasks for the scheduled week', async () => {
    renderWithQueryClient(makeProject());

    fireEvent.change(screen.getByLabelText('Progress summary'), {
      target: { value: 'Completed the first prototype milestone.' },
    });
    fireEvent.click(screen.getByLabelText('Build prototype'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit for adviser review' }));

    await waitFor(() =>
      expect(mocks.service.updateWeeklyCheckIn).toHaveBeenCalledWith(
        'project-1',
        'check-in-1',
        expect.objectContaining({
          summary: 'Completed the first prototype milestone.',
          completedTaskIds: ['task-1'],
          submit: true,
        }),
      ),
    );
  });

  it('lets only the assigned adviser act on a submitted weekly check-in', async () => {
    mocks.user = { _id: 'adviser-1', role: 'faculty' };
    renderWithQueryClient(makeProject('submitted'));

    fireEvent.change(screen.getByLabelText('Review remarks'), {
      target: { value: 'Please clarify the testing evidence.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Request revisions' }));

    await waitFor(() =>
      expect(mocks.service.reviewWeeklyCheckIn).toHaveBeenCalledWith(
        'project-1',
        'check-in-1',
        { decision: 'revision_requested', remarks: 'Please clarify the testing evidence.' },
      ),
    );
  });

  it('shows instructor waiver controls only for the assigned instructor', async () => {
    mocks.user = { _id: 'instructor-1', role: 'instructor' };
    renderWithQueryClient(makeProject('awaiting_instructor_waiver'));

    fireEvent.click(screen.getByRole('button', { name: 'Grant waiver' }));

    await waitFor(() =>
      expect(mocks.service.reviewWeeklyCheckInWaiver).toHaveBeenCalledWith(
        'project-1',
        'check-in-1',
        { decision: 'granted', remarks: '' },
      ),
    );
  });

  it('hides instructor waiver controls for an archived project', () => {
    mocks.user = { _id: 'instructor-1', role: 'instructor' };
    renderWithQueryClient({ ...makeProject('awaiting_instructor_waiver'), isArchived: true }, true);

    expect(screen.queryByRole('button', { name: 'Grant waiver' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deny waiver' })).toBeNull();
  });
});
