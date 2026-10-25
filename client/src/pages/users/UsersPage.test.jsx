import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent, screen, within } from '@testing-library/react';
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
let mockDeleteMutate;

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

vi.mock('@/components/users/CreateAcademicNodeDialog', () => ({
  default: () => null,
}));

describe('UsersPage Role Management (RBAC)', () => {
  let container;
  let root;

  beforeEach(() => {
    Element.prototype.hasPointerCapture ??= vi.fn(() => false);
    Element.prototype.setPointerCapture ??= vi.fn();
    Element.prototype.releasePointerCapture ??= vi.fn();
    HTMLElement.prototype.scrollIntoView ??= vi.fn();
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

    mockDeleteMutate = vi.fn();
    mockUseDeleteUser.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    });

    mockUseActivateUser.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderComponent = async () => {
    await act(async () => {
      root.render(<UsersPage />);
    });
  };

  const switchToRbacTab = async () => {
    const rbacTabTrigger = Array.from(container.querySelectorAll('[role="tab"], button')).find(
      (el) => el.textContent?.includes('Account Roles'),
    );
    if (rbacTabTrigger) {
      await act(async () => {
        fireEvent.mouseDown(rbacTabTrigger, { button: 0, ctrlKey: false });
      });
      expect(rbacTabTrigger.getAttribute('data-state')).toBe('active');
    }
  };

  it('restricts roleFilter dropdown options strictly to All Roles, Student, Instructor, and Faculty', async () => {
    await renderComponent();
    await switchToRbacTab();

    const roleFilter = screen.getByRole('combobox', { name: 'Filter users by role' });
    expect(roleFilter.textContent).toContain('All Roles');
    await act(async () => {
      fireEvent.pointerDown(roleFilter, {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
        pointerId: 1,
      });
    });

    const options = await screen.findAllByRole('option');
    const optionTexts = options.map((option) => option.textContent.trim());

    expect(optionTexts).toEqual(['Student', 'Instructor', 'Faculty']);
    expect(optionTexts).not.toContain('Adviser');
    expect(optionTexts).not.toContain('Panelist');
    expect(optionTexts).not.toContain('Chair');
    expect(optionTexts).not.toContain('Secretary');
  });

  it('restricts Create User role dropdown strictly to Student, Instructor, and Faculty', async () => {
    await renderComponent();
    await switchToRbacTab();

    // Click "New User" button
    const newUserBtn = screen.getByRole('button', { name: 'New User' });

    await act(async () => {
      fireEvent.click(newUserBtn);
    });

    const createRoleSelect = container.querySelector('#role');
    expect(createRoleSelect).not.toBeNull();
    await act(async () => {
      fireEvent.pointerDown(createRoleSelect, {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
        pointerId: 2,
      });
    });
    const options = await screen.findAllByRole('option');
    const optionTexts = options.map((option) => option.textContent.trim());

    expect(optionTexts).toEqual(['Student', 'Instructor', 'Faculty']);
  });

  it('normalizes legacy adviser and panelist user rows to display Faculty badge and select Faculty in dropdown', async () => {
    await renderComponent();
    await switchToRbacTab();

    // Check all accessible role controls, including normalized legacy faculty appointments.
    const rows = screen.getAllByTestId('user-row');
    const rowSelects = rows.map((row) => within(row).getByRole('combobox'));
    expect(rowSelects).toHaveLength(3);

    // Adviser and panelist records are both presented as Faculty; students remain Student.
    expect(rowSelects[0].textContent).toContain('Faculty');
    expect(rowSelects[1].textContent).toContain('Faculty');
    expect(rowSelects[2].textContent).toContain('Student');

    // Check badges
    const displayedRoles = rows
      .map((row) => within(row).getByTestId('user-role-badge').textContent.toLowerCase())
      .sort();
    expect(displayedRoles).toEqual(['faculty', 'faculty', 'student']);
  });

  it('requires confirmation before deactivating a user', async () => {
    await renderComponent();
    await switchToRbacTab();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deactivate Leon Mentor' }));
    });

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Are you sure you want to deactivate "Leon Mentor"?')).toBeTruthy();
    expect(mockDeleteMutate).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deactivate user' }));
    });

    expect(mockDeleteMutate).toHaveBeenCalledWith('user-adv-1');
  });
});
