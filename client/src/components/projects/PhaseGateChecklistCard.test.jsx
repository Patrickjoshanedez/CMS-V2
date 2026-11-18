import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhaseGateChecklistCard from './PhaseGateChecklistCard';

describe('PhaseGateChecklistCard', () => {
  const baseProject = {
    _id: 'proj-1',
    titleStatus: 'approved',
    isArchived: false,
    capstonePhase: 1,
    panelistIds: ['p1', 'p2', 'p3'],
    admSignaturesByMilestone: {
      CAPSTONE_1: {
        secretary: { endorsed: true },
        adviser: { signed: true },
        instructor: { signed: true },
        chair: { signed: true },
      },
    },
  };

  it('tracks incomplete vs completed Capstone 1 -> 2 gates and invokes advance CTA when all 4 are ready', () => {
    const onAdvancePhase = vi.fn();
    const approvedChaptersAndProposal = [
      { _id: 's1', type: 'chapter', chapter: 1, version: 1, status: 'locked' },
      { _id: 's2', type: 'chapter', chapter: 2, version: 1, status: 'approved' },
      { _id: 's3', type: 'chapter', chapter: 3, version: 1, status: 'approved' },
      { _id: 'sp', type: 'proposal', version: 1, status: 'approved' },
    ];
    const releasedEvals = [
      { defenseType: 'proposal', status: 'released', decision: 'passed' },
      { defenseType: 'proposal', status: 'released', decision: 'passed_with_revisions' },
      { defenseType: 'proposal', status: 'released', decision: 'passed' },
    ];

    render(
      <PhaseGateChecklistCard
        project={baseProject}
        submissions={approvedChaptersAndProposal}
        evaluations={releasedEvals}
        isInstructor
        onAdvancePhase={onAdvancePhase}
      />,
    );

    expect(screen.getByTestId('phase-gate-checklist-card')).toBeInTheDocument();
    expect(screen.getByText('4/4 Ready')).toBeInTheDocument();

    const advanceBtn = screen.getByTestId('advance-phase-action-btn');
    fireEvent.click(advanceBtn);
    expect(onAdvancePhase).toHaveBeenCalledTimes(1);
  });

  it('shows pending gates and navigates to the first incomplete action in Capstone 2', () => {
    const onTabChange = vi.fn();
    const c2Project = {
      _id: 'proj-2',
      titleStatus: 'approved',
      capstonePhase: 2,
      ganttApproval: { approved: true },
      ganttPlan: { tasks: [{ title: 'T1' }] },
      githubRepoUrl: '',
      prototypes: [],
      systemDefenseApproval: { approved: false },
    };

    render(
      <PhaseGateChecklistCard
        project={c2Project}
        submissions={[]}
        evaluations={[]}
        isStudent
        onTabChange={onTabChange}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByText('1/4 Ready')).toBeInTheDocument();
    expect(screen.getByText('Gantt Schedule Approved')).toBeInTheDocument();
    expect(screen.getByText('GitHub Repo & Prototype Added')).toBeInTheDocument();
  });
});
