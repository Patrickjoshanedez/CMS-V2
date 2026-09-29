import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import { ROLES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

let mockUser = {
  _id: 'std-1',
  firstName: 'Josh',
  lastName: 'Añedez',
  role: ROLES.STUDENT,
  sectionId: 'sec-1',
  instructorId: 'inst-1',
};

let mockDashboardResult = {
  data: {
    team: null,
    project: null,
    recentNotifications: [],
  },
  isLoading: false,
  isError: false,
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    fetchUser: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => mockDashboardResult,
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe('StudentDashboard (DashboardPage for Student Role)', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockUser = {
      _id: 'std-1',
      firstName: 'Josh',
      lastName: 'Añedez',
      role: ROLES.STUDENT,
      sectionId: 'sec-1',
      instructorId: 'inst-1',
    };

    mockDashboardResult = {
      data: {
        team: null,
        project: null,
        recentNotifications: [],
      },
      isLoading: false,
      isError: false,
    };
  });

  const renderComponent = () => {
    act(() => {
      root.render(
        <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
          <DashboardPage />
        </MemoryRouter>,
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

  it('renders Phase 0 Onboarding Stepper for student without team (no empty boxes)', () => {
    const { container } = renderComponent();

    // Verify Welcome and Phase 0 active indicator
    expect(container.textContent).toContain('Welcome back, Josh!');
    expect(container.textContent).toContain('Phase 0 Active');
    expect(container.textContent).toContain('Capstone Phase 0: Getting Started');

    // Verify 4 steps are rendered
    expect(container.textContent).toContain('Step 1');
    expect(container.textContent).toContain('Profile Binding');
    expect(container.textContent).toContain('Done'); // Profile is bound

    expect(container.textContent).toContain('Step 2 • Active');
    expect(container.textContent).toContain('Team Formation');
    expect(container.textContent).toContain('Go to Teams');

    expect(container.textContent).toContain('Step 3');
    expect(container.textContent).toContain('Title Defense');

    expect(container.textContent).toContain('Step 4');
    expect(container.textContent).toContain('Committee Defense');

    // MUST NOT render the redundant 3 empty metric cards ("0/5 Approved", etc.)
    expect(container.textContent).not.toContain('0/5 Approved');
    expect(container.textContent).not.toContain('You are not assigned to a team yet');

    // Calendar is rendered in compact agenda timeline empty state with zero ghost events
    expect(container.textContent).toContain('No Scheduled Defense Hearings');
    expect(container.textContent).not.toContain('Team Alpha (HealthAI)');
  });

  it('indicates Action Required on Step 1 if profile is incomplete', () => {
    mockUser.sectionId = null;
    mockUser.instructorId = null;

    const { container } = renderComponent();

    expect(container.textContent).toContain('Action Required');
    expect(container.textContent).toContain('Complete Profile');
  });

  it('renders active cockpit when student belongs to a team and has project progress', () => {
    mockDashboardResult = {
      data: {
        team: {
          _id: 'team-1',
          name: 'Team DevPulse',
          memberCount: 3,
          isLocked: true,
          members: [
            { _id: 'std-1', firstName: 'Josh', lastName: 'Añedez' },
            { _id: 'std-2', firstName: 'Maria', lastName: 'Santos' },
            { _id: 'std-3', firstName: 'Juan', lastName: 'Dela Cruz' },
          ],
        },
        project: {
          _id: 'proj-1',
          title: 'Automated Capstone Archival System',
          titleStatus: 'approved',
          projectStatus: 'active',
          capstonePhase: 2,
          memberRoleAssignments: [
            { userId: 'std-1', professionalTitle: 'Project Lead & Systems Analyst' },
          ],
        },
        chapterProgress: [
          { chapter: 1, status: 'approved' },
          { chapter: 2, status: 'under_review' },
        ],
        recentNotifications: [
          {
            _id: 'notif-1',
            title: 'Hearing Scheduled',
            message: 'Title defense scheduled on Friday.',
          },
        ],
      },
      isLoading: false,
      isError: false,
    };

    const { container } = renderComponent();

    // In active team mode, Phase 0 stepper is not shown
    expect(container.textContent).not.toContain('Capstone Phase 0: Getting Started');

    // Active Cockpit items are shown
    expect(container.textContent).toContain('Team Members');
    expect(container.textContent).toContain('Team DevPulse');
    expect(container.textContent).toContain('Locked Team');
    expect(container.textContent).toContain('Project Lead & Systems Analyst');
    expect(container.textContent).toContain('Automated Capstone Archival System');
    expect(container.textContent).toContain('View Project Workspace');
    expect(container.textContent).toContain('Hearing Scheduled');
  });
});
