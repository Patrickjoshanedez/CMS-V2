import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AssignCommitteeDialog } from './AssignCommitteeDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseUsers = vi.fn();
const mockUseAssignCommittee = vi.fn();
const mockUseTeamById = vi.fn();

vi.mock('@/hooks/useUsers', () => ({
  useUsers: (...args) => mockUseUsers(...args),
}));

vi.mock('@/hooks/useTeams', () => ({
  useAssignCommittee: (...args) => mockUseAssignCommittee(...args),
  useTeamById: (...args) => mockUseTeamById(...args),
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

    mockUseTeamById.mockReturnValue({
      data: null,
      isLoading: false,
    });

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
            role: 'faculty',
            email: 'john@buksu.edu.ph',
          },
          {
            _id: 'f-3',
            firstName: 'Dr. Alan',
            lastName: 'Turing',
            role: 'adviser',
            email: 'alan@buksu.edu.ph',
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

  it('renders into document.body portal with header, progress ribbon, team badge, and form elements', () => {
    const { unmount } = renderDialog();

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(document.body.textContent).toContain('Assign Faculty Committee');
    expect(document.body.textContent).toContain('Team Patrick');
    expect(document.body.textContent).toContain('Committee Slots: 0 of 5 Filled');
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

  it('passes faculty roles filter and strictly excludes instructors from candidate options', () => {
    const { unmount } = renderDialog();

    expect(mockUseUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'faculty',
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

    // Check that dropdown opened and displays ONLY faculty (instructors filtered out)
    const dialogText = document.body.textContent;
    expect(dialogText).not.toContain('Dr. Jane Doe');
    expect(dialogText).not.toContain('[Instructor]');
    expect(dialogText).toContain('Prof. John Smith');
    expect(dialogText).toContain('Dr. Alan Turing');
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

    // Type "John" into search input
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeInputValueSetter.call(searchInput, 'John');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Prof. John Smith');
    expect(document.body.textContent).not.toContain('Dr. Alan Turing');

    // Click on Prof. John Smith to select
    const optionButtons = Array.from(document.querySelectorAll('button[role="option"]'));
    const johnOption = optionButtons.find((btn) => btn.textContent.includes('Prof. John Smith'));
    expect(johnOption).toBeTruthy();

    act(() => {
      johnOption.click();
    });

    // Dropdown closes and trigger reflects selection
    expect(adviserTrigger.textContent).toContain('Prof. John Smith');
    expect(adviserTrigger.textContent).toContain('[Faculty]');

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
      initialAdviserId: 'f-2',
      initialSecretaryId: 'f-3',
      initialPanelistIds: ['f-4', 'f-5', 'f-6'],
    });

    const submitBtn = document.querySelector('button[type="submit"]');
    act(() => {
      submitBtn.click();
    });

    expect(mockMutate).toHaveBeenCalledWith({
      teamId: 't-123',
      adviserId: 'f-2',
      secretaryId: 'f-3',
      panelistIds: ['f-4', 'f-5', 'f-6'],
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
      initialAdviserId: 'f-2',
      initialSecretaryId: 'f-2', // Duplicate with adviser
      initialPanelistIds: [],
    });

    const submitBtn = document.querySelector('button[type="submit"]');
    act(() => {
      submitBtn.click();
    });

    expect(mockMutate).not.toHaveBeenCalled();

    unmount();
  });

  it('pre-populates existing committee assignments loaded from useTeamById', () => {
    mockUseTeamById.mockReturnValue({
      data: {
        _id: 't-123',
        adviserId: { _id: 'f-2' },
        secretaryId: { _id: 'f-3' },
        panelistIds: [{ _id: 'f-4' }, { _id: 'f-5' }, { _id: 'f-6' }],
      },
      isLoading: false,
    });

    const { unmount } = renderDialog();

    expect(document.body.textContent).toContain('Committee Slots: 5 of 5 Filled');
    expect(document.body.textContent).toContain('Complete');

    unmount();
  });
});
