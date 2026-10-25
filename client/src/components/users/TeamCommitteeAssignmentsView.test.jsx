import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamCommitteeAssignmentsView from './TeamCommitteeAssignmentsView';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
};
HTMLElement.prototype.scrollIntoView ??= function scrollIntoView() {};

const mockUseAcademicYears = vi.fn();
const mockUseSections = vi.fn();
const mockUseTeams = vi.fn();
const mockUseUsers = vi.fn();
const mockUseProject = vi.fn();
const mockAssignCommitteeMutate = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicYears: () => mockUseAcademicYears(),
  useSections: (...args) => mockUseSections(...args),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: (...args) => mockUseTeams(...args),
  useAssignCommittee: (options) => ({
    mutate: (payload) => {
      mockAssignCommitteeMutate(payload);
      options?.onSuccess?.({ message: 'Committee assigned successfully.' });
    },
    isPending: false,
  }),
  teamKeys: { all: ['teams'] },
}));

vi.mock('@/hooks/useUsers', () => ({
  useUsers: (...args) => mockUseUsers(...args),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProject: (...args) => mockUseProject(...args),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
  },
}));

const mockFacultyList = [
  {
    _id: 'fac-1',
    firstName: 'Glaiza Mae',
    lastName: 'Libe',
    email: 'glibe@buksu.edu.ph',
    role: 'adviser',
  },
  {
    _id: 'fac-2',
    firstName: 'Clara',
    lastName: 'Santos',
    email: 'csantos@buksu.edu.ph',
    role: 'faculty',
  },
  {
    _id: 'fac-3',
    firstName: 'Louie Jay',
    lastName: 'Labastida',
    email: 'llabastida@buksu.edu.ph',
    role: 'panelist',
  },
  {
    _id: 'fac-4',
    firstName: 'Raul',
    lastName: 'Lecaros',
    email: 'rlecaros@buksu.edu.ph',
    role: 'panelist',
  },
  {
    _id: 'ins-1',
    firstName: 'Casey',
    lastName: 'Instructor',
    email: 'cinstructor@buksu.edu.ph',
    role: 'instructor',
  },
];

