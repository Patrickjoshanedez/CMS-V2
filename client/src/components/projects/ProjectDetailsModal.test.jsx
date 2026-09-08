import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ProjectDetailsModal from './ProjectDetailsModal';
import TitleFeedbackRemarksCard from './TitleFeedbackRemarksCard';
import { TITLE_STATUSES, CAPSTONE_PHASES, PROJECT_STATUSES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockProject = {
  _id: 'proj-123',
  title: 'AI Smart Campus Navigation and Facility Management',
  titleStatus: TITLE_STATUSES.APPROVED,
  projectStatus: PROJECT_STATUSES.ACTIVE,
  capstonePhase: CAPSTONE_PHASES.PHASE_2,
  academicYear: '2025–2026',
  abstract: 'An automated indoor navigation system designed for university campuses.',
  teamId: {
    _id: 'team-456',
    name: 'Team Alpha Pioneers',
    section: 'BSIT-4A',
    googleDocUrl: 'https://docs.google.com/document/d/example',
    githubUrl: 'https://github.com/buksu/alpha-pioneers',
    members: [
      {
        _id: 'm-1',
        userId: {
          _id: 'u-1',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          email: 'juan@student.buksu.edu.ph',
        },
        role: 'leader',
        proponentRole: 'Project Lead & Systems Analyst',
      },
      {
        _id: 'm-2',
        userId: {
          _id: 'u-2',
          firstName: 'Maria',
          lastName: 'Santos',
          email: 'maria@student.buksu.edu.ph',
        },
        role: 'member',
        proponentRole: 'Frontend & UI/UX Developer',
      },
    ],
  },
  adviserId: {
    _id: 'adv-1',
    fullName: 'Dr. Alan Turing',
    email: 'turing@buksu.edu.ph',
  },
  panelistIds: ['pan-1', 'pan-2', 'pan-3'],
  sdgTags: ['SDG 9: Industry, Innovation, and Infrastructure'],
  keywords: ['Machine Learning', 'Indoor Positioning'],
};

describe('ProjectDetailsModal', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      project: mockProject,
      ...props,
    };

    act(() => {
      root.render(
        <MemoryRouter>
          <ProjectDetailsModal {...defaultProps} />
        </MemoryRouter>,
      );
    });

    return {
      props: defaultProps,
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders null when open is false', () => {
    const { unmount } = renderModal({ open: false });
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
    unmount();
  });

  it('renders complete project details, roster, committee, and approval state when open is true', () => {
    const { unmount } = renderModal({ open: true });
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Project Details & Approval');
    expect(dialog.textContent).toContain('AI Smart Campus Navigation and Facility Management');
    expect(dialog.textContent).toContain('Team Alpha Pioneers');
    expect(dialog.textContent).toContain('Dr. Alan Turing');
    expect(dialog.textContent).toContain('Juan Dela Cruz');
    expect(dialog.textContent).toContain('Project Lead & Systems Analyst');
    expect(dialog.textContent).toContain('Maria Santos');
    expect(dialog.textContent).toContain('Frontend & UI/UX Developer');
    expect(dialog.textContent).toContain('3 Faculty Panelists');
    expect(dialog.textContent).toContain('SDG 9: Industry, Innovation, and Infrastructure');
    expect(dialog.textContent).toContain('Machine Learning');
    expect(dialog.textContent).toContain('Team Google Doc');
    expect(dialog.textContent).toContain('GitHub Repository');
    unmount();
  });

  it('calls onOpenChange(false) when close button is clicked', () => {
    const onOpenChange = vi.fn();
    const { unmount } = renderModal({ open: true, onOpenChange });
    const closeBtn = document.body.querySelector('button[aria-label="Close dialog"]');
    expect(closeBtn).not.toBeNull();

    act(() => {
      closeBtn.click();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    unmount();
  });
});

describe('TitleFeedbackRemarksCard', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('renders null when comments are empty or missing', () => {
    act(() => {
      root.render(<TitleFeedbackRemarksCard comments={[]} />);
    });
    expect(container.innerHTML).toBe('');

    act(() => {
      root.render(<TitleFeedbackRemarksCard comments={null} />);
    });
    expect(container.innerHTML).toBe('');
  });

  it('renders comments properly when comments are present', () => {
    const comments = [
      {
        _id: 'thread-1',
        proposalTitle: 'AI Campus Navigation',
        comments: [
          {
            _id: 'c-1',
            name: 'Prof. Ada Lovelace',
            role: 'Panel Chair',
            text: 'Ensure system handles GPS-denied environments within campus buildings.',
            createdAt: '2026-09-07T08:00:00.000Z',
          },
        ],
      },
    ];

    act(() => {
      root.render(<TitleFeedbackRemarksCard comments={comments} />);
    });

    expect(container.textContent).toContain('Title Defense Feedback & Panel Remarks');
    expect(container.textContent).toContain('Prof. Ada Lovelace');
    expect(container.textContent).toContain('Panel Chair');
    expect(container.textContent).toContain(
      'Ensure system handles GPS-denied environments within campus buildings.',
    );
  });
});
