import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBellPopover from './NotificationBellPopover';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { role: 'student' } }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    data: {
      notifications: [
        {
          _id: 'unread-1',
          type: 'chapter_submitted',
          title: 'Chapter submitted',
          message: 'Chapter 1 is ready for review.',
          createdAt: new Date().toISOString(),
          isRead: false,
          metadata: { chapter: 'chapter_1' },
        },
        {
          _id: 'read-1',
          type: 'team_created',
          title: 'Team created',
          message: 'Your team is ready.',
          createdAt: new Date().toISOString(),
          isRead: true,
          metadata: {},
        },
      ],
    },
    isLoading: false,
  }),
  useUnreadCount: () => ({ data: 1 }),
  useMarkAsRead: () => ({ mutate: mocks.markAsRead, isPending: false }),
  useMarkAllAsRead: () => ({ mutate: mocks.markAllAsRead, isPending: false }),
}));

function renderPopover() {
  return render(
    <MemoryRouter>
      <NotificationBellPopover />
    </MemoryRouter>,
  );
}

describe('NotificationBellPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters unread entries and marks one read without navigating', () => {
    renderPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    const dialog = screen.getByRole('dialog', { name: 'Notifications' });
    expect(within(dialog).getByRole('button', { name: /Chapter submitted/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Team created/ })).toBeInTheDocument();
    expect(dialog.querySelector('button button')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Unread (1)' }));
    expect(within(dialog).getByRole('button', { name: /Chapter submitted/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Team created/ })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as read' }));
    expect(mocks.markAsRead).toHaveBeenCalledWith('unread-1');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('marks an unread notification read before navigating to its student destination', () => {
    renderPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    fireEvent.click(screen.getByRole('button', { name: /Chapter submitted/ }));

    expect(mocks.markAsRead).toHaveBeenCalledWith('unread-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/project/submissions?chapter=chapter_1');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('marks all notifications read from the shared action button', () => {
    renderPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    fireEvent.click(screen.getByRole('button', { name: /Mark read/ }));

    expect(mocks.markAllAsRead).toHaveBeenCalledOnce();
  });
});
