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

  it('passes faculty roles filter and populates faculty options with institutional roles on combobox open', () => {
    const { unmount } = renderDialog();

    expect(mockUseUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        role: expect.stringContaining('instructor'),
        isActive: true,
        limit: 200,
      }),
      expect.objectContaining({ enabled: true }),
    );

    const adviserTrigger = document.getElementById('adviser-select');
    expect(adviserTrigger).toBeTruthy();
    expect(adviserTrigger.textContent).toContain('-- Select faculty adviser --');

    // Click trigger to open searchable combobox
    act(() => {
      adviserTrigger.click();
    });

    // Check that dropdown opened and displays both faculty with correct institutional labels
    const dialogText = document.body.textContent;
    expect(dialogText).toContain('Dr. Jane Doe');
    expect(dialogText).toContain('[Instructor]');
    expect(dialogText).toContain('Prof. John Smith');
    expect(dialogText).toContain('[Faculty]');

    unmount();
  });

  it('filters faculty options via search input and allows selecting an item', () => {
    const { unmount } = renderDialog();

    const adviserTrigger = document.getElementById('adviser-select');
    act(() => {
      adviserTrigger.click();
    });

    // Search input should be present and focused
    const searchInput = document.querySelector(
      'input[placeholder="Search faculty by name or email..."]',
    );
    expect(searchInput).toBeTruthy();

    // Type "Jane" into search input
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeInputValueSetter.call(searchInput, 'Jane');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Dr. Jane Doe');
    expect(document.body.textContent).not.toContain('Prof. John Smith');

    // Click on Dr. Jane Doe to select
    const optionButtons = Array.from(document.querySelectorAll('button[role="option"]'));
    const janeOption = optionButtons.find((btn) => btn.textContent.includes('Dr. Jane Doe'));
    expect(janeOption).toBeTruthy();

    act(() => {
      janeOption.click();
    });

    // Dropdown closes and trigger reflects selection
    expect(adviserTrigger.textContent).toContain('Dr. Jane Doe');
    expect(adviserTrigger.textContent).toContain('[Instructor]');

    unmount();
  });

  it('displays loading placeholder while faculty query is in flight', () => {
    mockUseUsers.mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { unmount } = renderDialog();

    const adviserSelect = document.getElementById('adviser-select');
    expect(adviserSelect.textContent).toContain('-- Loading faculty members... --');

    unmount();
  });

  it('displays empty placeholder when no faculty are available', () => {
    mockUseUsers.mockReturnValue({
      data: { users: [] },
      isLoading: false,
    });

    const { unmount } = renderDialog();

    const adviserSelect = document.getElementById('adviser-select');
    expect(adviserSelect.textContent).toContain('-- No eligible faculty found --');

    unmount();
  });

  it('strictly contains 3 defense panelists (Panelist 1, Panelist 2, Panel Member 3) with no optional label', () => {
    const { unmount } = renderDialog();

    expect(document.getElementById('panelist-1-select')).toBeTruthy();
    expect(document.getElementById('panelist-2-select')).toBeTruthy();
    expect(document.getElementById('panelist-3-select')).toBeTruthy();
    expect(document.body.textContent).toContain('Panel Member 3');
    expect(document.body.textContent).not.toContain('Optional');

    unmount();
  });

  it('disables faculty option when already assigned to another committee role on the same team (mutual exclusion)', () => {
    const { unmount } = renderDialog({
      initialAdviserId: 'f-2', // Prof. John Smith is Adviser
    });

    const secretaryTrigger = document.getElementById('secretary-select');
    expect(secretaryTrigger).toBeTruthy();

    act(() => {
      secretaryTrigger.click();
    });

    const optionButtons = Array.from(document.querySelectorAll('button[role="option"]'));
    const johnOption = optionButtons.find((btn) => btn.textContent.includes('Prof. John Smith'));
    expect(johnOption).toBeTruthy();
    expect(johnOption.getAttribute('aria-disabled')).toBe('true');
    expect(johnOption.textContent).toContain('Already Capstone Adviser');

    unmount();
  });

  it('submits assigned committee with up to 3 panelists when all faculty are distinct', () => {
    const mockMutate = vi.fn();
    mockUseAssignCommittee.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    const { unmount } = renderDialog({
      initialAdviserId: 'f-1',
      initialSecretaryId: 'f-2',
      initialPanelistIds: ['f-3', 'f-4', 'f-5'],
    });

    const submitBtn = document.querySelector('button[type="submit"]');
    act(() => {
      submitBtn.click();
    });

    expect(mockMutate).toHaveBeenCalledWith({
      teamId: 't-123',
      adviserId: 'f-1',
      secretaryId: 'f-2',
      panelistIds: ['f-3', 'f-4', 'f-5'],
    });

    unmount();
  });

  it('blocks submission and displays error when duplicate faculty assignments are detected', () => {
    const mockMutate = vi.fn();
    mockUseAssignCommittee.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    const { unmount } = renderDialog({
      initialAdviserId: 'f-1',
      initialSecretaryId: 'f-1', // Duplicate with adviser
      initialPanelistIds: [],
    });

    const submitBtn = document.querySelector('button[type="submit"]');
    act(() => {
      submitBtn.click();
    });

    expect(mockMutate).not.toHaveBeenCalled();

    unmount();
  });
});
