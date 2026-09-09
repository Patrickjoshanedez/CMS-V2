import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FacultyDashboard, { VIEW_MODES } from '@/components/dashboards/FacultyDashboard';
import { ROLES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const mockDashboardData = {
  role: ROLES.FACULTY,
  counts: {
    adviserProjects: 2,
    activeAdviserProjects: 2,
    pendingReviews: 1,
    panelAssignments: 3,
    pendingEvaluations: 2,
    secretaryProjects: 1,
    pendingSecretaryMinutes: 1,
    pendingSecretaryEndorsement: 0,
    endorsedSecretaryMatrices: 0,
  },
  assignedProjects: [
    {
      _id: 'proj-adv-1',
      title: 'CMS-V2 BukSU Capstone Portal',
      teamName: 'Team Alpha',
      capstonePhase: 2,
      projectStatus: 'active',
      titleStatus: 'approved',
    },
  ],
  pendingReviews: [
    {
      _id: 'sub-1',
      chapter: 2,
      version: 1,
      projectTitle: 'CMS-V2 BukSU Capstone Portal',
      submittedBy: 'Añedez, Patrick Josh',
      status: 'pending',
    },
  ],
  secretaryProjects: [
    {
      _id: 'proj-sec-1',
      title: 'Smart Solar IoT Farm Monitoring',
      teamName: 'Team Solar',
      capstonePhase: 2,
      projectStatus: 'active',
      titleStatus: 'approved',
      admStatus: 'awaiting_minutes_upload',
      actionDoneMatrixCount: 0,
      adviserName: 'Glaiza Mae A. Libe',
      admSignatures: { secretary: { endorsed: false } },
    },
  ],
  recentNotifications: [],
};

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({
    data: mockDashboardData,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../services/dashboardService', () => ({
  dashboardService: {
    getAdviserWorkload: vi.fn().mockResolvedValue({}),
    getPanelistTopics: vi.fn().mockResolvedValue({ assigned: [], available: [] }),
    selectPanelistTopic: vi.fn().mockResolvedValue({}),
  },
}));

describe('FacultyDashboard Multi-Hat Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderComponent = (user = { _id: 'fac-1', role: ROLES.FACULTY }) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
            <FacultyDashboard user={user} />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    return {
      container,
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders 3 view tabs: Adviser View, Panelist View, and Secretary View', () => {
    const view = renderComponent();

    expect(view.container.textContent).toContain('Adviser View');
    expect(view.container.textContent).toContain('Panelist View');
    expect(view.container.textContent).toContain('Secretary View');

    view.unmount();
  });

  it('switches to Secretary View and displays Secretary MicroStats and Teams', () => {
    const view = renderComponent();

    const secretaryTabButton = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Secretary View'),
    );
    expect(secretaryTabButton).toBeDefined();

    act(() => {
      secretaryTabButton.click();
    });

    // Check Secretary View metrics and headers
    expect(view.container.textContent).toContain('Handled Teams (Secretary)');
    expect(view.container.textContent).toContain('Pending Minutes');
    expect(view.container.textContent).toContain('Secretary Assigned Capstone Teams');
    expect(view.container.textContent).toContain('Team Solar');
    expect(view.container.textContent).toContain('Needs Minutes Upload');
    expect(view.container.textContent).toContain('Open Secretary Review Studio');

    view.unmount();
  });

  it('has zero student leakage (no Team Readiness or Still forming)', () => {
    const view = renderComponent();

    expect(view.container.textContent).not.toContain('Team Readiness');
    expect(view.container.textContent).not.toContain('Still forming');
    expect(view.container.textContent).not.toContain('Join Code');

    view.unmount();
  });

  it('renders Pending Reviews with Review button and queue status', () => {
    const view = renderComponent();

    expect(view.container.textContent).toContain('Pending Reviews');
    expect(view.container.textContent).toContain('CMS-V2 BukSU Capstone Portal');
    expect(view.container.textContent).toContain('Ch. 2');

    // Quick review button exists
    const reviewButton = Array.from(view.container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Review') && !b.textContent.includes('Studio'),
    );
    expect(reviewButton).toBeDefined();

    view.unmount();
  });
});
