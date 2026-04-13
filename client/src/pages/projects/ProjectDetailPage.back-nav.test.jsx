import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    useParams: () => ({ id: 'project-1' }),
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => mockUseAuthStore(selector),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProject: (...args) => mockUseProject(...args),
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

vi.mock('@/components/projects/TitleStatusBadge', () => ({ default: () => <div>title-badge</div> }));
vi.mock('@/components/projects/ProjectStatusBadge', () => ({ default: () => <div>project-badge</div> }));
vi.mock('@/components/projects/PrototypeGallery', () => ({ default: () => null }));
vi.mock('@/components/projects/DeadlineWarning', () => ({ default: () => null }));
vi.mock('@/components/projects/EvaluationPanel', () => ({ default: () => null }));
vi.mock('@/components/submissions/FinalPaperUpload', () => ({ default: () => null }));
vi.mock('@/components/projects/ReadonlyPDFViewer', () => ({ default: () => null }));
vi.mock('@/components/submissions/ChapterProgressWithRounds', () => ({ default: () => null }));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const projectFixture = {
  _id: 'project-1',
  title: 'Smart Archive Discovery',
  titleStatus: 'approved',
  projectStatus: 'in_progress',
  academicYear: '2025-2026',
  capstonePhase: 1,
  isArchived: false,
  teamId: {
    _id: 'team-1',
    name: 'Team Alpha',
    members: ['student-1'],
  },
  keywords: ['ai'],
  memberRoleAssignments: [{ userId: { firstName: 'A', lastName: 'One' } }],
  panelistIds: [],
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

describe('ProjectDetailPage back navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ user: { _id: 'instructor-1', role: 'instructor' } }),
    );
    mockUseProject.mockReturnValue({ data: projectFixture, isLoading: false, error: null });
  });

  it('shows Back to Search Results and navigates to returnTo when opened from archive', () => {
    mockUseLocation.mockReturnValue({
      state: { fromArchive: true, returnTo: '/archive?q=ai&p=2' },
      search: '',
    });

    const view = renderPage();

    const backButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Back to Search Results'),
    );

    expect(backButton).toBeTruthy();

    act(() => {
      backButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/archive?q=ai&p=2');

    view.unmount();
  });

  it('shows Back to Projects and navigates to /projects by default', () => {
    mockUseLocation.mockReturnValue({
      state: {},
      search: '',
    });

    const view = renderPage();

    const backButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Back to Projects'),
    );

    expect(backButton).toBeTruthy();

    act(() => {
      backButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects');

    view.unmount();
  });
});
