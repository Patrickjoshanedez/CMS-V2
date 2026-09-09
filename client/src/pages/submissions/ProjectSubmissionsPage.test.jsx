import React, { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import ProjectSubmissionsPage from './ProjectSubmissionsPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/submissions/ChapterCard', () => ({
  default: ({ chapterNumber }) => (
    <div data-testid={`chapter-card-${chapterNumber}`}>Chapter {chapterNumber} Card</div>
  ),
}));

vi.mock('@/components/projects/DevelopmentAssetsForm', () => ({
  default: ({ onViewAcademicGantt }) => (
    <div data-testid="development-assets-form">
      <span>Development Assets Form</span>
      <button type="button" onClick={onViewAcademicGantt}>
        Open From Form
      </button>
    </div>
  ),
}));

vi.mock('@/components/projects/InteractiveGanttChart', () => ({
  default: ({ project }) => (
    <div data-testid="interactive-gantt-chart">
      <span>Interactive Gantt Chart Component: {project?.title}</span>
    </div>
  ),
}));

vi.mock('@/components/projects/DeadlineWarning', () => ({
  default: () => <div data-testid="deadline-warning">Deadline Warning</div>,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) =>
    selector({
      user: {
        _id: 'user-std-1',
        role: 'student',
        teamId: 'team-123',
      },
    }),
}));

const mockProjectData = {
  _id: 'proj-123',
  title: 'Project Workspace: Capstone Management System with Plagiarism Checker',
  titleStatus: 'approved',
  deadlines: {},
};

vi.mock('@/hooks/useProjects', () => ({
  useMyProject: () => ({
    data: mockProjectData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useProject: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSubmissions', () => ({
  useProjectSubmissions: () => ({
    data: {
      submissions: [
        { _id: 'sub-1', type: 'chapter', chapter: 1, status: 'approved', version: 1 },
        { _id: 'sub-2', type: 'chapter', chapter: 2, status: 'approved', version: 1 },
        { _id: 'sub-3', type: 'chapter', chapter: 3, status: 'approved', version: 1 },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('ProjectSubmissionsPage Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it('renders phased architecture with Phase 2 and Phase 3 separated correctly', async () => {
    await act(async () => {
      root.render(<ProjectSubmissionsPage />);
    });

    // Phase 2 Capstone 2 assertions
    expect(container.textContent).toContain(
      'Capstone 2: Chapters 1–3 Manuscript & Midterm Defense',
    );
    expect(container.textContent).toContain('Phase 2');
    expect(container.querySelector('[data-testid="chapter-card-1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="chapter-card-2"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="chapter-card-3"]')).toBeTruthy();

    // Phase 3 Capstone 3 assertions (realigned from mislabeled Capstone 2)
    expect(container.textContent).toContain('Capstone 3: System Development & Progress Defense');
    expect(container.textContent).toContain('Phase 3');
    expect(container.querySelector('[data-testid="development-assets-form"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="chapter-card-4"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="chapter-card-5"]')).toBeTruthy();

    // Verify mislabeling is eliminated
    expect(container.textContent).not.toContain('Capstone 2\nSystem Development Phase');
  });

  it('opens and closes Interactive Academic Gantt Chart modal', async () => {
    await act(async () => {
      root.render(<ProjectSubmissionsPage />);
    });

    // Modal is initially not open
    expect(container.querySelector('[data-testid="interactive-gantt-chart"]')).toBeNull();

    // Click "Academic Gantt" button in header
    const ganttHeaderBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Academic Gantt'),
    );
    expect(ganttHeaderBtn).toBeTruthy();

    await act(async () => {
      ganttHeaderBtn.click();
    });

    // Modal dialog is open
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="interactive-gantt-chart"]')).toBeTruthy();
    expect(container.textContent).toContain('Capstone 3: Interactive Academic Gantt Chart');

    // Click close button
    const closeBtn = container.querySelector('button[aria-label="Close Gantt Dialog"]');
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    // Modal is closed
    expect(container.querySelector('[data-testid="interactive-gantt-chart"]')).toBeNull();
  });
});
