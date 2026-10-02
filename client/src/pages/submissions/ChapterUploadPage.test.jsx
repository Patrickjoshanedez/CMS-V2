import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ChapterUploadPage from './ChapterUploadPage';
import { SUBMISSION_STATUSES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

// Mock DashboardLayout to render children simply
vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

const mockMutate = vi.fn();
const mockProjectData = {
  _id: 'proj-123',
  title: 'Smart AgTech Monitoring',
  capstonePhase: 2,
  deadlines: {},
};

let currentSubmissions = [];
let currentProject = { ...mockProjectData };

vi.mock('@/hooks/useProjects', () => ({
  useMyProject: () => ({
    data: currentProject,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useSubmissions', () => ({
  useProjectSubmissions: () => ({
    data: { submissions: currentSubmissions },
    isLoading: false,
    error: null,
  }),
  useUploadChapter: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
}));

describe('ChapterUploadPage Component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentProject = { ...mockProjectData, deadlines: {} };
    currentSubmissions = [];
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    document.body.innerHTML = '';
  });

  it('renders the deslopified 12-column workspace layout with submission form and workflow inspector', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
          <ChapterUploadPage />
        </MemoryRouter>,
      );
    });

    expect(document.body.textContent).toContain('Upload Chapter Manuscript');
    expect(document.body.textContent).toContain('Deliverable Manuscript Submission');
    expect(document.body.textContent).toContain('Academic Workflow Gate');
    expect(document.body.textContent).toContain('Institutional Pipeline Checks');
    expect(document.body.querySelector('select#chapter')).toBeTruthy();
  });

  it('blocks submission and warns when a previous chapter is not approved', async () => {
    // Chapter 1 needs revisions
    currentSubmissions = [
      {
        _id: 'sub-1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
      },
    ];

    await act(async () => {
      root.render(
        <MemoryRouter
          future={ROUTER_FUTURE_FLAGS}
          initialEntries={['/project/submissions/upload?chapter=2']}
        >
          <ChapterUploadPage />
        </MemoryRouter>,
      );
    });

    expect(document.body.textContent).toContain('Sequential Prerequisite Incomplete');
    expect(document.body.textContent).toContain('Chapter 1 currently requires revisions');

    // Submit button should be disabled because prerequisite is not met
    const submitBtn = document.body.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('enforces mandatory late justification note and letter document when deadline has passed', async () => {
    const pastDeadline = new Date(Date.now() - 3600000).toISOString();
    currentProject.deadlines = {
      chapter1: pastDeadline,
    };

    await act(async () => {
      root.render(
        <MemoryRouter
          future={ROUTER_FUTURE_FLAGS}
          initialEntries={['/project/submissions/upload?chapter=1']}
        >
          <ChapterUploadPage />
        </MemoryRouter>,
      );
    });

    expect(document.body.textContent).toContain('Late Submission Compliance Gate');
    expect(document.body.textContent).toContain('Justification Statement');
    expect(document.body.textContent).toContain('Official Justification Letter Document');
    expect(document.body.textContent).toContain('Click to attach signed justification letter');

    const submitBtn = document.body.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('hides late justification note and letter document when submission is on-time or unscheduled', async () => {
    const futureDeadline = new Date(Date.now() + 86400000).toISOString();
    currentProject.deadlines = {
      chapter1: futureDeadline,
    };

    await act(async () => {
      root.render(
        <MemoryRouter
          future={ROUTER_FUTURE_FLAGS}
          initialEntries={['/project/submissions/upload?chapter=1']}
        >
          <ChapterUploadPage />
        </MemoryRouter>,
      );
    });

    expect(document.body.textContent).not.toContain('Late Submission Compliance Gate');
    expect(document.body.textContent).not.toContain('Official Justification Letter Document');
    expect(document.body.textContent).toContain('Submission Remarks for Adviser (Optional)');
  });
});
