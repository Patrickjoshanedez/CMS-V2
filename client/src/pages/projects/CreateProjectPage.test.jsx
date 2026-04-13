import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import CreateProjectPage from './CreateProjectPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseNavigate = vi.fn();
const mockUseCreateProject = vi.fn();
const mockUseMyTeam = vi.fn();
const mockUseAcademicYears = vi.fn();
const mockUseSections = vi.fn();
const mockSimilarityChecker = vi.fn();
const mockGetCreateProjectDraft = vi.fn();
const mockSaveCreateProjectDraft = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockUseNavigate,
  };
});

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: (...args) => mockUseCreateProject(...args),
}));

vi.mock('@/hooks/useTeams', () => ({
  useMyTeam: (...args) => mockUseMyTeam(...args),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicYears: (...args) => mockUseAcademicYears(...args),
  useSections: (...args) => mockUseSections(...args),
}));

vi.mock('@/components/projects/TitleSimilarityChecker', () => ({
  default: (props) => {
    mockSimilarityChecker(props);
    return <div data-testid="title-similarity-checker">{props.title}</div>;
  },
}));

vi.mock('@/services/authService', () => ({
  projectService: {
    getCreateProjectDraft: (...args) => mockGetCreateProjectDraft(...args),
    saveCreateProjectDraft: (...args) => mockSaveCreateProjectDraft(...args),
  },
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
  },
}));

const makeTeam = (overrides = {}) => ({
  _id: 'team-1',
  isLocked: true,
  academicYear: '2024-2025',
  sectionId: 'section-1',
  members: [
    {
      _id: 'student-1',
      firstName: 'Test',
      middleName: '',
      lastName: 'Student',
      email: 'student@example.com',
    },
  ],
  ...overrides,
});

const makeQueryState = (overrides = {}) => ({
  data: [],
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

const renderPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  act(() => {
    root.render(<CreateProjectPage />);
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

describe('CreateProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCreateProjectDraft.mockResolvedValue({ data: { data: { draft: null, updatedAt: null } } });
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUseCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseMyTeam.mockReturnValue({ data: makeTeam(), isLoading: false });
    mockUseAcademicYears.mockReturnValue(makeQueryState({ data: ['2024-2025', '2025-2026'] }));
    mockUseSections.mockReturnValue(
      makeQueryState({
        data: [
          {
            _id: 'section-1',
            name: 'A',
            academicYear: '2024-2025',
            courseId: { code: 'BSIT' },
          },
        ],
      }),
    );
  });

  it('restores a saved create-project draft when returning to the page', async () => {
    mockGetCreateProjectDraft.mockResolvedValue({
      data: {
        data: {
          draft: {
            form: {
              academicYear: '2024-2025',
              sectionId: 'section-1',
            },
            titleProposals: [
              {
                title: 'Draft Proposal One',
                pitchDeck: {
                  problemStatement: 'Problem one',
                  proposedSolution: 'Solution one',
                  uniqueContribution: 'Unique one',
                  targetUsers: 'Users one',
                  expectedImpact: 'Impact one',
                },
                capstoneType: ['AI'],
                sdgTags: ['SDG 4: Quality Education'],
              },
              {
                title: 'Draft Proposal Two',
                pitchDeck: {
                  problemStatement: 'Problem two',
                  proposedSolution: 'Solution two',
                  uniqueContribution: 'Unique two',
                  targetUsers: 'Users two',
                  expectedImpact: 'Impact two',
                },
                capstoneType: ['Web Application'],
                sdgTags: ['SDG 9: Industry, Innovation and Infrastructure'],
              },
              {
                title: 'Draft Proposal Three',
                pitchDeck: {
                  problemStatement: 'Problem three',
                  proposedSolution: 'Solution three',
                  uniqueContribution: 'Unique three',
                  targetUsers: 'Users three',
                  expectedImpact: 'Impact three',
                },
                capstoneType: ['IoT'],
                sdgTags: ['SDG 11: Sustainable Cities and Communities'],
              },
            ],
            expandedProposalIndex: 1,
          },
          updatedAt: '2026-04-13T00:00:00Z',
        },
      },
    });

    const view = renderPage();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const restoredTitleInput = view.container.querySelector('input[id="proposal-1-title"]');
    expect(restoredTitleInput).not.toBeNull();
    expect(restoredTitleInput.value).toBe('Draft Proposal Two');
    expect(mockGetCreateProjectDraft).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  it('saves the active proposal draft with the current form state', async () => {
    mockSaveCreateProjectDraft.mockResolvedValue({ data: { data: { updatedAt: '2026-04-13T00:00:00Z' } } });

    const view = renderPage();
    const titleInput = view.container.querySelector('input[id="proposal-0-title"]');

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      valueSetter.call(titleInput, 'Attendance Monitoring System');
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const saveButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Save Draft'),
    );

    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockSaveCreateProjectDraft).toHaveBeenCalledTimes(1);
    expect(mockSaveCreateProjectDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalIndex: 0,
        source: 'manual-proposal-save',
        titleProposals: expect.arrayContaining([
          expect.objectContaining({ title: 'Attendance Monitoring System' }),
        ]),
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith('Proposal 1 draft saved.');

    view.unmount();
  });

  it('uses team context for academic year and section without rendering inputs', async () => {
    const view = renderPage();

    expect(view.container.textContent).toContain('System Note: Automatically using academic year and section.');
    expect(view.container.querySelector('select[name="sectionId"]')).toBeNull();
    expect(view.container.querySelector('button[type="button"] span.flex-1.text-left.font-medium')).toBeNull();

    view.unmount();
  });

  it('renders the similarity checker for the selected proposal title', async () => {
    const view = renderPage();
    const proposalInput = view.container.querySelector('input[id="proposal-0-title"]');

    expect(view.container.querySelector('[data-testid="title-similarity-checker"]')).toBeNull();
    expect(proposalInput).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      valueSetter.call(proposalInput, 'Attendance Monitoring System');
      proposalInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(view.container.querySelector('[data-testid="title-similarity-checker"]')).not.toBeNull();
    expect(mockSimilarityChecker).toHaveBeenCalled();
    expect(mockSimilarityChecker.mock.calls.at(-1)?.[0]?.title).toBe(
      'Attendance Monitoring System',
    );

    view.unmount();
  });
});
