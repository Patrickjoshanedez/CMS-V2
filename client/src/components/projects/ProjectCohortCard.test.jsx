import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectCohortCard from './ProjectCohortCard';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ProjectCohortCard', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
    }
    container = null;
    root = null;
  });

  const mockProject = {
    _id: 'proj-123',
    title: 'Smart AgroSense IoT',
    titleStatus: 'approved',
    projectStatus: 'in_progress',
    capstonePhase: 2,
    academicYear: '2024-2025',
    isArchived: false,
    teamId: {
      name: 'Team Alpha',
      leaderId: 'user-1',
      members: [
        { _id: 'user-1', firstName: 'John', lastName: 'Doe' },
        { _id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
      ],
    },
    adviserId: {
      _id: 'adv-1',
      firstName: 'Dr. Alan',
      lastName: 'Turing',
    },
  };

  it('renders project title, team name, phase badge, and metadata', () => {
    const handleNavigate = vi.fn();
    act(() => {
      root.render(<ProjectCohortCard project={mockProject} onNavigate={handleNavigate} />);
    });

    expect(container.textContent).toContain('Smart AgroSense IoT');
    expect(container.textContent).toContain('Team Alpha');
    expect(container.textContent).toContain('Phase 2: Manuscripts');
    expect(container.textContent).toContain('John Doe (Lead)');
    expect(container.textContent).toContain('+ 1 member');
    expect(container.textContent).toContain('Dr. Alan Turing');
  });

  it('triggers onNavigate when action button is clicked', () => {
    const handleNavigate = vi.fn();
    act(() => {
      root.render(<ProjectCohortCard project={mockProject} onNavigate={handleNavigate} />);
    });

    const actionBtn = container.querySelector('button');
    expect(actionBtn).not.toBeNull();
    act(() => {
      actionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleNavigate).toHaveBeenCalledWith('proj-123');
  });

  it('renders proposal phase title format when title is not approved', () => {
    const proposalProject = {
      ...mockProject,
      _id: 'proj-456',
      title: 'Solar Prediction Engine',
      titleStatus: 'submitted',
      capstonePhase: 1,
      titleProposals: [{ title: 'Solar Prediction Engine' }],
    };

    act(() => {
      root.render(<ProjectCohortCard project={proposalProject} onNavigate={vi.fn()} />);
    });

    expect(container.textContent).toContain('Team Alpha Title Proposal');
    expect(container.textContent).toContain('candidate proposal');
  });
});
