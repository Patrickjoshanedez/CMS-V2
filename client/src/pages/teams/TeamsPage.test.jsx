import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ROLES } from '@cms/shared';
import TeamsPage from './TeamsPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const invalidateQueries = vi.fn();
const mockUseNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({}));
const mockUseAuthStore = vi.fn();
const mockUseTeams = vi.fn();
const mockUseUsers = vi.fn();
const mockUseAcademicYears = vi.fn();
const mockUseSections = vi.fn();
const mockUseAssignAdviser = vi.fn();
const mockUseAssignPanelist = vi.fn();
const mockUseRemovePanelist = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockUseNavigate(),
    useParams: () => mockUseParams(),
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (...args) => mockUseAuthStore(...args),
}));

vi.mock('@/hooks/useTeams', () => ({
  useMyTeam: () => ({ data: null, isLoading: false, isError: false, error: null }),
  useTeams: (...args) => mockUseTeams(...args),
  useCreateTeam: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useInviteMember: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useInviteCandidates: () => ({ data: [], isLoading: false }),
  useAcceptInvite: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useAssignMemberRole: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateGoogleDocLink: () => ({ mutate: vi.fn(), isPending: false }),
  useLockTeam: () => ({ mutate: vi.fn(), isPending: false }),
  useLeaveTeam: () => ({ mutate: vi.fn(), isPending: false }),
  teamKeys: {
    all: ['teams'],
  },
}));

vi.mock('@/hooks/useUsers', () => ({
  useUsers: (...args) => mockUseUsers(...args),
}));

vi.mock('@/hooks/useProjects', () => ({
  useAssignAdviser: (...args) => mockUseAssignAdviser(...args),
  useAssignPanelist: (...args) => mockUseAssignPanelist(...args),
  useRemovePanelist: (...args) => mockUseRemovePanelist(...args),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicYears: (...args) => mockUseAcademicYears(...args),
  useSections: (...args) => mockUseSections(...args),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const renderTeamsPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<TeamsPage />);
  });

  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe('TeamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUseAuthStore.mockReturnValue({
      user: { _id: 'inst-1', role: ROLES.INSTRUCTOR },
      isAuthenticated: true,
    });
    mockUseTeams.mockReturnValue({
      data: {
        teams: [
          {
            _id: 'team-1',
            name: 'Team One',
            academicYear: '2025-2026',
            leaderId: {
              _id: 'leader-1',
              firstName: 'Ben',
              lastName: 'Geo',
              email: 'leader@example.com',
              instructorId: { _id: 'inst-1', firstName: 'Pat', lastName: 'Instructor', email: 'pat@example.com' },
            },
            members: [],
            assignment: {
              projectId: 'project-1',
              instructor: null,
              adviser: null,
              panelists: [],
            },
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseUsers.mockImplementation((filters) => {
      if (filters?.role === ROLES.ADVISER) {
        return {
          data: {
            users: [
              {
                _id: 'adv-1',
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@example.com',
              },
            ],
          },
          isLoading: false,
        };
      }

      if (filters?.role === ROLES.PANELIST) {
        return {
          data: {
            users: [
              {
                _id: 'pan-1',
                firstName: 'Grace',
                lastName: 'Hopper',
                email: 'grace@example.com',
              },
            ],
          },
          isLoading: false,
        };
      }

      return { data: { users: [] }, isLoading: false };
    });
    mockUseAcademicYears.mockReturnValue({ data: [] });
    mockUseSections.mockReturnValue({ data: [] });
    mockUseAssignAdviser.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseAssignPanelist.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseRemovePanelist.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('renders searchable adviser and panelist inputs for instructors', () => {
    const view = renderTeamsPage();

    const teamButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Team One'),
    );

    expect(teamButton).toBeTruthy();

    act(() => {
      teamButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(view.container.querySelector('input[placeholder="Type to search advisers"]')).toBeTruthy();
    expect(view.container.querySelector('input[placeholder="Type to search panelists"]')).toBeTruthy();

    view.unmount();
  });
});