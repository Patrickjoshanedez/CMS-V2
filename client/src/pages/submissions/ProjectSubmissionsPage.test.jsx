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

let currentSubmissions = [
  { _id: 'sub-1', type: 'chapter', chapter: 1, status: 'approved', version: 1 },
  { _id: 'sub-2', type: 'chapter', chapter: 2, status: 'approved', version: 1 },
  { _id: 'sub-3', type: 'chapter', chapter: 3, status: 'approved', version: 1 },
];

vi.mock('@/components/submissions/ChapterCard', () => ({
  default: ({ chapterNumber, submission, canUpload }) => (
    <div
      data-testid={`chapter-card-${chapterNumber}`}
      data-submission-version={submission?.version}
      data-submission-status={submission?.status}
      data-can-upload={String(canUpload)}
    >
      Chapter {chapterNumber} Card
    </div>
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
      submissions: currentSubmissions,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUploadChapter: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useUploadFinalAcademic: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUploadFinalJournal: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('ProjectSubmissionsPage Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    currentSubmissions = [
      { _id: 'sub-1', type: 'chapter', chapter: 1, status: 'approved', version: 1 },
      { _id: 'sub-2', type: 'chapter', chapter: 2, status: 'approved', version: 1 },
      { _id: 'sub-3', type: 'chapter', chapter: 3, status: 'approved', version: 1 },
    ];
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

    // Phase 4 Capstone 4 assertions
    expect(container.textContent).toContain('Capstone 4: Final Defense & Manuscript Archival');
    expect(container.textContent).toContain('Phase 4');
    expect(container.textContent).toContain('Final Paper Submission');

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

  it('correctly resolves latest version when v2 is accepted with identical timestamp to v1, and unlocks chapter 2', async () => {
    const timestamp = '2026-09-10T07:17:21.514Z';
    // Submissions sorted version desc (v2 first, then v1) with identical updatedAt (simulating markSubmissionAccepted bulk update)
    currentSubmissions = [
      {
        _id: 'sub-ch1-v2',
        type: 'chapter',
        chapter: 1,
        version: 2,
        status: 'accepted',
        updatedAt: timestamp,
        createdAt: timestamp,
      },
      {
        _id: 'sub-ch1-v1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: 'revisions_required',
        updatedAt: timestamp,
        createdAt: '2026-09-09T01:00:00.000Z',
      },
    ];

    await act(async () => {
      root.render(<ProjectSubmissionsPage />);
    });

    const card1 = container.querySelector('[data-testid="chapter-card-1"]');
    expect(card1).toBeTruthy();
    expect(card1.getAttribute('data-submission-version')).toBe('2');
    expect(card1.getAttribute('data-submission-status')).toBe('accepted');

    const card2 = container.querySelector('[data-testid="chapter-card-2"]');
    expect(card2).toBeTruthy();
    expect(card2.getAttribute('data-can-upload')).toBe('true');
  });
});
