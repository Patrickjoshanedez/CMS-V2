import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ROLES } from '@cms/shared';
import ProfilePage from './ProfilePage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAuthStore = vi.fn();
const mockUseSections = vi.fn();
const mockUseInstructors = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useSections: (...args) => mockUseSections(...args),
}));

vi.mock('@/hooks/useUsers', () => ({
  useInstructors: (...args) => mockUseInstructors(...args),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/services/authService', () => ({
  userService: {
    uploadAvatar: vi.fn(),
    updateMe: vi.fn(),
  },
}));

const makeStudentUser = () => ({
  _id: 'student-1',
  role: ROLES.STUDENT,
  firstName: 'Test',
  middleName: '',
  lastName: 'Student',
  fullName: 'Test Student',
  email: 'student@example.com',
  avatarUrl: null,
  sectionId: null,
  instructorId: null,
});

const makeQueryState = (overrides = {}) => ({
  data: [],
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

const renderProfilePage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  act(() => {
    root.render(<ProfilePage />);
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

describe('ProfilePage academic info dropdowns', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      user: makeStudentUser(),
      fetchUser: vi.fn(),
    });

    mockUseSections.mockReturnValue(makeQueryState());
    mockUseInstructors.mockReturnValue(makeQueryState());
  });

  it('uses always-refetch query options for student academic lookups', () => {
    const view = renderProfilePage();

    expect(mockUseSections).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        enabled: true,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: 'always',
        refetchOnReconnect: true,
        retry: expect.any(Function),
      }),
    );

    expect(mockUseInstructors).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: 'always',
        refetchOnReconnect: true,
        retry: expect.any(Function),
      }),
    );

    view.unmount();
  });

  it('shows explicit API errors and retry affordances per dropdown', () => {
    mockUseSections.mockReturnValue(
      makeQueryState({
        isError: true,
        error: { response: { data: { error: { message: 'Sections lookup failed.' } } } },
      }),
    );

    mockUseInstructors.mockReturnValue(
      makeQueryState({
        isError: true,
        error: { response: { data: { error: { message: 'Instructors lookup failed.' } } } },
      }),
    );

    const view = renderProfilePage();

    expect(view.container.textContent).toContain('Sections lookup failed.');
    expect(view.container.textContent).toContain('Instructors lookup failed.');

    const retryButtons = Array.from(view.container.querySelectorAll('button')).filter(
      (button) => button.textContent?.trim() === 'Retry',
    );
    expect(retryButtons).toHaveLength(2);

    view.unmount();
  });

  it('shows guidance when no active sections or instructors exist', () => {
    const view = renderProfilePage();

    expect(view.container.textContent).toContain('No active sections are available');
    expect(view.container.textContent).toContain('No active instructors are available');

    view.unmount();
  });
});
