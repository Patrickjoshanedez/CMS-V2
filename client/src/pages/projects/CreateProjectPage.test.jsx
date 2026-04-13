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

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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

  it('uses team context for academic year and section without rendering inputs', async () => {
    const view = renderPage();

    expect(view.container.textContent).toContain('Using your team\'s academic year and section automatically.');
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
