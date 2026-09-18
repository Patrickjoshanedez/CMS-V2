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

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { _id: 'student-1', firstName: 'John', lastName: 'Doe', role: 'student' },
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

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MyProjectPage Navigation and Redirect Guard', () => {
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
});
