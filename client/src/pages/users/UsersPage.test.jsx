import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ROLES } from '@cms/shared';
import UsersPage from './UsersPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockCurrentUser = {
  _id: 'instructor-1',
  role: ROLES.INSTRUCTOR,
  firstName: 'Instructor',
  lastName: 'Lead',
  email: 'instructor@buksu.edu.ph',
};

const mockUsersData = {
  users: [
    {
      _id: 'user-adv-1',
      firstName: 'Leon',
      lastName: 'Mentor',
      email: 'leon.mentor.buksu@gmail.com',
      role: 'adviser',
      isActive: true,
      isVerified: true,
    },
    {
      _id: 'user-pan-1',
      firstName: 'Steven',
      lastName: 'Bautista',
      email: 'steven.bautista@buksu.edu.ph',
      role: 'panelist',
      isActive: true,
      isVerified: true,
    },
    {
      _id: 'user-stu-1',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan@student.buksu.edu.ph',
      role: 'student',
      isActive: true,
      isVerified: true,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 3,
    pages: 1,
  },
};

const mockUseUsers = vi.fn();
const mockUseCreateUser = vi.fn();
const mockUseChangeRole = vi.fn();
const mockUseDeleteUser = vi.fn();
const mockUseActivateUser = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => {
    const state = { user: mockCurrentUser };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/hooks/useUsers', () => ({
  useUsers: (...args) => mockUseUsers(...args),
  useCreateUser: (...args) => mockUseCreateUser(...args),
  useChangeRole: (...args) => mockUseChangeRole(...args),
  useDeleteUser: (...args) => mockUseDeleteUser(...args),
  useActivateUser: (...args) => mockUseActivateUser(...args),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicHierarchy: () => ({ data: [], isLoading: false }),
  useAcademicYears: () => ({ data: [] }),
  useCourses: () => ({ data: [] }),
  useSections: () => ({ data: [] }),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/users/TeamCommitteeAssignmentsView', () => ({
  default: () => <div data-testid="committee-view" />,
}));

vi.mock('@/components/users/CreateAcademicNodeDialog', () => ({
  default: () => null,
}));

describe('UsersPage Role Management (RBAC)', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockUseUsers.mockReturnValue({
      data: mockUsersData,
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseCreateUser.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });

    mockUseChangeRole.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    mockUseDeleteUser.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    mockUseActivateUser.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  const renderComponent = async () => {
    await act(async () => {
      root.render(<UsersPage />);
    });
  };

  const switchToRbacTab = async () => {
    const rbacTabTrigger = Array.from(container.querySelectorAll('[role="tab"], button')).find(
      (el) => el.textContent?.includes('Role Management (RBAC)'),
    );
    if (rbacTabTrigger) {
      await act(async () => {
        rbacTabTrigger.click();
      });
    }
  };

  it('restricts roleFilter dropdown options strictly to All Roles, Student, Instructor, and Faculty', async () => {
    await renderComponent();
    await switchToRbacTab();

    const roleFilter = container.querySelector('#roleFilter');
    expect(roleFilter).not.toBeNull();

    const optionValues = Array.from(roleFilter.options).map((o) => o.value);
    const optionTexts = Array.from(roleFilter.options).map((o) => o.textContent.trim());

    expect(optionValues).toEqual(['', 'student', 'instructor', 'faculty']);
    expect(optionTexts).toEqual(['All Roles', 'Student', 'Instructor', 'Faculty']);

    // Ensure legacy roles are NOT present
    expect(optionValues).not.toContain('adviser');
    expect(optionValues).not.toContain('panelist');
    expect(optionValues).not.toContain('chair');
    expect(optionValues).not.toContain('secretary');
  });

  it('restricts Create User role dropdown strictly to Student, Instructor, and Faculty', async () => {
    await renderComponent();
    await switchToRbacTab();

    // Click "New User" button
    const newUserBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('New User'),
    );
    expect(newUserBtn).toBeDefined();

    await act(async () => {
      newUserBtn.click();
    });

    const createRoleSelect = container.querySelector('#role');
    expect(createRoleSelect).not.toBeNull();

    const optionValues = Array.from(createRoleSelect.options).map((o) => o.value);
    const optionTexts = Array.from(createRoleSelect.options).map((o) => o.textContent.trim());

    expect(optionValues).toEqual(['student', 'instructor', 'faculty']);
    expect(optionTexts).toEqual(['Student', 'Instructor', 'Faculty']);
  });

  it('normalizes legacy adviser and panelist user rows to display Faculty badge and select Faculty in dropdown', async () => {
    await renderComponent();
    await switchToRbacTab();

    // Check all row selects
    const rowSelects = container.querySelectorAll('.user-row-card select');
    expect(rowSelects.length).toBe(3);

    // First user was seeded with role: 'adviser' (Leon Mentor)
    expect(rowSelects[0].value).toBe('faculty');
    const firstSelectOptions = Array.from(rowSelects[0].options).map((o) => o.value);
    expect(firstSelectOptions).toEqual(['student', 'instructor', 'faculty']);

    // Second user was seeded with role: 'panelist' (Steven Bautista)
    expect(rowSelects[1].value).toBe('faculty');

    // Third user was student
    expect(rowSelects[2].value).toBe('student');

    // Check badges
    const badges = Array.from(
      container.querySelectorAll(
        '.user-row-card [class*="Badge"], .user-row-card div, .user-row-card span',
      ),
    ).map((el) => el.textContent.trim().toLowerCase());

    expect(badges).toContain('faculty');
    expect(badges).not.toContain('adviser');
    expect(badges).not.toContain('panelist');
  });
});
