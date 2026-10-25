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
});
