import React, { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import SubmissionDetailPage from './SubmissionDetailPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
let mockSubmissionId = 'sub-v1';
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ submissionId: mockSubmissionId }),
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: () => <div data-testid="sophisticated-viewer">Document Viewer Mock</div>,
}));

vi.mock('@/components/submissions/PlagiarismChecker', () => ({
  default: () => <div data-testid="plagiarism-checker">Plagiarism Checker Mock</div>,
}));

let mockCurrentUser = {
  _id: 'student-1',
  role: 'student',
  teamId: 'team-1',
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => {
    const state = { user: mockCurrentUser };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

let mockSubmissionData = null;
let mockChapterHistoryData = [];

vi.mock('@/hooks/useSubmissions', () => ({
  useSubmission: () => ({
    data: mockSubmissionData,
    isLoading: false,
    error: null,
  }),
  useViewUrl: () => ({
    data: { url: 'https://mock.example.com/file.pdf' },
    isLoading: false,
  }),
  useChapterHistory: () => ({
    data: mockChapterHistoryData,
    isLoading: false,
  }),
  useReviewSubmission: () => ({ mutate: vi.fn(), isPending: false }),
  useUnlockSubmission: () => ({ mutate: vi.fn(), isPending: false }),
  useAddAnnotation: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveAnnotation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateJustification: () => ({ mutate: vi.fn(), isPending: false }),
  useScanSubmissionArchive: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('SubmissionDetailPage Revision Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      _id: 'student-1',
      role: 'student',
      teamId: 'team-1',
    };
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

  it('renders without outdated alert when viewing the only or latest revision', async () => {
    mockSubmissionId = 'sub-v2';
    mockSubmissionData = {
      _id: 'sub-v2',
      chapter: 1,
      version: 2,
      status: 'accepted',
      projectId: 'proj-1',
      fileName: 'chapter1_v2.docx',
      fileSize: 50000,
      isLate: false,
    };
    mockChapterHistoryData = [
      { _id: 'sub-v2', version: 2, status: 'accepted' },
      { _id: 'sub-v1', version: 1, status: 'revisions_required' },
    ];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).toContain('Chapter 1 Manuscript');
    expect(container.textContent).toContain('v2');
    expect(container.textContent).not.toContain('Viewing Earlier Revision');
    expect(container.textContent).toContain('Revisions:');
    expect(container.textContent).toContain('On-Time');
    // Redundant standalone card should not be present
    expect(container.textContent).not.toContain('Locked (On-Time)');
  });

  it('renders prominent outdated alert and revision pills when viewing an earlier revision (v1)', async () => {
    mockSubmissionId = 'sub-v1';
    mockSubmissionData = {
      _id: 'sub-v1',
      chapter: 1,
      version: 1,
      status: 'revisions_required',
      projectId: 'proj-1',
      fileName: 'chapter1_v1.docx',
      fileSize: 45000,
      isLate: false,
    };
    mockChapterHistoryData = [
      { _id: 'sub-v2', version: 2, status: 'accepted' },
      { _id: 'sub-v1', version: 1, status: 'revisions_required' },
    ];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    // Outdated version banner should be visible
    expect(container.textContent).toContain('Viewing Earlier Revision (v1)');
    expect(container.textContent).toContain(
      'A newer revision (v2) is available with status: accepted.',
    );

    // Click button to navigate to latest revision
    const viewLatestBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('View Latest Revision (v2)'),
    );
    expect(viewLatestBtn).toBeTruthy();

    await act(async () => {
      viewLatestBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/submissions/sub-v2');
  });

  it('renders only Approve and Request Revisions for faculty reviews (no Reject or Unlock button)', async () => {
    mockCurrentUser = {
      _id: 'faculty-1',
      role: 'instructor',
    };
    mockSubmissionId = 'sub-review-1';
    mockSubmissionData = {
      _id: 'sub-review-1',
      chapter: 2,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      fileName: 'chapter2_v1.docx',
      fileSize: 62000,
      isLate: false,
    };
    mockChapterHistoryData = [{ _id: 'sub-review-1', version: 1, status: 'pending' }];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    const buttons = Array.from(container.querySelectorAll('button')).map((b) =>
      b.textContent.trim(),
    );
    expect(buttons.some((text) => text.includes('Approve'))).toBe(true);
    expect(buttons.some((text) => text.includes('Request Revisions'))).toBe(true);
    expect(buttons.some((text) => text.includes('Reject'))).toBe(false);
    expect(buttons.some((text) => text.includes('Unlock Submission'))).toBe(false);
  });

  it('displays locked submissions as Approved with no unlock panel', async () => {
    mockCurrentUser = {
      _id: 'faculty-1',
      role: 'adviser',
    };
    mockSubmissionId = 'sub-locked-1';
    mockSubmissionData = {
      _id: 'sub-locked-1',
      chapter: 3,
      version: 1,
      status: 'locked',
      projectId: 'proj-1',
      fileName: 'chapter3_v1.docx',
      fileSize: 80000,
      isLate: false,
    };
    mockChapterHistoryData = [{ _id: 'sub-locked-1', version: 1, status: 'locked' }];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    // Badge should say Approved
    expect(container.textContent).toContain('Approved');
    // Unlock card must NOT be present
    expect(container.textContent).not.toContain('Document Locked');
    expect(container.textContent).not.toContain('Unlock Submission');
  });
});
