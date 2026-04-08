import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ROLES } from '@cms/shared';
import NotificationsPage from './NotificationsPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockUseAuthStore = vi.fn();
const mockUseNotifications = vi.fn();
const mockUseMarkAsRead = vi.fn();
const mockUseMarkAllAsRead = vi.fn();
const mockUseDeleteNotification = vi.fn();
const mockUseClearAllNotifications = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: (...args) => mockUseNotifications(...args),
  useMarkAsRead: (...args) => mockUseMarkAsRead(...args),
  useMarkAllAsRead: (...args) => mockUseMarkAllAsRead(...args),
  useDeleteNotification: (...args) => mockUseDeleteNotification(...args),
  useClearAllNotifications: (...args) => mockUseClearAllNotifications(...args),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseNotifications = [
  {
    _id: 'n-1',
    type: 'welcome',
    title: 'Welcome',
    message: 'Welcome message',
    isRead: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata: {},
  },
  {
    _id: 'n-2',
    type: 'system',
    title: 'System update',
    message: 'System message',
    isRead: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    metadata: {},
  },
];

const makeMutationState = (mutateImpl = vi.fn()) => ({
  isPending: false,
  mutate: mutateImpl,
});

const renderPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  act(() => {
    root.render(<NotificationsPage />);
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

describe('NotificationsPage behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      user: {
        _id: 'student-1',
        role: ROLES.STUDENT,
        firstName: 'Test',
        lastName: 'User',
      },
      fetchUser: vi.fn(),
    });

    mockUseNotifications.mockReturnValue({
      data: {
        notifications: baseNotifications,
        unreadCount: 1,
        pagination: { totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    });

    mockUseMarkAsRead.mockReturnValue(makeMutationState());
    mockUseMarkAllAsRead.mockReturnValue(makeMutationState());
    mockUseDeleteNotification.mockReturnValue(makeMutationState());
    mockUseClearAllNotifications.mockReturnValue(makeMutationState());
  });

  it('keeps clear-all dialog open on pending/error and closes only on success', () => {
    const clearAllMutate = vi.fn();
    mockUseClearAllNotifications.mockReturnValue(makeMutationState(clearAllMutate));

    const view = renderPage();

    const clearAllButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Clear all'),
    );
    expect(clearAllButton).toBeTruthy();

    act(() => {
      clearAllButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(view.container.querySelector('[role="dialog"]')).toBeTruthy();

    const confirmButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirm'),
    );
    expect(confirmButton).toBeTruthy();

    act(() => {
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(clearAllMutate).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[role="dialog"]')).toBeTruthy();

    const firstOptions = clearAllMutate.mock.calls[0][1];
    act(() => {
      firstOptions.onError();
    });

    expect(view.container.textContent).toContain(
      'Failed to clear notifications. Please try again.',
    );
    expect(view.container.querySelector('[role="dialog"]')).toBeTruthy();

    act(() => {
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const secondOptions = clearAllMutate.mock.calls[1][1];
    act(() => {
      secondOptions.onSuccess();
    });

    expect(view.container.querySelector('[role="dialog"]')).toBeFalsy();

    view.unmount();
  });

  it('does not trigger row keyboard open when keyboard event starts on inner controls', () => {
    const view = renderPage();

    const rows = Array.from(view.container.querySelectorAll('[role="link"]'));
    expect(rows.length).toBeGreaterThan(0);

    act(() => {
      rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    mockNavigate.mockClear();

    const deleteButtons = Array.from(
      view.container.querySelectorAll('button[aria-label="Delete notification"]'),
    );
    expect(deleteButtons.length).toBeGreaterThan(0);

    act(() => {
      deleteButtons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    view.unmount();
  });

  it('renders Unread marker only for unread notifications', () => {
    const view = renderPage();

    const unreadMarkers = Array.from(view.container.querySelectorAll('span')).filter(
      (el) => el.textContent === 'Unread',
    );

    // baseNotifications has one unread and one read item.
    expect(unreadMarkers).toHaveLength(1);

    view.unmount();
  });
});
