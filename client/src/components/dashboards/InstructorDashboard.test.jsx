import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InstructorDashboard from './InstructorDashboard';

const dashboardServiceMocks = vi.hoisted(() => ({
  getInstructorKpis: vi.fn(),
  getInstructorWorkload: vi.fn(),
  optimizeInstructorWorkload: vi.fn(),
}));

vi.mock('../../services/dashboardService', () => ({
  dashboardService: dashboardServiceMocks,
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InstructorDashboard />
    </QueryClientProvider>,
  );
}

describe('InstructorDashboard asynchronous states', () => {
  beforeEach(() => {
    dashboardServiceMocks.getInstructorKpis.mockReset();
    dashboardServiceMocks.getInstructorWorkload.mockReset();
    dashboardServiceMocks.optimizeInstructorWorkload.mockReset();
  });

  it('shows the shared accessible dashboard skeleton while both requests are pending', () => {
    dashboardServiceMocks.getInstructorKpis.mockReturnValue(new Promise(() => {}));
    dashboardServiceMocks.getInstructorWorkload.mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByRole('status', { name: 'Loading dashboard...' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('shows a shared destructive alert when both dashboard requests fail', async () => {
    dashboardServiceMocks.getInstructorKpis.mockRejectedValue(new Error('KPI unavailable'));
    dashboardServiceMocks.getInstructorWorkload.mockRejectedValue(
      new Error('Workload unavailable'),
    );

    renderDashboard();

    expect(await screen.findByText('Failed to load instructor dashboard data.')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('renders Phase Transition & Grade Release Queue when phaseTransitionQueue is present', async () => {
    dashboardServiceMocks.getInstructorKpis.mockResolvedValue({
      data: {
        data: {
          totals: {
            totalProjects: 1,
            activeProjects: 1,
            completedProjects: 0,
            totalSubmissions: 3,
          },
          performance: {
            completionRatePercent: 0,
            avgReviewTurnaroundHours: 2,
            avgEvaluationScore: 92,
          },
          pipeline: { pendingSubmissions: 0, underReview: 0, approved: 3 },
          phaseTransitionQueue: [
            {
              projectId: 'proj-adv-1',
              projectTitle: 'Smart Irrigation System',
              teamName: 'Team Beta',
              currentPhase: 1,
              nextPhase: 2,
              readyToAdvance: true,
              readyToReleaseGrades: false,
              blockerLabel: '',
            },
            {
              projectId: 'proj-rel-2',
              projectTitle: 'Autonomous Drone Routing',
              teamName: 'Team Gamma',
              currentPhase: 2,
              nextPhase: 3,
              readyToAdvance: false,
              readyToReleaseGrades: true,
              blockerLabel: 'All panel evaluations submitted',
            },
          ],
        },
      },
    });
    dashboardServiceMocks.getInstructorWorkload.mockResolvedValue({
      data: { data: { advisers: [], faculty: [] } },
    });

    renderDashboard();

    expect(await screen.findByTestId('instructor-phase-transition-queue')).toBeInTheDocument();
    expect(screen.getByText('Smart Irrigation System')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Advance to Capstone 2/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Release Grades/i })).toHaveAttribute(
      'href',
      '/projects/proj-rel-2?tab=capstone_2',
    );
  });
});
