import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FacultyCommitteeCard, { getWorkloadStatus } from './FacultyCommitteeCard';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockListUsers = vi.fn();
const mockAssignAdviser = vi.fn();
const mockAssignSecretary = vi.fn();
const mockRemoveSecretary = vi.fn();
const mockAssignPanelist = vi.fn();
const mockRemovePanelist = vi.fn();

vi.mock('@/services/authService', () => ({
  userService: {
    listUsers: (...args) => mockListUsers(...args),
  },
}));

vi.mock('@/hooks/useProjects', () => ({
  useAssignAdviser: (opts) => ({
    mutate: (payload) => {
      mockAssignAdviser(payload);
      if (opts?.onSuccess) opts.onSuccess();
    },
    isPending: false,
  }),
  useAssignSecretary: (opts) => ({
    mutate: (payload) => {
      mockAssignSecretary(payload);
      if (opts?.onSuccess) opts.onSuccess();
    },
    isPending: false,
  }),
  useRemoveSecretary: (opts) => ({
    mutate: (payload) => {
      mockRemoveSecretary(payload);
      if (opts?.onSuccess) opts.onSuccess();
    },
    isPending: false,
  }),
  useAssignPanelist: (opts) => ({
    mutate: (payload) => {
      mockAssignPanelist(payload);
      if (opts?.onSuccess) opts.onSuccess();
    },
    isPending: false,
  }),
  useRemovePanelist: (opts) => ({
    mutate: (payload) => {
      mockRemovePanelist(payload);
      if (opts?.onSuccess) opts.onSuccess();
    },
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('FacultyCommitteeCard', () => {
  let container;
  let root;

  const mockProject = {
    _id: 'proj-101',
    title: 'AI Smart Agriculture Ecosystem',
    adviserId: {
      _id: 'adv-1',
      firstName: 'Steven Joe',
      lastName: 'Bautista',
      email: 'sjbautista@buksu.edu.ph',
    },
    adviserAdvisedCount: 2,
    secretaryId: {
      _id: 'sec-1',
      firstName: 'Joan Marie',
      lastName: 'Panes',
      email: 'joanpanes1@buksu.edu.ph',
    },
    secretaryAdvisedCount: 2,
    panelistIds: [
      {
        _id: 'pan-1',
        firstName: 'Leon',
        lastName: 'Mentor',
        email: 'lmentor@buksu.edu.ph',
        role: 'chair',
      },
      {
        _id: 'pan-2',
        firstName: 'Rhea',
        lastName: 'Villanueva',
        email: 'rvillanueva@buksu.edu.ph',
        role: 'member',
      },
      {
        _id: 'pan-3',
        firstName: 'Mark',
        lastName: 'Tan',
        email: 'mtan@buksu.edu.ph',
        role: 'member',
      },
    ],
    teamId: {
      _id: 'team-1',
      name: 'Team AgroSense',
      leaderId: 'user-1',
      members: [
        {
          _id: 'm-1',
          userId: {
            _id: 'user-1',
            firstName: 'Megumi',
            lastName: 'Fushiguro',
            email: 'megumi@example.com',
          },
          role: 'leader',
        },
        {
          _id: 'm-2',
          userId: {
            _id: 'user-2',
            firstName: 'Yuji',
            lastName: 'Itadori',
            email: 'yuji@example.com',
          },
          role: 'frontend',
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { _id: 'fac-1', firstName: 'Alan', lastName: 'Turing', email: 'aturing@buksu.edu.ph' },
          { _id: 'fac-2', firstName: 'Grace', lastName: 'Hopper', email: 'ghopper@buksu.edu.ph' },
        ],
      },
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  const renderComponent = (project = mockProject, canManage = false) =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <FacultyCommitteeCard project={project} canManage={canManage} />
      </QueryClientProvider>,
    );

  it('renders complete faculty committee with adviser, chair, panelists, and FRAD2 roster', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Faculty Committee');
    expect(container.textContent).toContain('Complete');
    expect(container.textContent).toContain('Steven Joe Bautista');
    expect(container.textContent).toContain('sjbautista@buksu.edu.ph');
    expect(container.textContent).toContain('Optimal Workload');

    // Secretary
    expect(container.textContent).toContain('Committee Secretary');
    expect(container.textContent).toContain('Joan Marie Panes');
    expect(container.textContent).toContain('joanpanes1@buksu.edu.ph');

    // Panelists
    expect(container.textContent).toContain('Defense Panel (3/3)');
    expect(container.textContent).toContain('Leon Mentor');
    expect(container.textContent).toContain('Chair');
    expect(container.textContent).toContain('Rhea Villanueva');
    expect(container.textContent).toContain('Mark Tan');

    // Proponent Roster
    expect(container.textContent).toContain('Proponent Roster (FRAD2)');
    expect(container.textContent).toContain('Megumi Fushiguro');
    expect(container.textContent).toContain('Project Lead & Systems Analyst');
    expect(container.textContent).toContain('Yuji Itadori');
    expect(container.textContent).toContain('Frontend & UI/UX Developer');
  });

  it('displays incomplete committee warning when adviser, secretary, or panelists are missing', async () => {
    const incompleteProject = {
      ...mockProject,
      adviserId: null,
      secretaryId: null,
      panelistIds: [{ _id: 'pan-1', firstName: 'Leon', lastName: 'Mentor' }],
    };

    await act(async () => {
      renderComponent(incompleteProject);
    });

    expect(container.textContent).toContain('Incomplete (1/3)');
    expect(container.textContent).toContain('Adviser appointment pending');
    expect(container.textContent).toContain('Secretary appointment pending');
  });

  it('calculates workload status accurately', () => {
    expect(getWorkloadStatus(1).label).toBe('Optimal Workload');
    expect(getWorkloadStatus(2).label).toBe('Optimal Workload');
    expect(getWorkloadStatus(4).label).toBe('Near Capacity');
    expect(getWorkloadStatus(6).label).toBe('Overloaded');
  });

  it('shows search comboboxes to appoint committee when canManage is true', async () => {
    const incompleteProject = {
      ...mockProject,
      panelistIds: [{ _id: 'pan-1', firstName: 'Leon', lastName: 'Mentor' }],
    };

    await act(async () => {
      renderComponent(incompleteProject, true);
    });

    expect(container.querySelector('#adviser-search-combobox')).toBeTruthy();
    expect(container.querySelector('#secretary-search-combobox')).toBeTruthy();
    expect(container.querySelector('#panelist-search-combobox')).toBeTruthy();
  });

  it('allows unassigning secretary when canManage is true', async () => {
    await act(async () => {
      renderComponent(mockProject, true);
    });

    const unassignSecBtn = container.querySelector('button[title="Unassign Secretary"]');
    expect(unassignSecBtn).toBeTruthy();

    await act(async () => {
      unassignSecBtn.click();
    });

    expect(mockRemoveSecretary).toHaveBeenCalledWith({ projectId: 'proj-101' });
  });
});
