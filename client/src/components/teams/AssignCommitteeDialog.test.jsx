import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AssignCommitteeDialog } from './AssignCommitteeDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseUsers = vi.fn();
const mockUseAssignCommittee = vi.fn();

vi.mock('@/hooks/useUsers', () => ({
  useUsers: (...args) => mockUseUsers(...args),
}));

vi.mock('@/hooks/useTeams', () => ({
  useAssignCommittee: (...args) => mockUseAssignCommittee(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AssignCommitteeDialog', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockUseUsers.mockReturnValue({
      data: {
        users: [
          {
            _id: 'f-1',
            firstName: 'Dr. Jane',
            lastName: 'Doe',
            role: 'instructor',
            email: 'jane@buksu.edu.ph',
          },
          {
            _id: 'f-2',
            firstName: 'Prof. John',
            lastName: 'Smith',
            role: 'adviser',
            email: 'john@buksu.edu.ph',
          },
        ],
      },
      isLoading: false,
    });

    mockUseAssignCommittee.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  const renderDialog = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      teamId: 't-123',
      teamName: 'Team Patrick',
      ...props,
    };

    act(() => {
      root.render(<AssignCommitteeDialog {...defaultProps} />);
    });

    return {
      props: defaultProps,
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders into document.body portal with header, team badge, and form elements', () => {
    const { unmount } = renderDialog();

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(document.body.textContent).toContain('Assign Faculty Committee');
    expect(document.body.textContent).toContain('Team Patrick');
    expect(document.body.textContent).toContain('Capstone Adviser');
    expect(document.body.textContent).toContain('Committee Secretary');
    expect(document.body.textContent).toContain('Defense Panelists');

    unmount();
  });

  it('does not render dialog into DOM when open is false', () => {
    const { unmount } = renderDialog({ open: false });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();

    unmount();
  });

  it('calls onOpenChange(false) when Escape key is pressed', () => {
    const onOpenChange = vi.fn();
    const { unmount } = renderDialog({ onOpenChange });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);

    unmount();
  });

  it('locks body scroll when open and restores it when unmounted or closed', () => {
    const initialOverflow = document.body.style.overflow;
    const { unmount } = renderDialog({ open: true });

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe(initialOverflow);
  });
});
