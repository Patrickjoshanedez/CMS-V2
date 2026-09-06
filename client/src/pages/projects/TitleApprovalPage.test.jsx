import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TitleApprovalPage from './TitleApprovalPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockGenerateProposalDeck = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

let mockProjectData = null;
let mockTeamData = null;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { _id: 'student-1', firstName: 'John', lastName: 'Doe', role: 'student' },
  }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useMyProject: () => ({
    data: mockProjectData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useMyTeam: () => ({
    data: mockTeamData,
    isLoading: false,
  }),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/services/authService', () => ({
  projectService: {
    generateProposalDeck: (...args) => mockGenerateProposalDeck(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
  },
}));

describe('TitleApprovalPage', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockProjectData = {
      _id: 'project-123',
      title: 'Smart Campus Emergency Dispatch System',
      titleStatus: 'submitted',
      academicYear: '2024-2025',
      titleProposals: [
        'Smart Campus Emergency Dispatch System',
        'AI Curriculum Analytics Platform',
      ],
      titleProposalMetadata: [
        {
          title: 'Smart Campus Emergency Dispatch System',
          description:
            'problemStatement: Current manual dispatch creates delays.\n\nproposedSolution: Automated IoT dispatch framework.\n\nuniqueContribution: Campus mesh network integration.\n\ntargetUsers: Campus clinic and security.\n\nexpectedImpact: 60% faster emergency response.',
          capstoneType: ['Software Engineering & Web Applications'],
          sdgTags: ['SDG 9: Industry, Innovation & Infrastructure'],
        },
        {
          title: 'AI Curriculum Analytics Platform',
          description: 'Problem Statement: Curriculum audits are slow.',
          capstoneType: ['Artificial Intelligence & Machine Learning'],
          sdgTags: ['SDG 4: Quality Education'],
        },
      ],
      titleProposalComments: [
        {
          proposalIndex: 0,
          comments: [
            {
              name: 'Dr. Santos',
              text: 'Ensure campus mesh radios comply with NTC guidelines.',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
      adviserId: { firstName: 'Maria', lastName: 'Clara', email: 'mclara@buksu.edu.ph' },
      panelistIds: [
        { firstName: 'Jose', lastName: 'Rizal', email: 'jrizal@buksu.edu.ph' },
        { firstName: 'Andres', lastName: 'Bonifacio', email: 'abonifacio@buksu.edu.ph' },
      ],
    };

    mockTeamData = {
      _id: 'team-1',
      name: 'Team Alpha',
      members: [{ user: { firstName: 'John', lastName: 'Doe' } }],
    };
  });

  it('renders title proposals and committee status stepper', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    expect(container.textContent).toContain('Capstone Title Proposals & Committee Approval');
    expect(container.textContent).toContain('Candidate Capstone Titles Proposed by Team (2)');
    expect(container.textContent).toContain('Smart Campus Emergency Dispatch System');
    expect(container.textContent).toContain('AI Curriculum Analytics Platform');
    expect(container.textContent).toContain('Under Committee Review');
  });

  it('reveals proposal blueprint details and committee comments for Proposal 1', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    expect(container.textContent).toContain('Problem Statement & Literature Gap');
    expect(container.textContent).toContain('Current manual dispatch creates delays.');
    expect(container.textContent).toContain('Automated IoT dispatch framework.');
    expect(container.textContent).toContain(
      'Ensure campus mesh radios comply with NTC guidelines.',
    );
    expect(container.textContent).toContain('Dr. Santos');
  });

  it('toggles proposal expansion on button click', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    // Proposal 1 starts expanded. Find the toggle buttons.
    const buttons = Array.from(container.querySelectorAll('button'));
    const hideBtn = buttons.find((b) => b.textContent.includes('Hide Details'));
    expect(hideBtn).toBeTruthy();

    await act(async () => {
      hideBtn.click();
    });

    // After collapse, "Reveal Details" should appear
    expect(container.textContent).toContain('Reveal Details');
  });

  it('displays approved clearance banner when titleStatus is approved', async () => {
    mockProjectData.titleStatus = 'approved';

    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    expect(container.textContent).toContain(
      'Congratulations! Title Proposal Officially Endorsed & Approved',
    );
    expect(container.textContent).toContain('Proceed to Capstone 2 Workspace');

    const proceedBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Proceed to Capstone 2 Workspace'),
    );
    expect(proceedBtn).toBeTruthy();

    await act(async () => {
      proceedBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project?tab=capstone_2');
  });
});