const mockTeams = [
  {
    _id: 'team-1',
    name: 'Team Patrick',
    academicYear: '2025–2026',
    sectionId: { _id: 'sec-1', name: 'BSIT 3C' },
    leaderId: {
      _id: 'std-1',
      firstName: 'Patrick Josh',
      lastName: 'Añedez',
      email: 'patrick@example.com',
    },
    members: [
      { _id: 'std-1', firstName: 'Patrick Josh', lastName: 'Añedez', email: 'patrick@example.com' },
    ],
    projectId: 'proj-1',
    adviserId: 'fac-1',
    secretaryId: 'fac-2',
    panelistIds: ['fac-3'],
  },
  {
    _id: 'team-2',
    name: 'Team Alpha',
    academicYear: '2025–2026',
    sectionId: { _id: 'sec-1', name: 'BSIT 3C' },
    leaderId: { _id: 'std-2', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    members: [{ _id: 'std-2', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }],
    projectId: null,
    adviserId: null,
    secretaryId: null,
    panelistIds: [],
  },
];

describe('TeamCommitteeAssignmentsView UI/UX Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockUseAcademicYears.mockReturnValue({ data: ['2025–2026', '2024–2025'] });
    mockUseSections.mockReturnValue({
      data: [{ _id: 'sec-1', name: 'BSIT 3C', courseId: { code: 'IT' } }],
    });
    mockUseTeams.mockReturnValue({
      data: { teams: mockTeams, pagination: { total: 2 } },
      isLoading: false,
      isError: false,
    });
    mockUseUsers.mockReturnValue({
      data: { users: mockFacultyList },
      isLoading: false,
    });
    mockUseProject.mockReturnValue({
      data: {
        _id: 'proj-1',
        title: 'Project Workspace: Capstone Management System with Plagiarism Checker',
        titleStatus: 'approved',
      },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderComponent = async () => {
    await act(async () => {
      root.render(<TeamCommitteeAssignmentsView />);
    });
  };

  it('renders consolidated toolbar with search, filters, and quick team jump', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Committee Assignments');
    expect(container.textContent).toContain('Faculty Coordination');
    expect(container.querySelector('input[placeholder*="Search team name"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Filter by academic year"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Filter by section"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Filter by committee status"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Jump to team"]')).toBeTruthy();
    expect(mockUseUsers.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ role: 'faculty', isActive: true, page: 1, limit: 200 }),
    );

    // Quick team select option
    expect(container.textContent).toContain('Jump to:');
    expect(container.textContent).toContain('Team Patrick (1/4 Members)');
  });

  it('renders 2-column workspace with Team Profile and Faculty Committee Board', async () => {
    await renderComponent();

    // Left Column
    expect(container.textContent).toContain('Team Patrick');
    expect(container.textContent).toContain('Project Approved');
    expect(container.textContent).toContain('Proposed Title');
    expect(container.textContent).toContain(
      'Project Workspace: Capstone Management System with Plagiarism Checker',
    );
    expect(container.textContent).toContain('Enrolled Proponents (1 of 4)');
    expect(container.textContent).toContain('Patrick Josh Añedez');
    expect(container.textContent).toContain('Leader');

    // Right Column
    expect(container.textContent).toContain('Faculty Committee Board');
    expect(container.textContent).toContain('Capstone Adviser');
    expect(container.textContent).toContain('Committee Secretary');
    expect(container.textContent).toContain('Defense Panelists');
    expect(container.textContent).toContain('3 / 5 Appointed');
  });

  it('displays Lead / Chair designation on the first panelist slot', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Louie Jay Labastida');
    expect(container.textContent).toContain('Lead / Chair');
  });

  it('keeps course instructors out of committee appointment candidates', async () => {
    await renderComponent();

    await act(async () => container.querySelector('#panelist-add-combobox').click());

    expect(document.body.textContent).toContain('Raul Lecaros');
    expect(document.body.textContent).not.toContain('Casey Instructor');
  });

  it('renders elevated prerequisite alert when a team without an approved project is selected', async () => {
    // Select team-2 which has no project
    mockUseProject.mockReturnValue({ data: null });

    await act(async () => {
      root.render(<TeamCommitteeAssignmentsView />);
    });

    const select = container.querySelector('[aria-label="Jump to team"]');
    await act(async () => {
      select.click();
    });
    const teamOption = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent.includes('Team Alpha'),
    );
    expect(teamOption).toBeTruthy();
    await act(async () => teamOption.click());

    expect(container.textContent).toContain('Assignment Locked');
    expect(container.textContent).toContain('This team must submit an initial title proposal');
    expect(container.textContent).toContain('No Approved Project');
  });

  it('dispatches Save & Broadcast Assignments mutation when clicked', async () => {
    await renderComponent();

    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Save & Broadcast Assignments'),
    );
    expect(saveBtn).toBeTruthy();

    await act(async () => {
      saveBtn.click();
    });

    expect(mockAssignCommitteeMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team-1',
        adviserId: 'fac-1',
        secretaryId: 'fac-2',
        panelistIds: ['fac-3'],
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith('Committee assigned successfully.');
  });

  it('does not render Project Milestones & Deadlines card', async () => {
    await renderComponent();

    expect(container.textContent).not.toContain('Project Milestones & Deadlines');
    expect(container.textContent).not.toContain('Configure chapter submission cutoffs');
  });

  it('updates academic-year and section filters through shared Select controls', async () => {
    await renderComponent();

    await act(async () =>
      container.querySelector('[aria-label="Filter by academic year"]').click(),
    );
    const yearOption = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent.includes('2024–2025'),
    );
    expect(yearOption).toBeTruthy();
    await act(async () => yearOption.click());

    expect(mockUseSections).toHaveBeenLastCalledWith(
      { academicYear: '2024–2025' },
      { enabled: true },
    );
    expect(mockUseTeams.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ academicYear: '2024–2025', sectionId: undefined }),
    );

    await act(async () => container.querySelector('[aria-label="Filter by section"]').click());
    const sectionOption = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent.includes('BSIT-3C'),
    );
    expect(sectionOption).toBeTruthy();
    await act(async () => sectionOption.click());
    expect(mockUseTeams.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ academicYear: '2024–2025', sectionId: 'sec-1' }),
    );
  });

  it('filters committee completion status through the shared Select control', async () => {
    await renderComponent();

    await act(async () =>
      container.querySelector('[aria-label="Filter by committee status"]').click(),
    );
    const completeOption = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent.includes('Complete Committee'),
    );
    expect(completeOption).toBeTruthy();
    await act(async () => completeOption.click());

    expect(container.textContent).toContain('No Teams Found');
    expect(container.textContent).not.toContain('Team Patrick');
  });

  it('shows an empty state when filters produce no teams', async () => {
    mockUseTeams.mockReturnValue({
      data: { teams: [], pagination: { total: 0 } },
      isLoading: false,
      isError: false,
    });

    await renderComponent();

    expect(container.textContent).toContain('No Teams Found');
    expect(container.textContent).toContain('Adjust the filters above.');
  });

  it('shows a workspace-shaped skeleton while teams load', async () => {
    mockUseTeams.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    await renderComponent();

    expect(
      container.querySelector('[role="status"][aria-label="Loading committee assignments"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain('Loading team roster and committee assignments.');
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(5);
  });

  it('offers a retry action when teams fail to load', async () => {
    const refetch = vi.fn();
    mockUseTeams.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { data: { error: { message: 'Service unavailable.' } } } },
      refetch,
    });

    await renderComponent();

    expect(container.textContent).toContain('Service unavailable.');
    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('Retry'))
        .click();
    });
    expect(refetch).toHaveBeenCalledOnce();
  });
});
