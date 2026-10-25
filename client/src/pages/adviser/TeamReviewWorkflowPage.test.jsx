import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamReviewWorkflowPage from './TeamReviewWorkflowPage';

const mocks = vi.hoisted(() => ({
  getAdviserWorkload: vi.fn(),
  prefetchWorkspace: vi.fn(),
  prefetchRoute: vi.fn(),
}));

vi.mock('@/services/dashboardService', () => ({
  dashboardService: { getAdviserWorkload: mocks.getAdviserWorkload },
}));

vi.mock('@/hooks/useSubmissions', () => ({
  usePrefetchSubmissionReviewWorkspace: () => mocks.prefetchWorkspace,
}));

vi.mock('@/lib/routePrefetch', () => ({ prefetchRoute: mocks.prefetchRoute }));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const workload = {
  awaitingReview: [
    {
      _id: 'submission-pending',
      teamName: 'Team Gamma',
      chapter: 2,
      version: 1,
      projectTitle: 'Community Health Tracker',
      submittedBy: 'Jamie Student',
      status: 'pending',
      daysRemaining: 1,
    },
  ],
  underReview: [
    {
      _id: 'submission-revision',
      teamName: 'Team Delta',
      chapter: 3,
      version: 2,
      projectTitle: 'Campus Energy Monitor',
      submittedBy: 'Alex Student',
      status: 'revisions_required',
      daysRemaining: -2,
    },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeamReviewWorkflowPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeamReviewWorkflowPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdviserWorkload.mockResolvedValue({ data: workload });
  });

  it('announces loading with content-shaped shared skeletons', () => {
    mocks.getAdviserWorkload.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status', { name: 'Loading team review queue' })).toBeTruthy();
    expect(screen.getByText('Loading review queue...')).toBeTruthy();
  });

  it('shows review metrics and links each submission to its review workspace', async () => {
    renderPage();

    expect(await screen.findByText('Team Gamma')).toBeTruthy();
    expect(screen.getByText('Team Delta')).toBeTruthy();
    expect(screen.getByText('Awaiting Review')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Team Gamma/ }).getAttribute('href')).toBe(
      '/project/submissions/submission-pending',
    );
    expect(screen.getByRole('link', { name: /Team Delta/ }).getAttribute('href')).toBe(
      '/project/submissions/submission-revision',
    );
    expect(screen.getByText('2d overdue')).toBeTruthy();
  });

  it('shows a semantic retry alert when the workload request fails', async () => {
    mocks.getAdviserWorkload.mockRejectedValue(new Error('Connection unavailable'));
    renderPage();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Unable to load team workflow')).toBeTruthy();
    expect(screen.getByText('Connection unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mocks.getAdviserWorkload).toHaveBeenCalledTimes(2));
  });
});
