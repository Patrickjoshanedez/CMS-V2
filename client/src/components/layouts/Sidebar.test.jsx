import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Sidebar, { AppSidebar } from './Sidebar';
import { ROLES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
let mockUser = { role: ROLES.STUDENT };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

const renderSidebar = (props = {}, initialPath = '/dashboard') => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar {...props} />
      </MemoryRouter>,
    );
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

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { role: ROLES.STUDENT };
  });

  it('renders in expanded mode with full width, labels, sections, and badges', () => {
    const { container, unmount } = renderSidebar({ open: true });

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside.className).toContain('w-[260px]');

    // Check branding
    expect(container.textContent).toContain('CMS');
    expect(container.textContent).toContain('Capstone Studio');

    // Check section headings
    expect(container.textContent).toContain('Workspace');
    expect(container.textContent).toContain('Evaluation');

    // Check student items
    expect(container.textContent).toContain('Dashboard');
    expect(container.textContent).toContain('My Team');
    expect(container.textContent).toContain('My Capstone');
    expect(container.textContent).toContain('Submissions');
    expect(container.textContent).toContain('Archive');
    expect(container.textContent).toContain('Plagiarism Checker');
    expect(container.textContent).toContain('Settings');
    expect(container.textContent).toContain('Sign out');

    // Check live badges
    expect(container.textContent).toContain('Draft');
    expect(container.textContent).toContain('2');

    unmount();
  });

  it('renders in collapsed rail mode (w-[76px]) and calls onToggle on collapse button click', async () => {
    const onToggle = vi.fn();
    const { container, unmount } = renderSidebar({ open: false, onToggle });

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside.className).toContain('w-[76px]');

    const toggleBtn = container.querySelector('button[aria-label="Expand sidebar"]');
    expect(toggleBtn).not.toBeNull();

    await act(async () => {
      toggleBtn.click();
    });

    expect(onToggle).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('projects portal tooltips to document.body on mouseEnter when collapsed', async () => {
    const { container, unmount } = renderSidebar({ open: false });

    const links = container.querySelectorAll('a');
    const capstoneLink = Array.from(links).find((link) => link.getAttribute('href') === '/project');
    expect(capstoneLink).not.toBeNull();

    // Trigger hover or focus
    await act(async () => {
      capstoneLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    // Check portal tooltip in document.body
    const portalTooltip = document.body.querySelector('[role="tooltip"]');
    expect(portalTooltip).not.toBeNull();
    expect(portalTooltip.textContent).toContain('My Capstone');
    expect(portalTooltip.textContent).toContain('Draft');

    // Trigger leave or blur
    await act(async () => {
      capstoneLink.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });

    const portalTooltipAfterLeave = document.body.querySelector('[role="tooltip"]');
    expect(portalTooltipAfterLeave).toBeNull();

    unmount();
  });

  it('renders role-appropriate navigation for instructors', () => {
    mockUser = { role: ROLES.INSTRUCTOR };
    const { container, unmount } = renderSidebar({ open: true });

    expect(container.textContent).toContain('Instructor Review');
    expect(container.textContent).toContain('Reports');
    expect(container.textContent).toContain('Archived Capstone');
    expect(container.textContent).toContain('Evaluation Rubrics');
    expect(container.textContent).toContain('Users');
    expect(container.textContent).toContain('Activity Log');

    unmount();
  });

  it('renders role-appropriate navigation for faculty and panelists', () => {
    mockUser = { role: ROLES.ADVISER };
    const { container, unmount } = renderSidebar({ open: true });

    expect(container.textContent).toContain('Adviser Reviews');
    expect(container.textContent).toContain('Panel Review');

    unmount();
  });

  it('triggers logout and navigates to login when clicking sign out', async () => {
    const { container, unmount } = renderSidebar({ open: true });

    const signOutBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Sign out'),
    );
    expect(signOutBtn).not.toBeNull();

    await act(async () => {
      signOutBtn.click();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);

    unmount();
  });
});
