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

vi.mock('@/components/projects/PrototypeShowcaseAndDemo', () => ({
  default: ({ project }) => (
    <div data-testid="prototype-showcase-and-demo">
      <span>Prototype Showcase and Demo Component: {project?.title}</span>
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

vi.mock('@/components/projects/ActionDoneMatrixTab', () => ({
  default: ({ project, initialMilestone }) => (
    <div data-testid="action-done-matrix-tab" data-milestone={initialMilestone}>
      <span>Action Done Matrix Tab Component: {project?.title}</span>
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

let mockProjectData = {
  _id: 'proj-123',
  title: 'Project Workspace: Capstone Management System with Plagiarism Checker',
  titleStatus: 'approved',
  capstonePhase: 2,
  admStatus: 'not_started',
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
    mockProjectData = {
      _id: 'proj-123',
      title: 'Project Workspace: Capstone Management System with Plagiarism Checker',
      titleStatus: 'approved',
      capstonePhase: 2,
      admStatus: 'not_started',
      deadlines: {},
    };
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
    expect(
      container.querySelector('[data-testid="prototype-showcase-and-demo"]') ||
        container.querySelector('[data-testid="development-assets-form"]'),
    ).toBeTruthy();
    expect(container.querySelector('[data-testid="chapter-card-4"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="chapter-card-5"]')).toBeTruthy();

    // Phase 4 Final Capstone assertions
    expect(container.textContent).toContain('Final Capstone: Oral Defense & Manuscript Archival');
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

    // Modal dialog is open in document.body (portaled)
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="interactive-gantt-chart"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Capstone 3: Interactive Academic Gantt Chart');

    // Click close button
    const closeBtn = document.body.querySelector('button[aria-label="Close Gantt Dialog"]');
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    // Modal is closed
    expect(document.body.querySelector('[data-testid="interactive-gantt-chart"]')).toBeNull();
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

  it('renders ADM section in Capstone 2 card and opens ADM modal viewer', async () => {
    await act(async () => {
      root.render(<ProjectSubmissionsPage />);
    });

    // Verify ADM section card in Capstone 2 card
    const admCard = container.querySelector('[data-testid="adm-section-card"]');
    expect(admCard).toBeTruthy();
    expect(admCard.textContent).toContain('Action Done Matrix (ADM)');
    expect(admCard.textContent).toContain('v1 Midterm');

    // Verify header button in Capstone 2 card
    const phase2HeaderBtn = container.querySelector('[data-testid="capstone2-open-adm-btn"]');
    expect(phase2HeaderBtn).toBeTruthy();
    expect(phase2HeaderBtn.textContent).toContain('Open Action Done Matrix');

    // Modal is initially not open
    expect(document.body.querySelector('[aria-labelledby="adm-viewer-dialog-title"]')).toBeNull();

    // Click "View ADM" button in section card
    const viewAdmBtn = container.querySelector('[data-testid="view-adm-btn"]');
    expect(viewAdmBtn).toBeTruthy();

    await act(async () => {
      viewAdmBtn.click();
    });

    // Modal is now open and renders ActionDoneMatrixTab with initialMilestone="CAPSTONE_2" in document.body
    const admModal = document.body.querySelector('[aria-labelledby="adm-viewer-dialog-title"]');
    expect(admModal).toBeTruthy();
    expect(admModal.textContent).toContain('Capstone 2: Action Done Matrix (ADM)');
    const admTab = admModal.querySelector('[data-testid="action-done-matrix-tab"]');
    expect(admTab).toBeTruthy();
    expect(admTab.getAttribute('data-milestone')).toBe('CAPSTONE_2');

    // Close modal
    const closeBtn = document.body.querySelector('button[aria-label="Close ADM Dialog"]');
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    expect(document.body.querySelector('[aria-labelledby="adm-viewer-dialog-title"]')).toBeNull();
  });

  it('toggles ADM inline expansion inside the Capstone 2 card', async () => {
    await act(async () => {
      root.render(<ProjectSubmissionsPage />);
    });

    // Initially inline container is not rendered
    expect(container.querySelector('[data-testid="adm-inline-container"]')).toBeNull();

    // Click "Expand Inline" button
    const toggleBtn = container.querySelector('[data-testid="toggle-adm-inline-btn"]');
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.textContent).toContain('Expand Inline');

    await act(async () => {
      toggleBtn.click();
    });

    // Inline container is now visible
    const inlineContainer = container.querySelector('[data-testid="adm-inline-container"]');
    expect(inlineContainer).toBeTruthy();
    expect(inlineContainer.querySelector('[data-testid="action-done-matrix-tab"]')).toBeTruthy();
    expect(toggleBtn.textContent).toContain('Collapse');

    // Click collapse
    await act(async () => {
      toggleBtn.click();
    });

    expect(container.querySelector('[data-testid="adm-inline-container"]')).toBeNull();
  });

  it('strictly gates Chapter 4 upload and final paper when Capstone 2 ADM is pending', async () => {
    // mockProjectData defaults to admStatus: 'not_started' and capstonePhase: 2
    await act(async () => {
      root.render(<ProjectSubmissionsPage />);
    });

    // Capstone 3 alert banner explaining Capstone 2 ADM prerequisite is displayed
    const cap3Alert = container.querySelector('[data-testid="capstone3-prerequisite-alert"]');
    expect(cap3Alert).toBeTruthy();
    expect(cap3Alert.textContent).toContain(
      'Capstone 3 chapter uploads (Chapters 4 & 5) unlock after your Capstone 2 Action Done Matrix (ADM v1) is approved and signed by the defense committee.',
    );

    // Chapter 4 upload is blocked
    const card4 = container.querySelector('[data-testid="chapter-card-4"]');
    expect(card4).toBeTruthy();
    expect(card4.getAttribute('data-can-upload')).toBe('false');

    // Final paper alert banner is displayed
    const cap4Alert = container.querySelector('[data-testid="capstone4-prerequisite-alert"]');
    expect(cap4Alert).toBeTruthy();
    expect(cap4Alert.textContent).toContain(
      'Final Paper Submission is locked. Please complete Capstone 2 Action Done Matrix (ADM v1) first.',
    );
    expect(container.textContent).toContain('Submission Locked');
  });

  it('unlocks Chapter 4 upload when Capstone 2 ADM is approved, while keeping final paper locked until Chapters 4-5 are completed', async () => {
    mockProjectData = {
      ...mockProjectData,
      capstonePhase: 3,
      admStatus: 'approved',
    };

    await act(async () => {
      root.render(<ProjectSubmissionsPage />);
    });

    // Capstone 3 alert is NOT shown because Capstone 2 ADM is approved
    expect(container.querySelector('[data-testid="capstone3-prerequisite-alert"]')).toBeNull();

    // Chapter 4 card is now unlocked for upload
    const card4 = container.querySelector('[data-testid="chapter-card-4"]');
    expect(card4).toBeTruthy();
    expect(card4.getAttribute('data-can-upload')).toBe('true');

    // Final paper is still locked because chapters 4 and 5 are not completed
    const cap4Alert = container.querySelector('[data-testid="capstone4-prerequisite-alert"]');
    expect(cap4Alert).toBeTruthy();
    expect(cap4Alert.textContent).toContain(
      'Final Paper Submission unlocks after all 5 manuscript chapters (Chapters 1–5) and Capstone 3 progress defense requirements are approved by your committee.',
    );
  });
});
