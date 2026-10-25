import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

const authState = { user: { role: 'student' } };

vi.mock('@/hooks/useSocket', () => ({ useSocket: vi.fn() }));
vi.mock('@/hooks/useNavigationSkeleton', () => ({
  useNavigationSkeleton: () => ({ isSkeleton: false }),
}));
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => selector(authState),
}));
vi.mock('./Sidebar', () => ({
  default: ({ onToggle }) => (
    <nav aria-label="Mock sidebar">
      <button type="button" onClick={onToggle}>
        Close mobile navigation
      </button>
    </nav>
  ),
}));
vi.mock('./Header', () => ({
  default: ({ onMenuClick }) => (
    <header>
      <button type="button" aria-label="Open sidebar" onClick={onMenuClick}>
        Menu
      </button>
    </header>
  ),
}));
vi.mock('./AnnouncementBanner', () => ({ default: () => null }));
vi.mock('@/components/ui/PageSkeleton', () => ({ default: () => <div>Loading page</div> }));

describe('DashboardLayout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  });

  it('provides a skip link and a focus-managed mobile navigation sheet', async () => {
    render(
      <MemoryRouter>
        <DashboardLayout>
          <h1>Dashboard content</h1>
        </DashboardLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');

    const menuButton = screen.getByRole('button', { name: 'Open sidebar' });
    fireEvent.click(menuButton);

    const navigationSheet = await screen.findByRole('dialog', { name: 'Main navigation' });
    fireEvent.keyDown(navigationSheet, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Main navigation' })).not.toBeInTheDocument();
    });
    expect(menuButton).toHaveFocus();
  });
});
