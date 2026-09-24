import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import MyProjectPage from './MyProjectPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

let mockProjectData = null;
let mockTeamData = null;
const mockSubmissionsData = [];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

let mockUser = { _id: 'student-1', firstName: 'John', lastName: 'Doe', role: 'student' };

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    fetchUser: vi.fn(),
  }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useMyProject: () => ({
    data: mockProjectData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateTitle: () => ({ mutate: vi.fn(), isPending: false }),
  useSubmitTitle: () => ({ mutate: vi.fn(), isPending: false }),
  useReviseAndResubmit: () => ({ mutate: vi.fn(), isPending: false }),
  useRequestTitleModification: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignAdviser: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignPanelists: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useMyTeam: () => ({
    data: mockTeamData,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useSubmissions', () => ({
  useProjectSubmissions: () => ({
    data: mockSubmissionsData,
  }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

vi.mock('@/components/projects/EvaluationPanel', () => ({
  default: () => <div data-testid="evaluation-panel" />,
}));

vi.mock('@/components/projects/ProposalTab', () => ({
  default: () => <div data-testid="proposal-tab" />,
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/projects/ActionDoneMatrixTab', () => ({
  default: () => <div data-testid="action-done-matrix-tab" />,
}));

vi.mock('@/components/projects/InteractiveGanttChart', () => ({
  default: () => <div data-testid="interactive-gantt-chart" />,
}));

vi.mock('@/components/projects/DevelopmentAssetsForm', () => ({
  default: () => <div data-testid="development-assets-form" />,
}));

vi.mock('@/components/projects/PrototypeGallery', () => ({
  default: () => <div data-testid="prototype-gallery" />,
}));

vi.mock('@/components/projects/ConsultationLogWidget', () => ({
  default: () => <div data-testid="consultation-log-widget" />,
}));

vi.mock('@/components/projects/ProjectInformationSidebar', () => ({
  default: () => <div data-testid="project-information-sidebar" />,
}));

describe('MyProjectPage Navigation, Tabs and Submissions Isolation', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockSearchParams = new URLSearchParams();
    mockProjectData = {
      _id: 'proj-1',
      title: 'Emergency Response System',
      titleStatus: 'submitted',
      projectStatus: 'draft',
      academicYear: '2024-2025',
      capstonePhase: 1,
      panelistIds: [],
    };

    mockTeamData = {
      _id: 'team-1',
      name: 'Team Alpha',
      members: [{ user: { firstName: 'John', lastName: 'Doe' } }],
    };
  });

  it('redirects to /project/approval when titleStatus is not approved and no query params exist', async () => {
    mockSearchParams = new URLSearchParams();

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MyProjectPage />
        </QueryClientProvider>,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project/approval', { replace: true });
  });

  it('does NOT redirect to /project/approval when view=overview is provided', async () => {
    mockSearchParams = new URLSearchParams('view=overview');

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MyProjectPage />
        </QueryClientProvider>,
      );
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/project/approval', { replace: true });
    expect(container.textContent).toContain('My Capstone');
  });

  it('renders Title Proposals & Approval Studio button when in overview mode and title is not approved', async () => {
    mockSearchParams = new URLSearchParams('view=overview');

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MyProjectPage />
        </QueryClientProvider>,
      );
    });

    const studioBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Title Proposals & Approval Studio'),
    );
    expect(studioBtn).toBeTruthy();

    await act(async () => {
      studioBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project/approval');
  });

  it('renders the 5 dedicated workflow tabs: Proposal Drafting, Capstone 1, Capstone 2, Capstone 3, Consultations', async () => {
    mockSearchParams = new URLSearchParams('tab=proposal');
    mockProjectData.titleStatus = 'approved';

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MyProjectPage />
        </QueryClientProvider>,
      );
    });

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const text = tablist.textContent;
    expect(text).toContain('Proposal Drafting');
    expect(text).toContain('Capstone 1');
    expect(text).toContain('Capstone 2');
    expect(text).toContain('Capstone 3');
    expect(text).not.toContain('Action Done Matrix');
    expect(text).toContain('Consultations');
  });

  it('ensures document submission upload dropzones are NOT present on My Capstone page', async () => {
    mockSearchParams = new URLSearchParams('tab=capstone_3');
    mockProjectData.titleStatus = 'approved';
    mockProjectData.capstonePhase = 3;

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MyProjectPage />
        </QueryClientProvider>,
      );
    });

    // Submissions are isolated to /project/submissions page, not on My Capstone
    expect(container.querySelector('[data-testid="final-paper-upload"]')).toBeNull();
    expect(container.querySelector('[data-testid="chapter-progress-with-rounds"]')).toBeNull();
    // Contextual callout guiding users to Submissions page should be present
    expect(container.textContent).toContain('Chapters 4–5 & Final Manuscript Submissions');
    expect(container.textContent).toContain('Go to Submissions');
  });

  it('renders dedicated Action Done Matrix in adm tab', async () => {
    mockSearchParams = new URLSearchParams('tab=adm');
    mockProjectData.titleStatus = 'approved';

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MyProjectPage />
        </QueryClientProvider>,
      );
    });

    expect(container.querySelector('[data-testid="action-done-matrix-tab"]')).toBeTruthy();
  });

  it('redirects non-students (instructor, faculty) away from My Capstone to /projects', async () => {
    mockUser = { _id: 'inst-1', firstName: 'Dr. Jane', lastName: 'Smith', role: 'instructor' };

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MyProjectPage />
        </QueryClientProvider>,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects', { replace: true });
  });
});
