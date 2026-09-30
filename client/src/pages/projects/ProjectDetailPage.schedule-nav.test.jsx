import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLES } from '@cms/shared';
import ProjectDetailPage from './ProjectDetailPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
const mockUseProject = vi.fn();
const mockUseAuthStore = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false, isError: false }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'proj-123' }),
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => mockUseAuthStore(selector),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProject: (...args) => mockUseProject(...args),
  useAddTitleComment: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveTitle: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectTitle: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveTitleModification: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignAdviser: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignPanelist: () => ({ mutate: vi.fn(), isPending: false }),
  useRemovePanelist: () => ({ mutate: vi.fn(), isPending: false }),
  useSetDeadlines: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectProject: () => ({ mutate: vi.fn(), isPending: false }),
  useAdvancePhase: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveProject: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveSearch: () => ({ data: { projects: [] } }),
  useUpdateGanttChartUrl: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateDemoVideoUrl: () => ({ mutate: vi.fn(), isPending: false }),
  usePrototypes: () => ({ data: [], isLoading: false }),
  useAddPrototypeMedia: () => ({ mutate: vi.fn(), isPending: false }),
  useAddPrototypeLink: () => ({ mutate: vi.fn(), isPending: false }),
  useDeletePrototypeMedia: () => ({ mutate: vi.fn(), isPending: false }),
  useDeletePrototypeLink: () => ({ mutate: vi.fn(), isPending: false }),
  useRemovePrototype: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useSubmissions', () => ({
  useProjectSubmissions: () => ({ data: [] }),
}));

vi.mock('@/hooks/useAuditLogs', () => ({
  useEntityAuditHistory: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/services/authService', () => ({
  userService: {
    listUsers: vi.fn(async () => ({ data: { data: { users: [] } } })),
  },
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/projects/TitleStatusBadge', () => ({
  default: () => <div>title-badge</div>,
}));
vi.mock('@/components/projects/ProjectStatusBadge', () => ({
  default: () => <div>project-badge</div>,
}));
vi.mock('@/components/projects/DeadlineWarning', () => ({ default: () => null }));
vi.mock('@/components/projects/EvaluationPanel', () => ({ default: () => null }));
vi.mock('@/components/submissions/FinalPaperUpload', () => ({ default: () => null }));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const projectFixture = {
  _id: 'proj-123',
  title: 'Smart Agriculture Monitoring System',
  titleStatus: 'approved',
  projectStatus: 'in_progress',
  academicYear: '2025-2026',
  capstonePhase: 2,
  isArchived: false,
  teamId: {
    _id: 'team-1',
    name: 'Team AgroSmart',
    members: ['student-1'],
  },
  keywords: ['iot', 'agriculture'],
  memberRoleAssignments: [{ userId: { firstName: 'Juan', lastName: 'Dela Cruz' } }],
  panelistIds: ['panelist-1', 'panelist-2', 'panelist-3'],
  adviserId: { _id: 'adv-1', firstName: 'Prof', lastName: 'Adviser' },
  defenseSchedule: { status: 'pending_scheduling' },
};

const renderPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ProjectDetailPage />);
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

describe('ProjectDetailPage Schedule Defense Navigation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({
      state: {},
      search: '',
    });
    mockUseProject.mockReturnValue({
      data: projectFixture,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('clicking "Schedule Defense" as instructor navigates directly to /defense-scheduling with projectId', () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        user: { _id: 'inst-1', role: ROLES.INSTRUCTOR, firstName: 'Instructor', lastName: 'User' },
      };
      return typeof selector === 'function' ? selector(state) : state;
    });

    const view = renderPage();

    const scheduleBtn = Array.from(view.container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Schedule Defense'),
    );

    expect(scheduleBtn).toBeTruthy();

    act(() => {
      scheduleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      `/defense-scheduling?projectId=${projectFixture._id}`,
    );

    view.unmount();
  });

  it('does not render "Schedule Defense" button when user is a student', () => {
    mockUseAuthStore.mockImplementation((selector) => {
      const state = {
        user: { _id: 'stud-1', role: ROLES.STUDENT, firstName: 'Student', lastName: 'User' },
      };
      return typeof selector === 'function' ? selector(state) : state;
    });

    const view = renderPage();

    const scheduleBtn = Array.from(view.container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Schedule Defense'),
    );

    expect(scheduleBtn).toBeUndefined();

    view.unmount();
  });
});
