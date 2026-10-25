import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdviserAnalytics from './AdviserAnalytics';
import AdviserWorkloadCard from './AdviserWorkloadCard';
import KPICards from './KPICards';
import PanelistTopicCard from './PanelistTopicCard';
import WorkloadHeatmap from './WorkloadHeatmap';

describe('instructor dashboard widgets', () => {
  it('renders KPI totals and preserves zero-value fallbacks', () => {
    const { rerender } = render(
      <KPICards
        kpis={{
          totals: { totalProjects: 12, activeProjects: 8, completedProjects: 4 },
          performance: {
            completionRatePercent: 33,
            avgReviewTurnaroundHours: 18,
            avgEvaluationScore: 91,
          },
          pipeline: { pendingSubmissions: 5, underReview: 2 },
        }}
      />,
    );

    expect(screen.getByText('33%')).toBeVisible();
    expect(screen.getByText('18h')).toBeVisible();
    expect(screen.getByText('91')).toBeVisible();
    expect(screen.getByText('5')).toBeVisible();
    expect(screen.getByText('12')).toBeVisible();
    expect(screen.getByText('8')).toBeVisible();
    expect(screen.getByText('4')).toBeVisible();

    rerender(<KPICards kpis={{}} />);
    expect(screen.getByText('0%')).toBeVisible();
    expect(screen.getByText('0h')).toBeVisible();
  });

  it('selects an available panel topic and disables selection while pending', () => {
    const onSelect = vi.fn();
    const topic = {
      _id: 'topic-1',
      title: 'Solar-powered crop monitoring',
      titleStatus: 'approved',
      capstonePhase: 2,
      adviser: 'Dr. Santos',
      panelistCount: 2,
      hasSlot: true,
      isAssigned: false,
      team: { name: 'Team AgriTech', memberCount: 3 },
    };
    const { rerender } = render(
      <MemoryRouter>
        <PanelistTopicCard topic={topic} onSelect={onSelect} selecting={false} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select Topic' }));
    expect(onSelect).toHaveBeenCalledWith('topic-1');

    rerender(
      <MemoryRouter>
        <PanelistTopicCard topic={topic} onSelect={onSelect} selecting />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Selecting...' })).toBeDisabled();
  });

  it('opens an assigned topic and omits selection for an unavailable slot', () => {
    const topic = {
      _id: 'topic-2',
      title: 'Campus energy dashboard',
      titleStatus: 'approved',
      capstonePhase: 3,
      adviser: 'Prof. Reyes',
      panelistCount: 3,
      hasSlot: false,
      isAssigned: true,
      team: { name: 'Team Volt', memberCount: 2 },
    };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={<PanelistTopicCard topic={topic} onSelect={vi.fn()} />}
          />
          <Route path="/projects/:projectId" element={<output>Project route reached</output>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /select topic/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Campus energy dashboard'));
    expect(screen.getByText('Project route reached')).toBeVisible();
  });
});

describe('faculty workload heatmap', () => {
  it('switches table columns and workload metrics across Adviser, Panelist, and Faculty views', () => {
    render(
      <WorkloadHeatmap
        workload={{
          advisers: [
            {
              adviserId: 'a1',
              adviserName: 'Dr. Adviser',
              projectCount: 2,
              pending: 1,
              revisions: 1,
              overdue: 0,
              workloadScore: 6,
            },
          ],
          panelists: [
            {
              panelistId: 'p1',
              panelistName: 'Dr. Panelist',
              projectCount: 3,
              pending: 2,
              workloadScore: 12,
            },
          ],
          faculty: [
            {
              facultyId: 'f1',
              facultyName: 'Dr. Faculty',
              adviserProjectCount: 2,
              panelistProjectCount: 3,
              projectCount: 5,
              pending: 3,
              workloadScore: 18,
            },
          ],
          summary: {
            adviserCount: 1,
            adviserAverageScore: 6,
            panelistCount: 1,
            panelistAverageScore: 12,
            facultyCount: 1,
            averageScore: 18,
          },
        }}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Adviser' })).toBeVisible();
    expect(screen.getByText('Dr. Adviser')).toBeVisible();
    expect(screen.getAllByText('6', { exact: true })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Panelists' }));
    expect(screen.getByRole('button', { name: 'Panelists' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('columnheader', { name: 'Panelist' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Pending Reviews' })).toBeVisible();
    expect(screen.getByText('Dr. Panelist')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'All Faculty' }));
    expect(screen.getByRole('columnheader', { name: 'Faculty Member' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Advisory' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Panelist' })).toBeVisible();
    expect(screen.getByText('Dr. Faculty')).toBeVisible();
  });

  it('explains the empty workload state without fabricating rows', () => {
    render(<WorkloadHeatmap workload={{}} />);

    expect(screen.getByText(/No advisers workload data found/i)).toBeVisible();
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});

describe('adviser dashboard summaries', () => {
  it('renders analytics metrics and clamps review outcome progress to the valid range', () => {
    render(
      <AdviserAnalytics
        analytics={{
          period: 'Current semester',
          metrics: {
            totalReviewed: 14,
            approvalRatePercent: 64,
            avgReviewTimeHours: 9,
            reviewVelocityPerDay: 2,
          },
          breakdown: {
            approved: { percentage: 120 },
            revisionRequested: { percentage: 30 },
            rejected: { percentage: -5 },
          },
        }}
      />,
    );

    expect(screen.getByText('14')).toBeVisible();
    expect(screen.getByText('64%')).toBeVisible();
    expect(screen.getByText('9h')).toBeVisible();
    expect(screen.getByText('2/day')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Approved: 100.00 percent' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByRole('progressbar', { name: 'Rejected: 0.00 percent' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('shows review workload counts, empty explanations, and overdue submission status', () => {
    render(
      <AdviserWorkloadCard
        workload={{
          summary: {
            totalToReview: 3,
            currentlyReviewing: 1,
            overdue: 1,
            upcomingDeadline: 0,
          },
          awaitingReview: [],
          underReview: [],
          overdue: [
            {
              _id: 'submission-overdue',
              projectTitle: 'Community health scheduling system',
              chapter: 4,
              version: 2,
              daysOverdue: 3,
            },
          ],
          upcomingDeadline: [],
        }}
      />,
    );

    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getAllByText('1', { exact: true })).toHaveLength(2);
    expect(screen.getByText('No submissions waiting for review.')).toBeVisible();
    expect(screen.getByText('No chapters currently under review.')).toBeVisible();
    expect(screen.getByText('Community health scheduling system')).toBeVisible();
    expect(screen.getByText('3d overdue')).toBeVisible();
    expect(screen.getByText('No upcoming revision deadlines.')).toBeVisible();
  });
});
